'use client';

import { PaperClipIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { DocumentMagnifyingGlassIcon, ExclamationCircleIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import { type Customer, LoadStopType, Prisma } from '@prisma/client';
import PDFViewer from 'components/PDFViewer';
import startOfDay from 'date-fns/startOfDay';
import { addColonToTimeString, convertRateToNumber } from 'lib/helpers/ratecon-vertex-helpers';
import { convertAITimeToTimeRange } from 'lib/helpers/ai-time-helpers';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect, useState, useRef } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import LoadForm from '../../components/forms/load/LoadForm';
import BreadCrumb from '../../components/layout/BreadCrumb';
import Layout from '../../components/layout/Layout';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { notify } from '../../components/Notification';
import type { AILoad, AICustomerDetails } from '../../interfaces/ai';
import type { PageWithAuth } from '../../interfaces/auth';
import type { ExpandedLoad } from '../../interfaces/models';
import { apiUrl } from '../../lib/constants';
import { parseDate } from '../../lib/helpers/date';
import { fuzzySearch } from '../../lib/helpers/levenshtein';
import { calcPdfPageCount } from '../../lib/helpers/pdf';
import { getGeocoding, getRouteForCoords } from '../../lib/mapbox/searchGeo';
import { getAllCustomers } from '../../lib/rest/customer';
import { createLoad, getLoadById, updateLoad } from '../../lib/rest/load';
import { useUserContext } from 'components/context/UserContext';
import Link from 'next/link';
import { PDFDocument } from 'pdf-lib';

import { useSearchParams } from 'next/navigation';

interface Line {
    text: string;
    pageNumber: number;
    boundingPoly: {
        vertices: { x: number; y: number }[];
        normalizedVertices: { x: number; y: number }[];
    };
}

interface pageDimensions {
    width: number;
    height: number;
    unit: string;
}

interface OCRLines {
    pageProps: pageDimensions;
    lines: Line[];
    blocks: Line[];
}

const expectedProperties = new Set([
    'logistics_company',
    'load_number',
    'stops',
    'name',
    'street',
    'city',
    'state',
    'zip',
    'date',
    'time',
    'po_numbers',
    'pickup_numbers',
    'reference_numbers',
    'rate',
    'invoice_emails',
]);

// Optimized OCR matching utilities for better performance and accuracy
class OCRMatcher {
    // Caching for performance optimization
    private static textCache = new Map<string, string>();
    private static tokenCache = new Map<string, string[]>();
    private static readonly CACHE_LIMIT = 1000;

    private static normalizeText(text: string): string {
        if (this.textCache.has(text)) {
            return this.textCache.get(text) as string;
        }

        const normalized = text
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');

        // Prevent memory leaks by limiting cache size
        if (this.textCache.size >= this.CACHE_LIMIT) {
            this.textCache.clear();
        }
        this.textCache.set(text, normalized);
        return normalized;
    }

    private static tokenize(text: string): string[] {
        if (this.tokenCache.has(text)) {
            return this.tokenCache.get(text) as string[];
        }

        const tokens = this.normalizeText(text).split(/\s+/).filter(Boolean);

        // Prevent memory leaks by limiting cache size
        if (this.tokenCache.size >= this.CACHE_LIMIT) {
            this.tokenCache.clear();
        }
        this.tokenCache.set(text, tokens);
        return tokens;
    }

    static clearCaches(): void {
        this.textCache.clear();
        this.tokenCache.clear();
    }

    private static calculateJaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
        const intersection = new Set(Array.from(set1).filter((x) => set2.has(x)));
        const union = new Set([...Array.from(set1), ...Array.from(set2)]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }

    private static calculateLevenshteinDistance(str1: string, str2: string): number {
        // Early termination for very different lengths
        const maxLength = Math.max(str1.length, str2.length);
        if (Math.abs(str1.length - str2.length) > maxLength * 0.7) {
            return maxLength;
        }

        const matrix = Array(str2.length + 1)
            .fill(null)
            .map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + substitutionCost,
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    private static calculateEditSimilarity(str1: string, str2: string): number {
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1;
        const distance = this.calculateLevenshteinDistance(str1, str2);
        return 1 - distance / maxLength;
    }

    private static isSubsequence(shorter: string, longer: string): boolean {
        let i = 0;
        for (let j = 0; j < longer.length && i < shorter.length; j++) {
            if (shorter[i] === longer[j]) i++;
        }
        return i === shorter.length;
    }

    // Pre-filtering to improve performance
    private static preFilterLines(ocrLines: Line[], fieldType: string, searchValue: string): Line[] {
        if (fieldType.includes('time')) {
            return ocrLines.filter((line) => !this.isMonetaryPattern(line.text));
        }

        if (fieldType.includes('date')) {
            return ocrLines.filter((line) => this.hasDatePattern(line.text));
        }

        if (fieldType.includes('name') || fieldType.includes('location')) {
            return ocrLines.filter((line) => this.isRelevantForLocation(line.text, searchValue));
        }

        return ocrLines;
    }

    private static isMonetaryPattern(text: string): boolean {
        return /\$[\d,]+\.?\d*|\b\d+\.\d{2}\b|\b\d{4}\.\d{2}\b|\b\d{3,4}\.\d{2}\b|invoice|total|amount|rate|cost|price|pay|bill|charge|fee/i.test(
            text,
        );
    }

    private static hasDatePattern(text: string): boolean {
        return /\b\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{2,4}\b|\b\d{4}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{1,2}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(
            text,
        );
    }

    public static hasDatePatternPublic(text: string): boolean {
        return this.hasDatePattern(text);
    }

    private static isRelevantForLocation(text: string, searchValue: string): boolean {
        // Basic relevance check for location fields
        const hasAddressInfo =
            /\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|way|blvd|boulevard)\b/i.test(text) ||
            /\b\d{5}(-\d{4})?\b/.test(text) ||
            /\b[A-Z]{2}\b/.test(text) ||
            /\b(company|corp|corporation|inc|llc|ltd|warehouse|facility)\b/i.test(text);

        const containsSearchTerm = this.normalizeText(text).includes(this.normalizeText(searchValue));

        return hasAddressInfo || containsSearchTerm || text.length > searchValue.length * 1.5;
    }

    static findBestMatches(
        searchValue: string,
        ocrLines: Line[],
        fieldType: string,
        maxResults = 5,
    ): Array<{ line: Line; confidence: number; matchType: string }> {
        if (!searchValue?.trim() || !ocrLines?.length) return [];

        const normalizedSearch = this.normalizeText(searchValue);
        const searchTokens = new Set(this.tokenize(searchValue));

        // Pre-filter lines for better performance
        const relevantLines = this.preFilterLines(ocrLines, fieldType, searchValue);
        const results: Array<{ line: Line; confidence: number; matchType: string }> = [];

        for (const line of relevantLines) {
            const confidence = this.calculateLineConfidence(
                searchValue,
                normalizedSearch,
                searchTokens,
                line,
                fieldType,
            );

            if (confidence > 0.1) {
                results.push({
                    line,
                    confidence,
                    matchType: this.getMatchType(confidence),
                });
            }

            // Early termination for performance
            if (results.length >= maxResults * 3 && results.some((r) => r.confidence > 0.9)) {
                break;
            }
        }

        return results.sort((a, b) => b.confidence - a.confidence).slice(0, maxResults);
    }

    private static calculateLineConfidence(
        searchValue: string,
        normalizedSearch: string,
        searchTokens: Set<string>,
        line: Line,
        fieldType: string,
    ): number {
        const normalizedLineText = this.normalizeText(line.text);
        const lineTokens = new Set(this.tokenize(line.text));
        let confidence = 0;

        // 1. Exact match (highest priority)
        if (normalizedSearch === normalizedLineText) {
            confidence = 1.0;
        }
        // 2. Exact substring match
        else if (normalizedLineText.includes(normalizedSearch) || normalizedSearch.includes(normalizedLineText)) {
            const longer = normalizedLineText.length > normalizedSearch.length ? normalizedLineText : normalizedSearch;
            const shorter =
                normalizedLineText.length <= normalizedSearch.length ? normalizedLineText : normalizedSearch;
            confidence = 0.95 * (shorter.length / longer.length);
        }
        // 3. All tokens present
        else if (searchTokens.size > 0 && Array.from(searchTokens).every((token) => lineTokens.has(token))) {
            confidence = 0.9 * this.calculateJaccardSimilarity(searchTokens, lineTokens);
        }
        // 4. Subsequence match
        else if (
            this.isSubsequence(normalizedSearch, normalizedLineText) ||
            this.isSubsequence(normalizedLineText, normalizedSearch)
        ) {
            confidence = 0.8 * this.calculateEditSimilarity(normalizedSearch, normalizedLineText);
        }
        // 5. Jaccard similarity for token overlap
        else if (searchTokens.size > 0) {
            const jaccard = this.calculateJaccardSimilarity(searchTokens, lineTokens);
            if (jaccard > 0.3) {
                confidence = 0.7 * jaccard;
            }
        }
        // 6. Edit distance similarity
        else {
            const editSim = this.calculateEditSimilarity(normalizedSearch, normalizedLineText);
            if (editSim > 0.6) {
                confidence = 0.6 * editSim;
            }
        }

        // Apply field-specific boosts
        if (confidence > 0) {
            confidence = this.applyFieldSpecificBoosts(confidence, searchValue, line.text, fieldType);
        }

        return Math.min(confidence, 1.0);
    }

    private static getMatchType(confidence: number): string {
        if (confidence >= 0.95) return 'exact';
        if (confidence >= 0.85) return 'high';
        if (confidence >= 0.7) return 'good';
        if (confidence >= 0.5) return 'partial';
        return 'weak';
    }

    private static applyFieldSpecificBoosts(
        baseConfidence: number,
        searchValue: string,
        lineText: string,
        fieldType: string,
    ): number {
        let confidence = baseConfidence;

        // Optimized field-specific boost patterns with early returns
        const lowerLineText = lineText.toLowerCase();

        // Date field optimizations
        if (fieldType.includes('date')) {
            // Penalize obvious non-dates first
            if (
                /^\d{1,2}$/.test(lineText.trim()) ||
                /^\d+\.\d+$/.test(lineText.trim()) ||
                /^[#\$%@]+$/.test(lineText.trim())
            ) {
                return confidence * 0.1;
            }

            // Boost for valid date patterns
            const datePatterns = [
                { pattern: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}\b/, boost: 1.4 },
                { pattern: /\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/, boost: 1.3 },
                {
                    pattern: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+\d{1,2}[\s,]+\d{4}\b/i,
                    boost: 1.35,
                },
            ];

            for (const { pattern, boost } of datePatterns) {
                if (pattern.test(lineText)) {
                    confidence *= boost;
                    break;
                }
            }
        }

        // Time field optimizations
        else if (fieldType.includes('time')) {
            // Heavy penalty for monetary patterns
            if (this.isMonetaryPattern(lineText)) {
                return confidence * 0.3;
            }

            // Boost for valid time patterns
            const timeMatch = lineText.match(/\b(\d{1,2}):(\d{2})(\s*(am|pm|AM|PM))?\b/);
            if (timeMatch) {
                const hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const hasAmPm = !!timeMatch[3];

                if (
                    (hasAmPm && hours >= 1 && hours <= 12 && minutes <= 59) ||
                    (!hasAmPm && hours <= 23 && minutes <= 59)
                ) {
                    confidence *= hasAmPm ? 1.4 : 1.3;
                }
            } else if (/\b\d{4}\s*(hours?|hrs?)\b/i.test(lineText)) {
                confidence *= 1.2;
            }
        }

        // Location name optimizations
        else if (fieldType.includes('location_name')) {
            const boosts = [];

            // Company keywords
            if (
                /\b(company|corp|corporation|inc|llc|ltd|warehouse|facility|plant|terminal|yard|dock)\b/i.test(lineText)
            ) {
                boosts.push(1.2);
            }

            // Address components scoring
            let addressScore = 0;
            if (/\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|way|blvd|boulevard)\b/i.test(lineText))
                addressScore += 3;
            if (/\b\d{5}(-\d{4})?\b/.test(lineText)) addressScore += 2;
            if (/\b[A-Z]{2}\b/.test(lineText)) addressScore += 1;
            if (/\b(company|corp|corporation|inc|llc|ltd|warehouse|facility)\b/i.test(lineText)) addressScore += 2;

            if (addressScore >= 3) boosts.push(1.3);
            else if (addressScore >= 2) boosts.push(1.25);
            else if (addressScore >= 1) boosts.push(1.15);

            // Apply highest boost
            if (boosts.length > 0) {
                confidence *= Math.max(...boosts);
            }
        }

        // Reference number optimizations
        else if (fieldType.includes('_reference') || fieldType.includes('Numbers')) {
            if (/\b(po|purchase\s+order|ref|reference|pickup|pick\s*up|delivery|del)\b/i.test(lineText)) {
                confidence *= 1.3;
            }
            if (/\b[A-Z0-9]{3,}\b/.test(lineText) && /\d/.test(lineText) && /[A-Za-z]/.test(lineText)) {
                confidence *= 1.2;
            }
        }

        // Address component optimizations
        else if (fieldType.includes('zip')) {
            if (/\b\d{5}(-\d{4})?\b/.test(lineText)) confidence *= 1.4;
        } else if (fieldType.includes('state')) {
            if (/\b[A-Z]{2}\b/.test(lineText)) confidence *= 1.3;
        }

        // Stop type context boosts
        if (fieldType.includes('pickup') || fieldType.includes('shipper')) {
            if (/\b(pickup|pick\s*up|shipper|origin|pu)\b/.test(lowerLineText)) {
                confidence *= 1.2;
            }
        } else if (fieldType.includes('dropoff') || fieldType.includes('receiver') || fieldType.includes('delivery')) {
            if (/\b(delivery|drop\s*off|receiver|destination|consignee|so)\b/.test(lowerLineText)) {
                confidence *= 1.2;
            }
        }

        // Length similarity bonus
        const lengthRatio =
            Math.min(searchValue.length, lineText.length) / Math.max(searchValue.length, lineText.length);
        if (lengthRatio > 0.7) {
            confidence *= 1.1;
        }

        return Math.min(confidence, 1.0);
    }

    // Helper method for calculating location relevance score
    private static getLocationScore(text: string): number {
        let score = 0;
        if (/\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|way|blvd|boulevard)\b/i.test(text))
            score += 3;
        if (/\b\d{5}(-\d{4})?\b/.test(text)) score += 2;
        if (/\b[A-Z]{2}\b/.test(text)) score += 1;
        if (/\b(company|corp|corporation|inc|llc|ltd|warehouse|facility)\b/i.test(text)) score += 2;
        return score;
    }

    static findContextualMatch(
        searchValue: string,
        ocrLines: Line[],
        contextValue: string,
        fieldType: string,
    ): { line: Line; confidence: number; matchType: string } | null {
        if (!contextValue?.trim()) {
            const matches = this.findBestMatches(searchValue, ocrLines, fieldType, 3);
            return matches.length > 0 ? matches[0] : null;
        }

        // Enhanced address-anchored search for better proximity matching
        const addressAnchors = this.findAddressAnchors(contextValue, ocrLines);

        // Optimized handling for location_name field type
        if (fieldType === 'location_name') {
            const combinedMatches = this.findBestMatches(contextValue, ocrLines, fieldType, 5);

            // Find matches that contain the search value (company name)
            const relevantMatches = combinedMatches.filter((match) => {
                const normalizedLine = this.normalizeText(match.line.text);
                const normalizedSearch = this.normalizeText(searchValue);
                return normalizedLine.includes(normalizedSearch);
            });

            if (relevantMatches.length > 0) {
                return relevantMatches[0];
            }
        }

        // Enhanced city/state/zip combined matching to prevent false matches
        if (fieldType.includes('city') || fieldType.includes('state') || fieldType.includes('zip')) {
            const combinedMatch = this.findCombinedAddressMatch(searchValue, ocrLines, fieldType, addressAnchors);
            if (combinedMatch) {
                return combinedMatch;
            }
        }

        // Enhanced reference number matching using address anchors
        if (fieldType.includes('Numbers') || fieldType.includes('_reference')) {
            const referenceMatch = this.findReferenceNearAddress(searchValue, ocrLines, fieldType, addressAnchors);
            if (referenceMatch) {
                return referenceMatch;
            }
        }

        // Find context matches with limited results for performance
        const contextMatches = this.findBestMatches(contextValue, ocrLines, 'context', 3);

        // Enhanced stop-type filtering based on field type
        const stopTypeFromField = this.determineStopTypeFromField(fieldType);
        const filteredContextMatches = stopTypeFromField
            ? this.filterMatchesByStopType(contextMatches, stopTypeFromField)
            : contextMatches;

        if (filteredContextMatches.length === 0) {
            const matches = this.findBestMatches(searchValue, ocrLines, fieldType, 3);
            return matches.length > 0 ? matches[0] : null;
        }

        // Enhanced proximity matching with address-aware boosting
        let bestMatch: { line: Line; confidence: number; matchType: string } | null = null;
        let bestScore = 0;

        // Adjusted proximity thresholds based on field type
        const proximityThreshold = this.getProximityThreshold(fieldType);

        for (const contextMatch of filteredContextMatches) {
            const contextLine = contextMatch.line;

            // Get potential matches near this context
            const nearbyMatches = this.findBestMatches(searchValue, ocrLines, fieldType, 3).filter((match) => {
                const pageDistance = Math.abs(match.line.pageNumber - contextLine.pageNumber);
                if (pageDistance > 1) return false; // Only same or adjacent pages

                const spatialDistance = this.calculateSpatialDistance(match.line, contextLine);
                return spatialDistance < proximityThreshold;
            });

            for (const match of nearbyMatches) {
                const distance = this.calculateSpatialDistance(match.line, contextLine);
                let score = match.confidence * (1 - distance * 0.05); // Reduced penalty for better matches

                // Enhanced address-based boosting
                const addressBoost = this.calculateAddressProximityBoost(match.line, addressAnchors);
                score *= 1 + addressBoost;

                // Boost for reference numbers very close to location
                if ((fieldType.includes('_reference') || fieldType.includes('Numbers')) && distance < 1.0) {
                    score *= 1.3;
                }

                if (score > bestScore) {
                    bestMatch = { ...match, confidence: score };
                    bestScore = score;
                }
            }
        }

        return bestMatch || this.findBestMatches(searchValue, ocrLines, fieldType)[0] || null;
    }

    // Find street address locations to use as anchor points
    private static findAddressAnchors(contextValue: string, ocrLines: Line[]): Line[] {
        const streetAddressPatterns = [
            /\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|way|blvd|boulevard|circle|ct|court|place|pl)\b/i,
            /\b\d+\s+[A-Za-z\s]+\s+(st|ave|rd|ln|dr|way|blvd|ct|pl)\b/i,
        ];

        const addressLines = ocrLines.filter((line) => {
            return streetAddressPatterns.some((pattern) => pattern.test(line.text));
        });

        // Also find lines that match parts of the context value that look like addresses
        const contextWords = contextValue.toLowerCase().split(/\s+/);
        const potentialStreetWords = contextWords.filter(
            (word) =>
                /^(street|st|avenue|ave|road|rd|lane|ln|drive|dr|way|blvd|boulevard)$/i.test(word) ||
                /^\d+$/.test(word),
        );

        if (potentialStreetWords.length > 0) {
            const contextAddressLines = ocrLines.filter((line) => {
                const lineWords = line.text.toLowerCase().split(/\s+/);
                return potentialStreetWords.some((word) => lineWords.includes(word));
            });
            addressLines.push(...contextAddressLines);
        }

        // Remove duplicates and return
        const uniqueAddresses = addressLines.filter(
            (line, index, self) =>
                self.findIndex((l) => l.text === line.text && l.pageNumber === line.pageNumber) === index,
        );

        return uniqueAddresses;
    }

    // Enhanced city/state/zip matching to prevent false positives
    private static findCombinedAddressMatch(
        searchValue: string,
        ocrLines: Line[],
        fieldType: string,
        addressAnchors: Line[],
    ): { line: Line; confidence: number; matchType: string } | null {
        // For state fields, avoid matching random "CA" by looking for city, state, zip patterns
        if (fieldType.includes('state') && searchValue.length === 2) {
            // Look for complete address patterns: City, ST ZIP or City ST ZIP
            const statePattern = new RegExp(`\\b\\w+[,\\s]+${searchValue}\\s+\\d{5}`, 'i');
            const cityStatePattern = new RegExp(`\\b\\w+[,\\s]+${searchValue}\\b`, 'i');

            // First priority: Complete city, state, zip pattern
            let contextualMatches = ocrLines.filter((line) => statePattern.test(line.text));

            // Second priority: City, state pattern (without zip)
            if (contextualMatches.length === 0) {
                contextualMatches = ocrLines.filter((line) => cityStatePattern.test(line.text));
            }

            // Third priority: Lines that contain the state code but have address-like context
            if (contextualMatches.length === 0) {
                const stateRegex = new RegExp(`\\b${searchValue}\\b`, 'i');
                contextualMatches = ocrLines.filter((line) => {
                    if (!stateRegex.test(line.text)) return false;

                    // Check if line has address-like characteristics
                    const hasZip = /\b\d{5}(-\d{4})?\b/.test(line.text);
                    const hasStreetIndicators =
                        /\b(street|st|avenue|ave|road|rd|lane|ln|drive|dr|way|blvd|boulevard)\b/i.test(line.text);
                    const hasCommaOrMultipleWords = /,/.test(line.text) || line.text.split(/\s+/).length >= 3;

                    return hasZip || hasStreetIndicators || hasCommaOrMultipleWords;
                });
            }

            if (contextualMatches.length > 0) {
                // Find the match closest to an address anchor
                let bestMatch = contextualMatches[0];
                let minDistance = Infinity;
                let bestScore = 0.85;

                if (addressAnchors.length > 0) {
                    for (const match of contextualMatches) {
                        for (const anchor of addressAnchors) {
                            const distance = this.calculateSpatialDistance(match, anchor);
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestMatch = match;
                                // Boost confidence for matches near address anchors
                                bestScore = distance < 2 ? 0.95 : distance < 4 ? 0.9 : 0.85;
                            }
                        }
                    }
                }

                return {
                    line: bestMatch,
                    confidence: bestScore,
                    matchType: 'combined_address',
                };
            }
        }

        // For city fields, look for city, state patterns
        if (fieldType.includes('city')) {
            const cityStatePattern = new RegExp(`\\b${searchValue}[,\\s]+[A-Z]{2}\\b`, 'i');
            const cityStateZipPattern = new RegExp(`\\b${searchValue}[,\\s]+[A-Z]{2}\\s+\\d{5}`, 'i');

            // First try with zip code
            let matches = ocrLines.filter((line) => cityStateZipPattern.test(line.text));

            // Fallback to city, state without zip
            if (matches.length === 0) {
                matches = ocrLines.filter((line) => cityStatePattern.test(line.text));
            }

            if (matches.length > 0) {
                return {
                    line: matches[0],
                    confidence: 0.9,
                    matchType: 'city_state_pattern',
                };
            }
        }

        // For zip codes, ensure they're in proper context
        if (fieldType.includes('zip') && /^\d{5}(-\d{4})?$/.test(searchValue)) {
            const zipPattern = new RegExp(`\\b[A-Z]{2}\\s+${searchValue}\\b`, 'i');
            const cityStateZipPattern = new RegExp(`\\b\\w+[,\\s]+[A-Z]{2}\\s+${searchValue}\\b`, 'i');

            // First try complete city, state, zip pattern
            let matches = ocrLines.filter((line) => cityStateZipPattern.test(line.text));

            // Fallback to state, zip pattern
            if (matches.length === 0) {
                matches = ocrLines.filter((line) => zipPattern.test(line.text));
            }

            if (matches.length > 0) {
                return {
                    line: matches[0],
                    confidence: 0.9,
                    matchType: 'state_zip_pattern',
                };
            }
        }

        return null;
    }

    // Find reference numbers near address locations
    private static findReferenceNearAddress(
        searchValue: string,
        ocrLines: Line[],
        fieldType: string,
        addressAnchors: Line[],
    ): { line: Line; confidence: number; matchType: string } | null {
        if (addressAnchors.length === 0) {
            return null;
        }

        const referenceMatches = this.findBestMatches(searchValue, ocrLines, fieldType, 10);

        if (referenceMatches.length === 0) {
            return null;
        }

        // Find the reference match closest to any address anchor
        let bestMatch = null;
        let minDistance = Infinity;
        let bestScore = 0;

        for (const refMatch of referenceMatches) {
            for (const anchor of addressAnchors) {
                const distance = this.calculateSpatialDistance(refMatch.line, anchor);
                // Boost score based on proximity to address
                const proximityBoost = distance < 2 ? 0.3 : distance < 4 ? 0.2 : 0.1;
                const score = refMatch.confidence * (1 + proximityBoost);

                if (distance < 5 && score > bestScore) {
                    // Within reasonable distance
                    bestMatch = refMatch;
                    bestScore = score;
                    minDistance = distance;
                }
            }
        }

        if (bestMatch) {
            return {
                ...bestMatch,
                confidence: bestScore,
                matchType: 'address_anchored_reference',
            };
        }

        return null;
    }

    // Get proximity threshold based on field type
    private static getProximityThreshold(fieldType: string): number {
        if (fieldType.includes('_reference') || fieldType.includes('Numbers')) {
            return 2.5; // Tighter threshold for reference numbers
        }
        if (fieldType.includes('city') || fieldType.includes('state') || fieldType.includes('zip')) {
            return 1.5; // Very tight for address components
        }
        if (fieldType.includes('date') || fieldType.includes('time')) {
            return 3.5; // Looser for dates/times
        }
        return 3; // Default threshold
    }

    // Calculate boost based on proximity to address anchors
    private static calculateAddressProximityBoost(line: Line, addressAnchors: Line[]): number {
        if (addressAnchors.length === 0) {
            return 0;
        }

        let minDistance = Infinity;
        for (const anchor of addressAnchors) {
            const distance = this.calculateSpatialDistance(line, anchor);
            minDistance = Math.min(minDistance, distance);
        }

        // Boost based on proximity to nearest address
        if (minDistance < 1) return 0.4; // Very close
        if (minDistance < 2) return 0.3; // Close
        if (minDistance < 3) return 0.2; // Moderate
        if (minDistance < 5) return 0.1; // Far but relevant
        return 0; // Too far
    }

    // Determine stop type from field name/type
    private static determineStopTypeFromField(fieldType: string): 'pickup' | 'dropoff' | null {
        if (fieldType.includes('shipper') || fieldType.includes('pickup')) {
            return 'pickup';
        }
        if (fieldType.includes('receiver') || fieldType.includes('delivery') || fieldType.includes('dropoff')) {
            return 'dropoff';
        }
        return null;
    }

    // Filter matches by stop type context
    private static filterMatchesByStopType(
        matches: { line: Line; confidence: number; matchType: string }[],
        stopType: 'pickup' | 'dropoff',
    ): { line: Line; confidence: number; matchType: string }[] {
        return matches.filter((match) => {
            const lineText = match.line.text.toLowerCase();
            if (stopType === 'pickup') {
                // For pickup, prefer lines with pickup keywords and avoid delivery keywords
                const hasPickupKeywords = /\b(pickup|pick.*up|shipper|origin|sender|from|load|collect)/i.test(lineText);
                const hasDeliveryKeywords =
                    /\b(delivery|deliver|drop.*off|receiver|destination|consignee|to|unload)/i.test(lineText);
                return hasPickupKeywords || !hasDeliveryKeywords;
            } else if (stopType === 'dropoff') {
                // For dropoff, prefer lines with delivery keywords and avoid pickup keywords
                const hasDeliveryKeywords =
                    /\b(delivery|deliver|drop.*off|receiver|destination|consignee|to|unload)/i.test(lineText);
                const hasPickupKeywords = /\b(pickup|pick.*up|shipper|origin|sender|from|load|collect)/i.test(lineText);
                return hasDeliveryKeywords || !hasPickupKeywords;
            }
            return true;
        });
    }

    public static calculateSpatialDistance(line1: Line, line2: Line): number {
        if (line1.pageNumber !== line2.pageNumber) {
            return Math.abs(line1.pageNumber - line2.pageNumber) * 10; // Heavy penalty for different pages
        }

        // Calculate center points of bounding boxes
        const center1 = this.getBoundingBoxCenter(line1.boundingPoly.normalizedVertices);
        const center2 = this.getBoundingBoxCenter(line2.boundingPoly.normalizedVertices);

        // Euclidean distance
        return Math.sqrt(Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2));
    }

    private static getBoundingBoxCenter(vertices: { x: number; y: number }[]): { x: number; y: number } {
        const x = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
        const y = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
        return { x, y };
    }
}

// Date and Time Format Matching Utilities
class DateTimeFormatter {
    // Generate all possible date format variations for a given date
    static generateDateVariations(dateValue: Date): string[] {
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        const year = dateValue.getFullYear();
        const year2Digit = String(year).slice(-2);

        // Month and day without leading zeros
        const monthNoZero = String(dateValue.getMonth() + 1);
        const dayNoZero = String(dateValue.getDate());

        // Month names
        const monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ];
        const monthAbbrev = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const fullMonthName = monthNames[dateValue.getMonth()];
        const abbrevMonthName = monthAbbrev[dateValue.getMonth()];

        // Generate ordinal suffixes
        const getOrdinal = (num: number) => {
            const lastDigit = num % 10;
            const lastTwoDigits = num % 100;
            if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return num + 'th';
            switch (lastDigit) {
                case 1:
                    return num + 'st';
                case 2:
                    return num + 'nd';
                case 3:
                    return num + 'rd';
                default:
                    return num + 'th';
            }
        };

        const dayOrdinal = getOrdinal(dateValue.getDate());

        const variations = [
            // Standard separator formats
            // MM/DD/YYYY variations
            `${month}/${day}/${year}`,
            `${monthNoZero}/${dayNoZero}/${year}`,
            `${month}/${dayNoZero}/${year}`,
            `${monthNoZero}/${day}/${year}`,

            // MM/DD/YY variations
            `${month}/${day}/${year2Digit}`,
            `${monthNoZero}/${dayNoZero}/${year2Digit}`,
            `${month}/${dayNoZero}/${year2Digit}`,
            `${monthNoZero}/${day}/${year2Digit}`,

            // MM-DD-YYYY variations
            `${month}-${day}-${year}`,
            `${monthNoZero}-${dayNoZero}-${year}`,
            `${month}-${dayNoZero}-${year}`,
            `${monthNoZero}-${day}-${year}`,

            // MM-DD-YY variations
            `${month}-${day}-${year2Digit}`,
            `${monthNoZero}-${dayNoZero}-${year2Digit}`,
            `${month}-${dayNoZero}-${year2Digit}`,
            `${monthNoZero}-${day}-${year2Digit}`,

            // MM.DD.YYYY variations (European style)
            `${month}.${day}.${year}`,
            `${monthNoZero}.${dayNoZero}.${year}`,
            `${month}.${dayNoZero}.${year}`,
            `${monthNoZero}.${day}.${year}`,

            // MM.DD.YY variations
            `${month}.${day}.${year2Digit}`,
            `${monthNoZero}.${dayNoZero}.${year2Digit}`,
            `${month}.${dayNoZero}.${year2Digit}`,
            `${monthNoZero}.${day}.${year2Digit}`,

            // Space-separated formats
            `${month} ${day} ${year}`,
            `${monthNoZero} ${dayNoZero} ${year}`,
            `${month} ${dayNoZero} ${year}`,
            `${monthNoZero} ${day} ${year}`,
            `${month} ${day} ${year2Digit}`,
            `${monthNoZero} ${dayNoZero} ${year2Digit}`,

            // Comma-separated formats
            `${month}, ${day}, ${year}`,
            `${monthNoZero}, ${dayNoZero}, ${year}`,
            `${month}, ${day}, ${year2Digit}`,
            `${monthNoZero}, ${dayNoZero}, ${year2Digit}`,

            // No separator formats
            `${month}${day}${year}`,
            `${month}${day}${year2Digit}`,
            `${year}${month}${day}`,
            `${year2Digit}${month}${day}`,

            // YYYY/MM/DD formats (ISO-like)
            `${year}/${month}/${day}`,
            `${year}/${monthNoZero}/${dayNoZero}`,
            `${year}-${month}-${day}`,
            `${year}-${monthNoZero}-${dayNoZero}`,
            `${year}.${month}.${day}`,
            `${year}.${monthNoZero}.${dayNoZero}`,
            `${year} ${month} ${day}`,
            `${year} ${monthNoZero} ${dayNoZero}`,

            // DD/MM/YYYY formats (European)
            `${day}/${month}/${year}`,
            `${dayNoZero}/${monthNoZero}/${year}`,
            `${day}/${month}/${year2Digit}`,
            `${dayNoZero}/${monthNoZero}/${year2Digit}`,
            `${day}-${month}-${year}`,
            `${dayNoZero}-${monthNoZero}-${year}`,
            `${day}.${month}.${year}`,
            `${dayNoZero}.${monthNoZero}.${year}`,

            // Written month formats (full names)
            `${fullMonthName} ${dayNoZero}, ${year}`,
            `${fullMonthName} ${day}, ${year}`,
            `${fullMonthName} ${dayOrdinal}, ${year}`,
            `${dayNoZero} ${fullMonthName} ${year}`,
            `${day} ${fullMonthName} ${year}`,
            `${dayOrdinal} ${fullMonthName} ${year}`,
            `${year} ${fullMonthName} ${dayNoZero}`,
            `${year} ${fullMonthName} ${day}`,

            // Abbreviated month formats
            `${abbrevMonthName} ${dayNoZero}, ${year}`,
            `${abbrevMonthName} ${day}, ${year}`,
            `${abbrevMonthName} ${dayOrdinal}, ${year}`,
            `${abbrevMonthName} ${dayNoZero} ${year}`,
            `${abbrevMonthName} ${day} ${year}`,
            `${abbrevMonthName}. ${dayNoZero}, ${year}`,
            `${abbrevMonthName}. ${day}, ${year}`,
            `${dayNoZero} ${abbrevMonthName} ${year}`,
            `${day} ${abbrevMonthName} ${year}`,
            `${dayOrdinal} ${abbrevMonthName} ${year}`,
            `${dayNoZero} ${abbrevMonthName}, ${year}`,
            `${day} ${abbrevMonthName}, ${year}`,
            `${year} ${abbrevMonthName} ${dayNoZero}`,
            `${year} ${abbrevMonthName} ${day}`,

            // Short abbreviated with 2-digit year
            `${abbrevMonthName} ${dayNoZero}, ${year2Digit}`,
            `${abbrevMonthName} ${day}, ${year2Digit}`,
            `${abbrevMonthName} ${dayNoZero} ${year2Digit}`,
            `${abbrevMonthName} ${day} ${year2Digit}`,
            `${dayNoZero} ${abbrevMonthName} ${year2Digit}`,
            `${day} ${abbrevMonthName} ${year2Digit}`,

            // Lowercase variations (common in PDFs)
            `${fullMonthName.toLowerCase()} ${dayNoZero}, ${year}`,
            `${abbrevMonthName.toLowerCase()} ${dayNoZero}, ${year}`,
            `${abbrevMonthName.toLowerCase()} ${day}, ${year}`,
            `${dayNoZero} ${abbrevMonthName.toLowerCase()} ${year}`,
            `${day} ${abbrevMonthName.toLowerCase()} ${year}`,

            // Uppercase variations
            `${fullMonthName.toUpperCase()} ${dayNoZero}, ${year}`,
            `${abbrevMonthName.toUpperCase()} ${dayNoZero}, ${year}`,
            `${abbrevMonthName.toUpperCase()} ${day}, ${year}`,

            // Mixed case and punctuation variations
            `${abbrevMonthName}. ${dayNoZero}, ${year}`,
            `${abbrevMonthName}. ${day}, ${year}`,
            `${abbrevMonthName}. ${dayNoZero} ${year}`,
            `${abbrevMonthName}. ${day} ${year}`,
        ];

        return Array.from(new Set(variations)); // Remove duplicates
    }

    // Generate all possible time format variations
    static generateTimeVariations(timeValue: string): string[] {
        if (!timeValue) return [];

        const variations = [timeValue];

        // Handle different time formats
        const timeMatch = timeValue.match(/^(\d{1,2}):(\d{2})(\s*(am|pm|AM|PM))?$/);
        if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2];
            const ampm = timeMatch[3]?.toLowerCase();

            // Add variations with/without leading zero
            const hoursNoZero = String(hours);
            const hoursWithZero = String(hours).padStart(2, '0');

            variations.push(`${hoursNoZero}:${minutes}`, `${hoursWithZero}:${minutes}`);

            if (ampm) {
                variations.push(
                    `${hoursNoZero}:${minutes}${ampm.replace(/\s/g, '')}`,
                    `${hoursWithZero}:${minutes}${ampm.replace(/\s/g, '')}`,
                    `${hoursNoZero}:${minutes} ${ampm.replace(/\s/g, '')}`,
                    `${hoursWithZero}:${minutes} ${ampm.replace(/\s/g, '')}`,
                );
            }

            // Military time conversion (for AM/PM to 24-hour)
            if (ampm) {
                let militaryHours = hours;
                if (ampm.includes('pm') && hours !== 12) {
                    militaryHours += 12;
                } else if (ampm.includes('am') && hours === 12) {
                    militaryHours = 0;
                }

                const militaryTime = `${String(militaryHours).padStart(2, '0')}:${minutes}`;
                const militaryTimeNoColon = `${String(militaryHours).padStart(2, '0')}${minutes}`;

                variations.push(militaryTime, militaryTimeNoColon);
            }
        }

        return Array.from(new Set(variations)); // Remove duplicates
    }

    // Check if a line contains any of the date variations
    static containsDateVariation(lineText: string, dateVariations: string[]): boolean {
        return dateVariations.some((variation) => lineText.includes(variation));
    }

    // Check if a line contains any of the time variations
    static containsTimeVariation(lineText: string, timeVariations: string[]): boolean {
        return timeVariations.some((variation) => lineText.includes(variation));
    }

    // Advanced date pattern matching that handles ALL possible date formats
    static matchesDatePattern(lineText: string, searchDate?: Date): { match: boolean; confidence: number } {
        if (!lineText || typeof lineText !== 'string') {
            return { match: false, confidence: 0 };
        }

        // If no target date provided, just check if line contains any date pattern
        if (!searchDate) {
            const hasAnyDatePattern =
                /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b|\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/.test(
                    lineText,
                );
            return { match: hasAnyDatePattern, confidence: hasAnyDatePattern ? 0.7 : 0 };
        }

        const variations = this.generateDateVariations(searchDate);

        // Direct match - highest confidence
        for (const variation of variations) {
            if (lineText.includes(variation)) {
                return { match: true, confidence: 1.0 };
            }
        }

        // Comprehensive pattern-based matching with extraction and validation
        const datePatterns = [
            // Numeric date patterns with separators
            /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g, // MM/DD/YYYY, DD/MM/YYYY
            /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})\b/g, // MM/DD/YY, DD/MM/YY
            /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/g, // YYYY/MM/DD, YYYY/DD/MM

            // No separator formats
            /\b(\d{1,2})(\d{2})(\d{4})\b/g, // MMDDYYYY, DDMMYYYY
            /\b(\d{1,2})(\d{2})(\d{2})\b/g, // MMDDYY, DDMMYY
            /\b(\d{4})(\d{2})(\d{2})\b/g, // YYYYMMDD
            /\b(\d{2})(\d{2})(\d{4})\b/g, // MMDDYYYY, DDMMYYYY
            /\b(\d{2})(\d{2})(\d{2})\b/g, // MMDDYY, DDMMYY, YYMMDD
        ];

        const targetMonth = searchDate.getMonth() + 1;
        const targetDay = searchDate.getDate();
        const targetYear = searchDate.getFullYear();
        const targetYear2Digit = targetYear % 100;

        for (const pattern of datePatterns) {
            let match;
            while ((match = pattern.exec(lineText)) !== null) {
                let month, day, year;

                // Numeric patterns
                const [, part1, part2, part3] = match.map((p) => parseInt(p) || p);

                // Determine format based on pattern and values
                if (part1 > 31 || (part1 > 12 && part1 <= 31)) {
                    // First part is year or day
                    if (part1 > 31) {
                        // YYYY/MM/DD or YYYY/DD/MM
                        year = part1;
                        if (part2 <= 12 && part3 <= 31) {
                            month = part2;
                            day = part3;
                        } else if (part3 <= 12 && part2 <= 31) {
                            month = part3;
                            day = part2;
                        }
                    } else {
                        // DD/MM/YYYY format (day first)
                        day = part1;
                        month = part2;
                        year = part3;
                    }
                } else {
                    // MM/DD/YYYY or DD/MM/YYYY format
                    // Try both interpretations and see which makes more sense
                    const interpretations = [
                        { month: part1, day: part2, year: part3 }, // MM/DD/YYYY
                        { month: part2, day: part1, year: part3 }, // DD/MM/YYYY
                    ];

                    // Choose interpretation based on validity and likelihood
                    for (const interp of interpretations) {
                        if (interp.month >= 1 && interp.month <= 12 && interp.day >= 1 && interp.day <= 31) {
                            month = interp.month;
                            day = interp.day;
                            year = interp.year;
                            break;
                        }
                    }
                }

                // Handle 2-digit year conversion
                if (year < 100) {
                    // Smart year conversion: 00-30 = 2000s, 31-99 = 1900s
                    year = year <= 30 ? 2000 + year : 1900 + year;
                }

                // Validate date components
                if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 1900 && year < 2100) {
                    // Check if this matches our target date
                    if (month === targetMonth && day === targetDay) {
                        if (year === targetYear) {
                            return { match: true, confidence: Math.min(0.8 + 0.05, 1.0) }; // Boost for exact year match
                        } else if (year % 100 === targetYear2Digit || year === targetYear2Digit) {
                            return { match: true, confidence: Math.max(0.8 - 0.1, 0.7) }; // Slight penalty for 2-digit year match
                        }
                    }
                }

                // Reset pattern lastIndex to prevent infinite loops
                if (!pattern.global) break;
            }
        }

        return { match: false, confidence: 0 };
    }

    // Advanced time pattern matching with time range support
    static matchesTimePattern(lineText: string, searchTime: string): { match: boolean; confidence: number } {
        if (!searchTime) return { match: false, confidence: 0 };

        // Check if searchTime is a time range
        const isTimeRange = searchTime.includes('-');

        if (isTimeRange) {
            // Handle time range matching
            const [startTime, endTime] = searchTime.split('-').map((t) => t.trim());

            // Generate variations for the complete range
            const rangeVariations = [
                searchTime, // Original format
                `${startTime} - ${endTime}`, // With spaces
                `${startTime} to ${endTime}`, // With "to"
                `from ${startTime} to ${endTime}`, // With "from...to"
                `between ${startTime} and ${endTime}`, // With "between...and"
                `${startTime}/${endTime}`, // With slash
            ];

            // Check for direct range matches first
            for (const variation of rangeVariations) {
                if (lineText.toLowerCase().includes(variation.toLowerCase())) {
                    return { match: true, confidence: 0.95 };
                }
            }

            // Check if line contains both start and end times
            const startTimeVariations = this.generateTimeVariations(startTime);
            const endTimeVariations = this.generateTimeVariations(endTime);

            let hasStartTime = false;
            let hasEndTime = false;

            for (const startVar of startTimeVariations) {
                if (lineText.includes(startVar)) {
                    hasStartTime = true;
                    break;
                }
            }

            for (const endVar of endTimeVariations) {
                if (lineText.includes(endVar)) {
                    hasEndTime = true;
                    break;
                }
            }

            if (hasStartTime && hasEndTime) {
                return { match: true, confidence: 0.9 };
            } else if (hasStartTime || hasEndTime) {
                return { match: true, confidence: 0.7 };
            }
        } else {
            // Handle single time matching (existing logic)
            const variations = this.generateTimeVariations(searchTime);

            // Direct match - highest confidence
            for (const variation of variations) {
                if (lineText.includes(variation)) {
                    return { match: true, confidence: 1.0 };
                }
            }
        }

        // Pattern-based time matching for both single times and ranges
        const timePatterns = [
            /\b(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})(\s*(am|pm|AM|PM))?\b/g, // Range pattern
            /\b(\d{1,2}):(\d{2})(\s*(am|pm|AM|PM))?\b/g, // Single time pattern
            /\b(\d{3,4})\s*(hours?|hrs?|h)\b/gi, // Military time
        ];

        if (isTimeRange) {
            const [startTime, endTime] = searchTime.split('-').map((t) => t.trim());
            const startMatch = startTime.match(/^(\d{1,2}):(\d{2})(\s*(am|pm|AM|PM))?$/i);
            const endMatch = endTime.match(/^(\d{1,2}):(\d{2})(\s*(am|pm|AM|PM))?$/i);

            if (!startMatch || !endMatch) return { match: false, confidence: 0 };

            const searchStartHours = parseInt(startMatch[1]);
            const searchStartMinutes = parseInt(startMatch[2]);
            const searchEndHours = parseInt(endMatch[1]);
            const searchEndMinutes = parseInt(endMatch[2]);

            // Check for range pattern
            const rangePattern = timePatterns[0];
            let match;
            while ((match = rangePattern.exec(lineText)) !== null) {
                const lineStartHours = parseInt(match[1]);
                const lineStartMinutes = parseInt(match[2]);
                const lineEndHours = parseInt(match[3]);
                const lineEndMinutes = parseInt(match[4]);

                if (
                    lineStartHours === searchStartHours &&
                    lineStartMinutes === searchStartMinutes &&
                    lineEndHours === searchEndHours &&
                    lineEndMinutes === searchEndMinutes
                ) {
                    return { match: true, confidence: 0.95 };
                }
            }
        } else {
            // Single time pattern matching (existing logic)
            const searchMatch = searchTime.match(/^(\d{1,2}):(\d{2})(\s*(am|pm|AM|PM))?$/i);
            if (!searchMatch) return { match: false, confidence: 0 };

            const searchHours = parseInt(searchMatch[1]);
            const searchMinutes = parseInt(searchMatch[2]);
            const searchAmPm = searchMatch[3]?.toLowerCase();

            for (let i = 1; i < timePatterns.length; i++) {
                const pattern = timePatterns[i];
                let match;
                while ((match = pattern.exec(lineText)) !== null) {
                    if (pattern.source.includes('hours')) {
                        // Military time format
                        const militaryTime = parseInt(match[1]);
                        const hours = Math.floor(militaryTime / 100);
                        const minutes = militaryTime % 100;

                        if (hours === searchHours && minutes === searchMinutes) {
                            return { match: true, confidence: 0.9 };
                        }
                    } else {
                        // Regular time format
                        const hours = parseInt(match[1]);
                        const minutes = parseInt(match[2]);
                        const ampm = match[3]?.toLowerCase();

                        if (hours === searchHours && minutes === searchMinutes) {
                            if (searchAmPm && ampm) {
                                if (searchAmPm.includes(ampm.replace(/\s/g, ''))) {
                                    return { match: true, confidence: 0.95 };
                                }
                            } else {
                                return { match: true, confidence: 0.8 };
                            }
                        }
                    }
                }
            }
        }

        return { match: false, confidence: 0 };
    }
}

function updateProgress(foundProperties: Set<string>) {
    return (foundProperties.size / (expectedProperties.size + 1)) * 100;
}

function checkForProperties(chunk: string, foundProperties: Set<string>) {
    expectedProperties.forEach((property) => {
        if (chunk.includes(`"${property}"`) && !foundProperties.has(property)) {
            foundProperties.add(property);
        }
    });

    return updateProgress(foundProperties);
}

// Progress tracking helper for more realistic progress updates
class ProgressTracker {
    private stages: { name: string; progress: number; duration: number }[] = [];
    private currentStageIndex = 0;
    private stageStartTime = 0;
    private progressCallback: (progress: number, stage: string) => void;
    private isManuallyOverridden = false;

    constructor(progressCallback: (progress: number, stage: string) => void) {
        this.progressCallback = progressCallback;
    }

    setStages(stages: { name: string; progress: number; duration: number }[]) {
        this.stages = stages;
        this.currentStageIndex = 0;
        this.stageStartTime = Date.now();
        this.isManuallyOverridden = false;
    }

    updateProgress(forceStageIndex?: number) {
        if (this.stages.length === 0) return;

        const stageIndex = forceStageIndex !== undefined ? forceStageIndex : this.currentStageIndex;
        if (stageIndex >= this.stages.length) return;

        const currentStage = this.stages[stageIndex];
        const prevStagesProgress = this.stages.slice(0, stageIndex).reduce((sum, stage) => sum + stage.progress, 0);

        if (forceStageIndex !== undefined) {
            // Jump to specific stage
            this.currentStageIndex = stageIndex;
            this.stageStartTime = Date.now();
            this.isManuallyOverridden = true;
            this.progressCallback(prevStagesProgress, currentStage.name);
            return;
        }

        // Skip automatic updates if manually overridden (e.g., during streaming)
        if (this.isManuallyOverridden) {
            return;
        }

        const elapsedTime = Date.now() - this.stageStartTime;
        const stageProgress = Math.min(1, elapsedTime / currentStage.duration);
        const totalProgress = prevStagesProgress + currentStage.progress * stageProgress;

        this.progressCallback(Math.min(99, totalProgress), currentStage.name);

        // Auto advance to next stage when current is complete
        if (stageProgress >= 1 && this.currentStageIndex < this.stages.length - 1) {
            this.nextStage();
        }
    }

    nextStage() {
        if (this.currentStageIndex < this.stages.length - 1) {
            this.currentStageIndex++;
            this.stageStartTime = Date.now();
            this.isManuallyOverridden = false; // Reset override when moving to next stage
            this.updateProgress();
        }
    }

    complete() {
        this.isManuallyOverridden = false;
        this.progressCallback(100, this.stages[this.stages.length - 1]?.name || 'Complete');
    }

    getCurrentStageName(): string {
        return this.stages[this.currentStageIndex]?.name || '';
    }

    // Allow manual progress override (for streaming responses)
    setManualProgress(progress: number, stageName?: string) {
        this.isManuallyOverridden = true;
        this.progressCallback(progress, stageName || this.getCurrentStageName());
    }

    // Reset manual override and resume automatic progress
    resumeAutoProgress() {
        this.isManuallyOverridden = false;
        this.stageStartTime = Date.now(); // Reset timer for current stage
    }
}

const CreateLoad: PageWithAuth = () => {
    const formHook = useForm<ExpandedLoad>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const loadId = searchParams?.get('id') as string;
    const copyLoadId = searchParams?.get('copyLoadId') as string;
    const { isProPlan, isLoadingCarrier } = useUserContext();

    const [loading, setLoading] = useState(false);
    const [loadSubmitting, setLoadSubmitting] = useState(false);
    const [openAddCustomer, setOpenAddCustomer] = useState(false);
    const [showMissingCustomerLabel, setShowMissingCustomerLabel] = useState(false);
    const [prefillName, setPrefillName] = useState(null);
    const [extractedCustomerDetails, setExtractedCustomerDetails] = useState<AICustomerDetails>(null);
    const [currentRateconFile, setCurrentRateconFile] = useState<File>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const [aiProgress, setAiProgress] = useState(0);
    const [aiProgressStage, setAiProgressStage] = useState('');
    const [isRetrying, setIsRetrying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isProcessingText, setIsProcessingText] = useState(false);
    const [isProcessingImages, setIsProcessingImages] = useState(false);

    const [ocrLines, setOcrLines] = useState<OCRLines>(null);
    const [ocrVertices, setOcrVertices] = useState<{ x: number; y: number }[][]>(null);
    const [ocrVerticesPage, setOcrVerticesPage] = useState<number>(null);

    // Progress tracker instance
    const progressTracker = useRef<ProgressTracker | null>(null);

    // Initialize progress tracker
    useEffect(() => {
        progressTracker.current = new ProgressTracker((progress, stage) => {
            setAiProgress(progress);
            setAiProgressStage(stage);
        });
    }, []);

    // Progress update interval for smoother visual feedback
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isProcessing || isProcessingText || isProcessingImages) {
            interval = setInterval(() => {
                progressTracker.current?.updateProgress();
            }, 100); // Update every 100ms for smooth animation
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isProcessing, isProcessingText, isProcessingImages]);

    const stopsFieldArray = useFieldArray({ name: 'stops', control: formHook.control });

    const [dragActive, setDragActive] = useState(false);
    const [aiLimitReached, setAiLimitReached] = useState(false);

    // Upload mode and text paste state
    const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
    const [pastedText, setPastedText] = useState('');
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [canProcessImages, setCanProcessImages] = useState(false);

    const MAX_IMAGES = 3;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_TEXT_LENGTH = 15000;

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Don't allow drag when text or images are being processed
        if (isProcessingText || isProcessingImages) {
            return;
        }

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    // Helper function to validate file types
    const isValidFileType = (file: File) => {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        return validTypes.includes(file.type);
    };

    // Helper function to check if file is PDF
    const isPDF = (file: File) => {
        return file.type === 'application/pdf';
    };

    // Helper function to check if file is image
    const isImage = (file: File) => {
        return ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
    };

    // Helper function to calculate total size of files
    const calculateTotalSize = (files: File[]) => {
        return files.reduce((total, file) => total + file.size, 0);
    };

    // Helper function to validate multiple file upload
    const validateMultipleFiles = (newFiles: FileList | File[]) => {
        const filesArray = Array.from(newFiles);

        // Check for PDF files
        const pdfFiles = filesArray.filter(isPDF);
        const imageFiles = filesArray.filter(isImage);

        // Validate: only 1 PDF allowed
        if (pdfFiles.length > 1) {
            notify({
                title: 'Too many PDFs',
                message: 'Only one PDF file is allowed.',
                type: 'error',
            });
            return false;
        }

        // Validate: max 3 images
        if (imageFiles.length > MAX_IMAGES) {
            notify({
                title: 'Too many images',
                message: `Maximum ${MAX_IMAGES} images allowed.`,
                type: 'error',
            });
            return false;
        }

        // Check if we already have files and this would exceed limits
        const currentImageCount = selectedImages.length;
        const currentHasPDF = !!currentRateconFile;

        if (currentHasPDF && pdfFiles.length > 0) {
            notify({
                title: 'PDF already uploaded',
                message: 'Only one PDF file is allowed. Remove the current PDF first.',
                type: 'error',
            });
            return false;
        }

        if (currentImageCount + imageFiles.length > MAX_IMAGES) {
            notify({
                title: 'Too many images',
                message: `Maximum ${MAX_IMAGES} images allowed. You currently have ${currentImageCount} image(s).`,
                type: 'error',
            });
            return false;
        }

        // Check total file size
        const allFiles = [...selectedImages, ...filesArray];
        if (currentRateconFile) {
            allFiles.push(currentRateconFile);
        }

        if (calculateTotalSize(allFiles) > MAX_FILE_SIZE) {
            notify({
                title: 'Files too large',
                message: 'Total file size cannot exceed 10MB.',
                type: 'error',
            });
            return false;
        }

        // Check individual file types
        const invalidFiles = filesArray.filter((file) => !isValidFileType(file));
        if (invalidFiles.length > 0) {
            notify({
                title: 'Invalid file type',
                message: 'Please upload only PDF, JPEG, JPG, or PNG files.',
                type: 'error',
            });
            return false;
        }

        return true;
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        // Don't allow drop when text or images are being processed
        if (isProcessingText || isProcessingImages) {
            return;
        }

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        if (!validateMultipleFiles(files)) return;

        handleMultipleFiles(files);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Don't allow file input when text or images are being processed
        if (isProcessingText || isProcessingImages) {
            e.target.value = ''; // Reset input
            return;
        }

        if (!validateMultipleFiles(files)) {
            e.target.value = ''; // Reset input
            return;
        }

        handleMultipleFiles(files);
        e.target.value = ''; // Reset input for re-selection
    };

    // Handle multiple files (PDF or images)
    const handleMultipleFiles = (files: FileList | File[]) => {
        const filesArray = Array.from(files);
        const pdfFiles = filesArray.filter(isPDF);
        const imageFiles = filesArray.filter(isImage);

        // Handle PDF files (auto-process)
        if (pdfFiles.length > 0) {
            handleFileUpload(pdfFiles[0]); // Auto-process PDF
        }

        // Handle image files (add to selection, don't auto-process)
        if (imageFiles.length > 0) {
            setSelectedImages((prev) => {
                const newImages = [...prev, ...imageFiles];
                setCanProcessImages(newImages.length > 0);
                return newImages;
            });
        }
    };

    // Remove image from selection
    const removeImage = (index: number) => {
        // Don't allow removing images when text or images are being processed
        if (isProcessingText || isProcessingImages) {
            return;
        }

        setSelectedImages((prev) => {
            const newImages = prev.filter((_, i) => i !== index);
            setCanProcessImages(newImages.length > 0);
            return newImages;
        });
    };

    // Process selected images by stitching them into a PDF
    const processImages = async () => {
        if (selectedImages.length === 0) {
            notify({
                title: 'No images selected',
                message: 'Please select at least one image to process.',
                type: 'error',
            });
            return;
        }

        setIsProcessingImages(true);

        // Set up progress stages for image processing
        progressTracker.current?.setStages([
            { name: 'Initializing PDF creation', progress: 10, duration: 500 },
            { name: 'Processing images', progress: 60, duration: 2000 },
            { name: 'Creating PDF document', progress: 15, duration: 1000 },
            { name: 'Extracting document data', progress: 15, duration: 2000 },
        ]);

        try {
            // Create a new PDF document
            progressTracker.current?.updateProgress(0);
            const pdfDoc = await PDFDocument.create();

            // Move to next stage
            progressTracker.current?.nextStage();

            // Process each image
            for (let i = 0; i < selectedImages.length; i++) {
                const image = selectedImages[i];
                const imageBytes = await image.arrayBuffer();

                let embeddedImage;
                if (image.type === 'image/jpeg' || image.type === 'image/jpg') {
                    embeddedImage = await pdfDoc.embedJpg(imageBytes);
                } else if (image.type === 'image/png') {
                    embeddedImage = await pdfDoc.embedPng(imageBytes);
                } else {
                    throw new Error(`Unsupported image type: ${image.type}`);
                }

                // Calculate dimensions to fit the page while maintaining aspect ratio
                const { width, height } = embeddedImage.scale(1);
                const pageWidth = 612; // Standard letter size width
                const pageHeight = 792; // Standard letter size height
                const margin = 50;

                const maxWidth = pageWidth - margin * 2;
                const maxHeight = pageHeight - margin * 2;

                let scaledWidth = width;
                let scaledHeight = height;

                // Scale down if image is too large
                if (width > maxWidth || height > maxHeight) {
                    const widthRatio = maxWidth / width;
                    const heightRatio = maxHeight / height;
                    const scaleRatio = Math.min(widthRatio, heightRatio);

                    scaledWidth = width * scaleRatio;
                    scaledHeight = height * scaleRatio;
                }

                // Add a new page for each image
                const page = pdfDoc.addPage([pageWidth, pageHeight]);

                // Center the image on the page
                const x = (pageWidth - scaledWidth) / 2;
                const y = (pageHeight - scaledHeight) / 2;

                page.drawImage(embeddedImage, {
                    x,
                    y,
                    width: scaledWidth,
                    height: scaledHeight,
                });

                // Update progress within the current stage
                const imageProgress = ((i + 1) / selectedImages.length) * 100;
                const currentStageProgress = 10 + imageProgress * 0.6;
                progressTracker.current?.setManualProgress(currentStageProgress, 'Processing images');
            }

            // Move to PDF creation stage - resume automatic progress
            progressTracker.current?.resumeAutoProgress();
            progressTracker.current?.nextStage();

            // Serialize the PDF
            const pdfBytes = await pdfDoc.save();

            // Create a File object from the PDF bytes with standardized naming
            const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
            const fileName = generateRateconFilename();
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

            // Move to final processing stage
            progressTracker.current?.nextStage();

            // Process the stitched PDF
            await handleFileUpload(pdfFile);

            // Clear selected images
            setSelectedImages([]);
            setCanProcessImages(false);

            progressTracker.current?.complete();

            notify({
                title: 'Images processed',
                message: `${selectedImages.length} images have been stitched into a PDF and processed successfully.`,
                type: 'success',
            });
        } catch (error) {
            console.error('Error processing images:', error);
            setIsProcessingImages(false);
            setAiProgress(0);
            setAiProgressStage('');

            // Reset progress tracker state
            progressTracker.current?.resumeAutoProgress();

            notify({
                title: 'Processing failed',
                message: 'Failed to process the selected images. Please try again.',
                type: 'error',
            });
        }
    };

    // Process extracted data from AI (used by both text and document uploads)
    const processExtractedData = async (aiLoad: AILoad) => {
        if (!aiLoad) {
            throw new Error('No data extracted from the input');
        }

        // Get customers list for matching
        let customersList: Customer[] = [];
        try {
            customersList = (await getAllCustomers({ limit: 999, offset: 0 }))?.customers;
        } catch (error) {
            console.error('Error loading customers:', error);
            // Continue without customer matching if this fails
        }

        // Apply AI output to form (reusing existing logic)
        const logisticsCompany = aiLoad?.logistics_company;

        // Only apply AI output if not in edit mode or user confirms
        if (!isEditMode || confirm('Do you want to replace your current data with the extracted information?')) {
            applyAIOutputToForm(aiLoad);
            // Handle customer matching
            if (customersList.length > 0) {
                handleCustomerMatching(logisticsCompany, customersList, aiLoad);
            }
        }
    };

    // Handle text submission for processing
    const handleTextSubmit = async () => {
        if (!pastedText.trim()) {
            notify({
                title: 'No text provided',
                message: 'Please paste some text to process.',
                type: 'error',
            });
            return;
        }

        if (pastedText.length > MAX_TEXT_LENGTH) {
            notify({
                title: 'Text too long',
                message: `Text cannot exceed ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
                type: 'error',
            });
            return;
        }

        // Reset form if not in edit mode
        if (!isEditMode) {
            formHook.reset({
                customer: null,
                loadNum: null,
                rate: null,
                shipper: {
                    name: null,
                    street: null,
                    city: null,
                    state: null,
                    zip: null,
                },
                receiver: {
                    name: null,
                    street: null,
                    city: null,
                    state: null,
                    zip: null,
                },
                stops: [],
            });
        }

        setLoading(true);
        setIsRetrying(false);
        setIsProcessing(true);
        setIsProcessingText(true);

        // Set up progress stages for text processing
        progressTracker.current?.setStages([
            { name: 'Connecting to AI service', progress: 15, duration: 1000 },
            { name: 'Analyzing text content', progress: 50, duration: 3000 },
            { name: 'Extracting load information', progress: 25, duration: 2000 },
            { name: 'Finalizing results', progress: 10, duration: 500 },
        ]);

        try {
            progressTracker.current?.updateProgress(0);

            // Call the text processing API endpoint with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

            const response = await fetch(`${apiUrl}/ai/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: pastedText }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = 'Failed to process text';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch {
                    // If error response is not JSON, use status text
                    errorMessage = response.statusText || errorMessage;
                }

                if (response.status === 429) {
                    errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
                } else if (response.status >= 500) {
                    errorMessage = 'Server error occurred. Please try again in a few moments.';
                }

                throw new Error(errorMessage);
            }

            // Move to analysis stage
            progressTracker.current?.nextStage();

            // Read the streaming response with better error handling
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response stream available from server');
            }

            let aiResponse = '';
            const foundProperties = new Set<string>();
            let chunkCount = 0;
            const maxChunks = 1000; // Prevent infinite loops

            while (true) {
                if (chunkCount++ > maxChunks) {
                    throw new Error('Response stream exceeded maximum length');
                }

                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                aiResponse += chunk;

                // Update progress based on found properties
                const progress = checkForProperties(chunk, foundProperties);
                // Use manual progress override during streaming to prevent flickering
                const streamingProgress = 15 + Math.min(50, progress * 0.5);
                progressTracker.current?.setManualProgress(streamingProgress, 'Analyzing text content');
            }

            // Move to extraction stage - resume automatic progress after streaming
            progressTracker.current?.resumeAutoProgress();
            progressTracker.current?.nextStage();

            // Validate we received some response
            if (!aiResponse.trim()) {
                throw new Error('Empty response received from AI service');
            }

            // Parse the AI response with improved error handling
            let aiLoad: AILoad;
            try {
                // Handle potential markdown code blocks in response
                let cleanedResponse = aiResponse.trim();

                // Remove markdown code blocks if present
                if (cleanedResponse.startsWith('```json') || cleanedResponse.startsWith('```')) {
                    const codeBlockMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (codeBlockMatch) {
                        cleanedResponse = codeBlockMatch[1].trim();
                    }
                }

                // Try to find JSON object if response contains extra text
                const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    cleanedResponse = jsonMatch[0];
                }

                // Parse the cleaned JSON
                const parsedResponse = JSON.parse(cleanedResponse);
                aiLoad = parsedResponse as AILoad;

                // Validate the parsed response has required structure
                if (!aiLoad || typeof aiLoad !== 'object') {
                    throw new Error('Invalid response structure from AI service');
                }
            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                throw new Error(
                    'Failed to parse AI response. The service may be experiencing issues. Please try again.',
                );
            }

            // Process the extracted data (reusing existing logic)
            await processExtractedData(aiLoad);

            // Move to finalization stage
            progressTracker.current?.nextStage();

            setIsProcessing(false);
            setIsProcessingText(false);
            setLoading(false);

            progressTracker.current?.complete();

            notify({
                title: 'Text processing complete',
                message: 'Text has been processed successfully and data extracted.',
                type: 'success',
            });
        } catch (error) {
            console.error('Error processing text:', error);
            setIsProcessing(false);
            setIsProcessingText(false);
            setLoading(false);
            setAiProgress(0);
            setAiProgressStage('');

            // Reset progress tracker state
            progressTracker.current?.resumeAutoProgress();

            let errorMessage = 'Failed to process the pasted text. Please try again.';
            let errorTitle = 'Processing failed';

            if (error.name === 'AbortError') {
                errorTitle = 'Request timeout';
                errorMessage =
                    'The request took too long to complete. Please try with shorter text or try again later.';
            } else if (error.message?.includes('Rate limit')) {
                errorTitle = 'Rate limit exceeded';
                errorMessage = 'Too many requests. Please wait a moment before trying again.';
            } else if (error.message?.includes('parse') || error.message?.includes('JSON')) {
                errorTitle = 'Response parsing error';
                errorMessage = 'The AI service returned an invalid response. Please try again.';
            } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
                errorTitle = 'Network error';
                errorMessage = 'Unable to connect to the AI service. Please check your connection and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            notify({
                title: errorTitle,
                message: errorMessage,
                type: 'error',
            });
        }
    };

    // Load existing load data for editing
    useEffect(() => {
        if (loadId) {
            setIsEditMode(true);
            const fetchLoad = async () => {
                setLoading(true);
                try {
                    const load = await getLoadById(loadId);
                    if (!load) {
                        setLoading(false);
                        return;
                    }

                    formHook.setValue('id', load.id);
                    formHook.setValue('customer', load.customer);
                    formHook.setValue('loadNum', load.loadNum);
                    formHook.setValue('rate', load.rate);
                    formHook.setValue('shipper', load.shipper);
                    formHook.setValue('receiver', load.receiver);
                    stopsFieldArray.replace(load.stops || []);
                    formHook.setValue('routeEncoded', load.routeEncoded);
                    formHook.setValue('routeDistanceMiles', load.routeDistanceMiles);
                    formHook.setValue('routeDurationHours', load.routeDurationHours);
                } catch (error) {
                    notify({ title: 'Error', message: 'Error loading load data', type: 'error' });
                }
                setLoading(false);
            };
            fetchLoad();
        }
    }, [loadId, formHook]);

    // Handle copying a load
    useEffect(() => {
        if (!copyLoadId) {
            return;
        }
        const copyLoad = async () => {
            setLoading(true);
            try {
                const load = await getLoadById(copyLoadId);
                if (!load) {
                    setLoading(false);
                    return;
                }

                formHook.setValue('customer', load.customer);
                formHook.setValue('loadNum', load.loadNum);
                formHook.setValue('rate', load.rate);
                formHook.setValue('shipper', load.shipper);
                formHook.setValue('receiver', load.receiver);
                stopsFieldArray.replace(load.stops || []);
            } catch (error) {
                notify({ title: 'Error', message: 'Error loading load data', type: 'error' });
            }
            setLoading(false);
        };
        copyLoad();
    }, [copyLoadId, formHook]);

    const submit = async (data: ExpandedLoad) => {
        //setLoading(true);
        setLoadSubmitting(true);

        data.shipper.type = LoadStopType.SHIPPER;
        data.receiver.type = LoadStopType.RECEIVER;

        const loadData: ExpandedLoad = {
            customerId: data.customer.id,
            loadNum: data.loadNum,
            rate: new Prisma.Decimal(data.rate),
            customer: data.customer,
            shipper: data.shipper,
            receiver: data.receiver,
            stops: data.stops,
        };

        // If editing, include the ID
        if (isEditMode && data.id) {
            loadData.id = data.id;
        }

        const shipperAddress =
            loadData.shipper.street +
            ', ' +
            loadData.shipper.city +
            ', ' +
            loadData.shipper.state +
            ' ' +
            loadData.shipper.zip;
        const receiverAddress =
            loadData.receiver.street +
            ', ' +
            loadData.receiver.city +
            ', ' +
            loadData.receiver.state +
            ' ' +
            loadData.receiver.zip;
        const shipperCoordinates = await getGeocoding(shipperAddress);
        const receiverCoordinates = await getGeocoding(receiverAddress);
        const stopsCoordinates = await Promise.all(
            loadData.stops && loadData.stops.length > 0
                ? loadData.stops.map((stop) => {
                      const stopAddress = stop.street + ', ' + stop.city + ', ' + stop.state + ' ' + stop.zip;
                      return getGeocoding(stopAddress);
                  })
                : [],
        );

        const { routeEncoded, distanceMiles, durationHours } = await getRouteForCoords([
            [shipperCoordinates.longitude, shipperCoordinates.latitude],
            ...stopsCoordinates.map((stop) => [stop.longitude, stop.latitude]),
            [receiverCoordinates.longitude, receiverCoordinates.latitude],
        ]);

        loadData.shipper = {
            ...loadData.shipper,
            longitude: shipperCoordinates.longitude,
            latitude: shipperCoordinates.latitude,
        };
        loadData.receiver = {
            ...loadData.receiver,
            longitude: receiverCoordinates.longitude,
            latitude: receiverCoordinates.latitude,
        };
        if (loadData.stops && loadData.stops.length > 0) {
            loadData.stops = loadData.stops.map((stop, index) => {
                return {
                    ...stop,
                    longitude: stopsCoordinates[index].longitude,
                    latitude: stopsCoordinates[index].latitude,
                };
            });
        }
        loadData.routeEncoded = routeEncoded;
        loadData.routeDistanceMiles = new Prisma.Decimal(distanceMiles);
        loadData.routeDurationHours = new Prisma.Decimal(durationHours);

        await saveLoadData(loadData);
    };

    const saveLoadData = async (loadData: ExpandedLoad) => {
        try {
            let newLoad;

            if (isEditMode) {
                newLoad = await updateLoad(loadData.id, loadData);
                notify({ title: 'Load updated', message: 'Load updated successfully' });
            } else {
                newLoad = await createLoad(loadData, currentRateconFile);
                notify({ title: 'New load created', message: 'New load created successfully' });
            }
            //setLoading(false);
            setLoadSubmitting(false);
            // Redirect to load page
            router.push(`/loads/${newLoad.id}`);
        } catch (error) {
            //setLoading(false);
            setLoadSubmitting(false);
            notify({
                title: `Error ${isEditMode ? 'updating' : 'saving'} load`,
                message: `${error.message}`,
                type: 'error',
            });
        }
    };

    const handleAIError = () => {
        setCurrentRateconFile(null);
        setLoading(false);
        setLoadSubmitting(false);
        setIsRetrying(false);
        setAiProgress(0);
        setAiProgressStage('');
        setIsProcessing(false);
    };

    // Separate error handler for PDF processing that doesn't affect load submission state
    const handlePDFProcessingError = () => {
        setCurrentRateconFile(null);
        setLoading(false);
        setIsRetrying(false);
        setAiProgress(0);
        setAiProgressStage('');
        setIsProcessing(false);
    };

    // Helper function to generate standardized filename for PDFs
    const generateRateconFilename = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        return `ratecon-${year}${month}${day}${hours}${minutes}${seconds}.pdf`;
    };

    const handleFileUpload = async (file: File) => {
        if (!file) {
            return;
        }

        // Rename PDF files to standardized format
        let processedFile = file;
        if (isPDF(file)) {
            const newFileName = generateRateconFilename();
            processedFile = new File([file], newFileName, { type: file.type });
        }

        // Reset form and state if not in edit mode
        if (!isEditMode) {
            formHook.reset({
                customer: null,
                loadNum: null,
                rate: null,
                shipper: {
                    name: null,
                    street: null,
                    city: null,
                    state: null,
                    zip: null,
                },
                receiver: {
                    name: null,
                    street: null,
                    city: null,
                    state: null,
                    zip: null,
                },
                stops: [],
            });
        }

        setCurrentRateconFile(processedFile);
        setLoading(true);
        setIsRetrying(false);
        setIsProcessing(true);

        // Set up progress stages for PDF processing
        progressTracker.current?.setStages([
            { name: 'Validating PDF structure', progress: 5, duration: 500 },
            { name: 'Converting document to images', progress: 10, duration: 1500 },
            { name: 'Performing OCR analysis', progress: 25, duration: 3000 },
            { name: 'Loading customer data', progress: 5, duration: 500 },
            { name: 'Processing with AI', progress: 40, duration: 4000 },
            { name: 'Extracting form data', progress: 10, duration: 1000 },
            { name: 'Finalizing results', progress: 5, duration: 500 },
        ]);

        // Validate PDF metadata
        let metadata: {
            title?: string;
            author?: string;
            subject?: string;
            creator?: string;
            producer?: string;
            creationDate?: Date;
            modificationDate?: Date;
        } = null;
        let numOfPages = 0;
        try {
            progressTracker.current?.updateProgress(0);
            const result = await validatePDFFile(file);
            metadata = result.metadata;
            numOfPages = result.numOfPages;
            progressTracker.current?.nextStage();
        } catch (e) {
            handlePDFProcessingError();
            return;
        }

        // Get base64 encoded file
        let base64File: string;
        try {
            base64File = await getBase64FromFile(file);
            progressTracker.current?.nextStage();
        } catch (error) {
            notify({ title: 'Error', message: 'Error encoding file', type: 'error' });
            handlePDFProcessingError();
            return;
        }

        // Call OCR API
        let ocrResult;
        try {
            const ocrResponse = await fetch(`${apiUrl}/ai/ocr`, {
                method: 'POST',
                body: JSON.stringify({
                    file: base64File,
                }),
            });

            if (!ocrResponse.ok) {
                ocrResult = await ocrResponse.json();
                throw new Error(`${ocrResult?.error || 'Error processing document'}`);
            }

            ocrResult = await ocrResponse.json();
            progressTracker.current?.nextStage();

            if (ocrResult?.annotations?.lines) {
                setOcrLines({
                    lines: ocrResult.annotations.lines,
                    blocks: ocrResult.annotations.blocks,
                    pageProps: ocrResult.pageProps,
                });
            }
        } catch (e) {
            console.error('Error processing document:', e);
            notify({
                title: 'Error',
                message: e?.message || 'Error processing document',
                type: 'error',
            });
            handleAIError();

            // Handle ratecon limit reached, set the file object to pdfviewer
            // Set aiLimitReached to make the user more aware of the limit reached
            if (e?.message.includes('limit reached')) {
                setCurrentRateconFile(file);
                setAiLimitReached(true);
            }
            return;
        }

        // Get customers list
        let customersList: Customer[] = [];
        try {
            progressTracker.current?.nextStage();
            customersList = (await getAllCustomers({ limit: 999, offset: 0 }))?.customers;
            progressTracker.current?.nextStage();
        } catch (error) {
            notify({ title: 'Error', message: 'Error loading customers', type: 'error' });
            handlePDFProcessingError();
            return;
        }

        try {
            const [documentsInBlocks, documentsInLines] = await Promise.all([
                ocrResult.blocks.map((pageText: string, index: number) => ({
                    pageContent: pageText,
                    metadata: {
                        source: 'blob',
                        blobType: file.type,
                        pdf: {
                            metadata: metadata,
                            totalPages: numOfPages,
                        },
                        loc: {
                            pageNumber: index,
                        },
                    },
                })),
                ocrResult.lines.map((pageText: string, index: number) => ({
                    pageContent: pageText,
                    metadata: {
                        source: 'blob',
                        blobType: file.type,
                        pdf: {
                            metadata: metadata,
                            totalPages: numOfPages,
                        },
                        loc: {
                            pageNumber: index,
                        },
                    },
                })),
            ]);

            const aiLoad = await getAILoad(documentsInBlocks, documentsInLines, false, customersList);
            const logisticsCompany = aiLoad?.logistics_company;

            // Move to extraction stage
            progressTracker.current?.nextStage();

            // Only apply AI output if not in edit mode or user confirms
            if (!isEditMode || confirm('Do you want to replace your current data with the extracted information?')) {
                applyAIOutputToForm(aiLoad);
                // Handle customer matching
                handleCustomerMatching(logisticsCompany, customersList, aiLoad);
            }

            // Move to finalization stage
            progressTracker.current?.nextStage();
        } catch (e) {
            notify({ title: 'Error', message: e?.message || 'Error processing document', type: 'error' });
            handleAIError();
            return;
        }

        setLoading(false);
        setIsRetrying(false);
        setIsProcessing(false);
        progressTracker.current?.complete();
    };

    const validatePDFFile = async (file: File): Promise<{ metadata: any; numOfPages: number }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = async () => {
                try {
                    const arrayBuffer = reader.result as ArrayBuffer;
                    const byteArray = new Uint8Array(arrayBuffer);
                    const { totalPages, metadata: pdfMetaData } = await calcPdfPageCount(byteArray);

                    if (totalPages < 1) {
                        notify({
                            title: 'Error',
                            message: 'PDF file must contain at least 1 page',
                            type: 'error',
                        });
                        reject(new Error('Invalid page count'));
                        return;
                    } else if (totalPages > 8) {
                        notify({
                            title: 'Error',
                            message: 'PDF file must contain no more than 8 pages',
                            type: 'error',
                        });
                        reject(new Error('Too many pages'));
                        return;
                    }

                    resolve({ metadata: pdfMetaData, numOfPages: totalPages });
                } catch (error) {
                    console.error('PDF validation error:', error);
                    notify({
                        title: 'PDF Error',
                        message: error.message || 'Unable to process PDF file',
                        type: 'error',
                    });
                    reject(error);
                }
            };
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                notify({
                    title: 'File Error',
                    message: 'Unable to read PDF file',
                    type: 'error',
                });
                reject(new Error('Failed to read file'));
            };
        });
    };

    const getBase64FromFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                if (reader.result) {
                    const base64String = (reader.result as string).replace(/^data:.+;base64,/, '');
                    resolve(base64String);
                }
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleCustomerMatching = (logisticsCompany: string, customersList: Customer[], aiLoad?: AILoad) => {
        if (!logisticsCompany || !customersList) {
            return;
        }

        formHook.setValue('customer', null);

        const customerNames = customersList.map((customer) => customer.name);
        const matchedIndex = fuzzySearch(logisticsCompany, customerNames);

        if (matchedIndex === -1) {
            setPrefillName(logisticsCompany);
            setShowMissingCustomerLabel(true);
            setOpenAddCustomer(true);
            // Store extracted customer details for pre-filling the form
            if (aiLoad?.customer_details) {
                setExtractedCustomerDetails(aiLoad.customer_details);
            }
        } else {
            formHook.setValue('customer', customersList[matchedIndex]);
        }
    };

    const getAILoad = async (
        documentsInBlocks: any[],
        documentsInLines: any[],
        isRetry = false,
        customersList?: Customer[],
    ): Promise<AILoad> => {
        const response = await fetch(`${apiUrl}/ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documents: isRetry ? documentsInLines : documentsInBlocks,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        let aiLoad: AILoad = null;
        try {
            // Try to extract JSON from code fence if present
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                aiLoad = JSON.parse(jsonMatch[1]);
            } else {
                aiLoad = JSON.parse(text);
            }
        } catch (error) {
            console.error('Error parsing JSON:', error);
            throw new Error('Failed to parse document response');
        }

        if (isRetry) {
            return aiLoad;
        }

        const stops = aiLoad?.stops || [];
        const needRetryOnStops =
            stops.length === 0 ||
            stops.some(
                (stop) => !stop?.name || !stop?.address?.street || !stop?.address?.city || !stop?.address?.state,
            );

        if (!aiLoad?.logistics_company || !aiLoad?.load_number || needRetryOnStops) {
            setIsRetrying(true);
            setAiProgressStage('Fine tuning results');
            setAiProgress(10);
            // Retry with line-by-line data
            return getAILoad(documentsInBlocks, documentsInLines, true, customersList);
        }

        // Update the form all at once
        applyAIOutputToForm(aiLoad);
        return aiLoad;
    };

    const postProcessAILoad = (load: AILoad) => {
        if (load.rate) {
            load.rate = convertRateToNumber(load.rate);
        }

        if (load.stops) {
            load.stops.forEach((stop) => {
                if (stop.time) {
                    stop.time = addColonToTimeString(stop.time);
                }

                // Trim whitespace for every string value
                Object.keys(stop).forEach((key) => {
                    if (typeof stop[key] === 'string') {
                        stop[key] = stop[key].trim();
                    }
                });

                // Trim whitespace from address values
                if (stop.address) {
                    Object.keys(stop.address).forEach((key) => {
                        if (typeof stop.address[key] === 'string') {
                            stop.address[key] = stop.address[key].trim();
                        }
                    });
                }
            });
        }

        // If po_numbers, pickup_numbers, or reference_numbers are strings, add them to an array
        if (load.stops) {
            load.stops.forEach((stop) => {
                if (typeof stop.po_numbers === 'string') {
                    stop.po_numbers = [stop.po_numbers];
                }
                if (typeof stop.pickup_numbers === 'string') {
                    stop.pickup_numbers = [stop.pickup_numbers];
                }
                if (typeof stop.reference_numbers === 'string') {
                    stop.reference_numbers = [stop.reference_numbers];
                }
            });
        }
    };

    const applyAIOutputToForm = (load: AILoad) => {
        if (!load) {
            return;
        }

        postProcessAILoad(load);

        // Reset entire form
        formHook.reset({
            ...(isEditMode ? { id: formHook.getValues('id') } : {}),
            customer: null,
            loadNum: null,
            rate: null,
            shipper: {
                name: null,
                street: null,
                city: null,
                state: null,
                zip: null,
                date: null,
                time: null,
                poNumbers: null,
                pickUpNumbers: null,
                referenceNumbers: null,
            },
            receiver: {
                name: null,
                street: null,
                city: null,
                state: null,
                zip: null,
                date: null,
                time: null,
                poNumbers: null,
                pickUpNumbers: null,
                referenceNumbers: null,
            },
            stops: [],
        });

        // Remove all stops
        if (stopsFieldArray.fields.length > 0) {
            stopsFieldArray.fields.forEach((_, index) => {
                stopsFieldArray.remove(index);
            });
        }

        formHook.setValue('loadNum', load.load_number);
        formHook.setValue('rate', load.rate ? new Prisma.Decimal(load.rate) : null);

        // Select first PU stop as shipper
        const shipperStop = load.stops.find((stop) => stop.type === 'PU');
        if (shipperStop) {
            formHook.setValue('shipper.name', shipperStop.name);
            formHook.setValue('shipper.street', shipperStop.address?.street || null);
            formHook.setValue('shipper.city', shipperStop.address?.city || null);
            formHook.setValue('shipper.state', shipperStop.address?.state || null);
            formHook.setValue('shipper.zip', shipperStop.address?.zip || null);
            if (shipperStop.address?.country) {
                formHook.setValue('shipper.country', shipperStop.address?.country || null);
            }
            formHook.setValue('shipper.date', startOfDay(parseDate(shipperStop.date)));

            // Convert AI time string to TimeRangeValue format and back to string for storage
            if (shipperStop.time) {
                const shipperTimeRange = convertAITimeToTimeRange(shipperStop.time);
                const timeString = shipperTimeRange.isRange
                    ? `${shipperTimeRange.startTime}-${shipperTimeRange.endTime}`
                    : shipperTimeRange.startTime;
                formHook.setValue('shipper.time', timeString);
            } else {
                formHook.setValue('shipper.time', null);
            }

            formHook.setValue('shipper.poNumbers', shipperStop.po_numbers?.join(', ') || null);
            formHook.setValue('shipper.pickUpNumbers', shipperStop.pickup_numbers?.join(', ') || null);
            formHook.setValue('shipper.referenceNumbers', shipperStop.reference_numbers?.join(', ') || null);
        }

        // Select last SO stop as receiver
        const receiverStop = [...load.stops].reverse().find((stop) => stop.type === 'SO');
        if (receiverStop) {
            formHook.setValue('receiver.name', receiverStop.name);
            formHook.setValue('receiver.street', receiverStop.address?.street || null);
            formHook.setValue('receiver.city', receiverStop.address?.city || null);
            formHook.setValue('receiver.state', receiverStop.address?.state || null);
            formHook.setValue('receiver.zip', receiverStop.address?.zip || null);
            if (receiverStop.address?.country) {
                formHook.setValue('receiver.country', receiverStop.address?.country || null);
            }
            formHook.setValue('receiver.date', startOfDay(parseDate(receiverStop.date)));

            // Convert AI time string to TimeRangeValue format and back to string for storage
            if (receiverStop.time) {
                const receiverTimeRange = convertAITimeToTimeRange(receiverStop.time);
                const timeString = receiverTimeRange.isRange
                    ? `${receiverTimeRange.startTime}-${receiverTimeRange.endTime}`
                    : receiverTimeRange.startTime;
                formHook.setValue('receiver.time', timeString);
            } else {
                formHook.setValue('receiver.time', null);
            }

            formHook.setValue('receiver.poNumbers', receiverStop.po_numbers?.join(', ') || null);
            formHook.setValue('receiver.pickUpNumbers', receiverStop.pickup_numbers?.join(', ') || null);
            formHook.setValue('receiver.referenceNumbers', receiverStop.reference_numbers?.join(', ') || null);
        }

        // Select all stops in between as stops (filter out shipperStop and receiverStop from list by stop.name)
        const stops = load.stops.filter((stop) => stop.name !== shipperStop.name && stop.name !== receiverStop.name);
        stops.forEach((stop, index) => {
            // Convert AI time string to TimeRangeValue format and back to string for storage
            let timeString = null;
            if (stop.time) {
                const stopTimeRange = convertAITimeToTimeRange(stop.time);
                timeString = stopTimeRange.isRange
                    ? `${stopTimeRange.startTime}-${stopTimeRange.endTime}`
                    : stopTimeRange.startTime;
            }

            stopsFieldArray.append({
                id: null,
                type: LoadStopType.STOP,
                name: stop.name,
                street: stop.address?.street || null,
                city: stop.address?.city || null,
                state: stop.address?.state || null,
                zip: stop.address?.zip || null,
                ...(stop.address?.country && { country: stop.address?.country || null }),
                date: startOfDay(parseDate(stop.date)),
                time: timeString,
                stopIndex: index,
                longitude: null,
                latitude: null,
                poNumbers: stop.po_numbers?.join(', ') || null,
                pickUpNumbers: stop.pickup_numbers?.join(', ') || null,
                referenceNumbers: stop.reference_numbers?.join(', ') || null,
            });
        });
    };

    const mouseHoverOverField = (event: React.MouseEvent<HTMLInputElement>) => {
        const fieldName = (event.target as HTMLInputElement).name;
        const fieldValue = (event.target as HTMLInputElement).value;

        // Early return for no OCR data
        if (!ocrLines?.lines || ocrLines.lines.length === 0) {
            return;
        }

        // Highlight field on hover
        event.currentTarget.style.backgroundColor = '#f0f9ff';
        event.currentTarget.style.borderColor = '#3b82f6';

        // Safely handle field value - it might be undefined, null, or an object for TimeRangeSelector
        const searchValue = fieldValue && typeof fieldValue === 'string' ? fieldValue.trim() : '';
        const isDateField = fieldName?.includes('date');
        const isTimeField = fieldName?.includes('time');

        // Early return if fieldName is undefined
        if (!fieldName) {
            return;
        }

        // Determine field context
        const getFieldContext = (fieldName: string) => {
            if (!fieldName) {
                return { stopType: 'unknown', locationKey: null };
            }
            if (fieldName.includes('shipper')) {
                return { stopType: 'pickup', locationKey: 'shipper' };
            }
            if (fieldName.includes('receiver')) {
                return { stopType: 'dropoff', locationKey: 'receiver' };
            }
            const stopMatch = fieldName.match(/stops\[(\d+)\]/);
            if (stopMatch) {
                return { stopType: 'stop', locationKey: `stops[${stopMatch[1]}]`, stopIndex: parseInt(stopMatch[1]) };
            }
            return { stopType: 'unknown', locationKey: null };
        };

        const { stopType, locationKey, stopIndex } = getFieldContext(fieldName);

        // Handle date/time fields without values
        if ((isDateField || isTimeField) && !searchValue) {
            const lastDotIndex = fieldName.lastIndexOf('.');
            const fieldPrefix = fieldName.substring(0, lastDotIndex);

            // Build location context
            let locationContext = '';
            let stopTypeContext = '';

            if (stopType === 'pickup' || stopType === 'dropoff') {
                const getValue = (field: string) =>
                    formHook.getValues(`${fieldPrefix}.${field}` as keyof ExpandedLoad)?.toString() || '';

                const locationData = {
                    name: getValue('name'),
                    street: getValue('street'),
                    city: getValue('city'),
                    state: getValue('state'),
                    zip: getValue('zip'),
                };

                const cityStateZip = [locationData.city, locationData.state, locationData.zip]
                    .filter(Boolean)
                    .join(' ');
                locationContext = [locationData.name, locationData.street, cityStateZip].filter(Boolean).join(' ');

                stopTypeContext =
                    stopType === 'pickup'
                        ? 'pickup pick up shipper origin'
                        : 'delivery drop off receiver destination consignee';
            } else if (stopType === 'stop' && stopIndex !== undefined) {
                const stops = (formHook.getValues('stops') as any[]) || [];
                if (stops[stopIndex]) {
                    const stopData = stops[stopIndex];
                    const cityStateZip = [stopData.city, stopData.state, stopData.zip].filter(Boolean).join(' ');
                    locationContext = [stopData.name, stopData.street, cityStateZip].filter(Boolean).join(' ');
                    stopTypeContext = 'stop intermediate';
                }
            }

            if (locationContext) {
                const contextValue = `${locationContext} ${stopTypeContext}`.trim();

                if (isDateField) {
                    // Enhanced date field matching with stop-type specific context

                    // Find location context lines first with enhanced stop-type filtering
                    const locationMatches = OCRMatcher.findBestMatches(locationContext, ocrLines.lines, 'location', 5);

                    // Filter location matches to prefer ones with stop-type specific keywords
                    const contextualLocationMatches = locationMatches.filter((match) => {
                        const lineText = match.line.text.toLowerCase();
                        if (stopType === 'pickup') {
                            // For pickup, look for pickup/shipper related keywords
                            return (
                                /\b(pickup|pick.*up|shipper|origin|sender|from|load|collect)/i.test(lineText) ||
                                !/\b(delivery|deliver|drop.*off|receiver|destination|consignee|to|unload)/i.test(
                                    lineText,
                                )
                            );
                        } else if (stopType === 'dropoff') {
                            // For dropoff/receiver, look for delivery related keywords
                            return (
                                /\b(delivery|deliver|drop.*off|receiver|destination|consignee|to|unload)/i.test(
                                    lineText,
                                ) || !/\b(pickup|pick.*up|shipper|origin|sender|from|load|collect)/i.test(lineText)
                            );
                        }
                        return true; // For stops, include all matches
                    });

                    const finalLocationMatches =
                        contextualLocationMatches.length > 0 ? contextualLocationMatches : locationMatches;

                    if (finalLocationMatches.length > 0) {
                        // Look for date patterns near the location
                        let bestDateMatch = null;
                        let minDistance = Infinity;

                        for (const locationMatch of finalLocationMatches) {
                            // Find all lines with date patterns
                            const dateLines = ocrLines.lines.filter((line) =>
                                OCRMatcher.hasDatePatternPublic(line.text),
                            );

                            // Find closest date to this location
                            for (const dateLine of dateLines) {
                                const distance = OCRMatcher.calculateSpatialDistance(dateLine, locationMatch.line);

                                if (distance < minDistance && distance < 5) {
                                    // Within reasonable distance
                                    minDistance = distance;
                                    bestDateMatch = dateLine;
                                }
                            }
                        }

                        if (bestDateMatch) {
                            setOcrVertices([bestDateMatch.boundingPoly.normalizedVertices]);
                            setOcrVerticesPage(bestDateMatch.pageNumber);
                            return;
                        }
                    }
                }

                if (isTimeField) {
                    // Enhanced time field matching with stop-type specific context

                    // Look for time patterns near location context
                    let bestTimeMatch = null;
                    let highestConfidence = 0;

                    // Find location context lines first with enhanced stop-type filtering
                    const locationMatches = OCRMatcher.findBestMatches(locationContext, ocrLines.lines, 'location', 5);

                    // Filter location matches to prefer ones with stop-type specific keywords
                    const contextualLocationMatches = locationMatches.filter((match) => {
                        const lineText = match.line.text.toLowerCase();
                        if (stopType === 'pickup') {
                            // For pickup, look for pickup/shipper related keywords
                            return (
                                /\b(pickup|pick.*up|shipper|origin|sender|from|load|collect)/i.test(lineText) ||
                                !/\b(delivery|deliver|drop.*off|receiver|destination|consignee|to|unload)/i.test(
                                    lineText,
                                )
                            );
                        } else if (stopType === 'dropoff') {
                            // For dropoff/receiver, look for delivery related keywords
                            return (
                                /\b(delivery|deliver|drop.*off|receiver|destination|consignee|to|unload)/i.test(
                                    lineText,
                                ) || !/\b(pickup|pick.*up|shipper|origin|sender|from|load|collect)/i.test(lineText)
                            );
                        }
                        return true; // For stops, include all matches
                    });

                    const finalLocationMatches =
                        contextualLocationMatches.length > 0 ? contextualLocationMatches : locationMatches;

                    if (finalLocationMatches.length > 0) {
                        for (const locationMatch of finalLocationMatches) {
                            // Look for various time patterns near the location
                            const nearbyLines = ocrLines.lines.filter((line) => {
                                const distance = OCRMatcher.calculateSpatialDistance(line, locationMatch.line);
                                return distance < 3; // Within reasonable distance
                            });

                            for (const line of nearbyLines) {
                                const text = line.text;
                                let confidence = 0;

                                // Check for time range patterns (HH:MM-HH:MM)
                                if (/\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\b/.test(text)) {
                                    confidence = 0.9;
                                }
                                // Check for single time patterns (HH:MM)
                                else if (/\b\d{1,2}:\d{2}(\s*(AM|PM))?\b/i.test(text)) {
                                    confidence = 0.8;
                                }
                                // Check for time words/patterns
                                else if (/\b(hours|hrs|time|between|from|to|until|after|before)\b/i.test(text)) {
                                    confidence = 0.6;
                                }
                                // Check for business hours patterns
                                else if (/\b(business\s+hours|office\s+hours|open|closed)\b/i.test(text)) {
                                    confidence = 0.7;
                                }

                                if (confidence > highestConfidence) {
                                    highestConfidence = confidence;
                                    bestTimeMatch = line;
                                }
                            }
                        }
                    }

                    // Fallback to general contextual match
                    if (!bestTimeMatch) {
                        const timeMatch = OCRMatcher.findContextualMatch('', ocrLines.lines, locationContext, 'time');
                        if (timeMatch && timeMatch.confidence > 0.3) {
                            bestTimeMatch = timeMatch.line;
                        }
                    }

                    if (bestTimeMatch) {
                        setOcrVertices([bestTimeMatch.boundingPoly.normalizedVertices]);
                        setOcrVerticesPage(bestTimeMatch.pageNumber);
                        return;
                    }
                }
            }
        }

        // Exit if no search value
        if (!searchValue) {
            return;
        }

        // Build context value for other fields
        let contextValue = '';

        // Enhanced address field handling with combined city/state/zip search
        if (['city', 'state', 'zip', 'street'].some((name) => fieldName.includes(name))) {
            const lastDotIndex = fieldName.lastIndexOf('.');
            const fieldPrefix = fieldName.substring(0, lastDotIndex);

            const getValue = (field: string) =>
                formHook.getValues(`${fieldPrefix}.${field}` as keyof ExpandedLoad)?.toString() || '';

            const addressComponents = {
                name: getValue('name'),
                street: getValue('street'),
                city: getValue('city'),
                state: getValue('state'),
                zip: getValue('zip'),
            };

            const cityStateZip = [addressComponents.city, addressComponents.state, addressComponents.zip]
                .filter(Boolean)
                .join(' ');

            // Enhanced context building with address anchor detection
            if (fieldName.includes('city') || fieldName.includes('state') || fieldName.includes('zip')) {
                // For city/state/zip, use street address as primary context
                contextValue = [addressComponents.name, addressComponents.street].filter(Boolean).join(' ');

                // Add combined city/state/zip pattern for better matching
                const availableComponents = [
                    addressComponents.city,
                    addressComponents.state,
                    addressComponents.zip,
                ].filter(Boolean);
                if (availableComponents.length > 1) {
                    contextValue += ' ' + availableComponents.join(' ');
                }
            } else if (fieldName.includes('street')) {
                contextValue = [addressComponents.name, cityStateZip].filter(Boolean).join(' ');
            }

            // Add stop type context with enhanced keywords
            if (stopType !== 'unknown') {
                const stopTypeKeywords =
                    stopType === 'pickup'
                        ? 'pickup origin shipper pick-up collection'
                        : stopType === 'dropoff'
                        ? 'delivery destination receiver consignee drop-off unload'
                        : 'stop intermediate waypoint';
                contextValue = `${contextValue} ${stopTypeKeywords}`.trim();
            }
        }

        // Enhanced reference field handling with address-anchored search
        if (['poNumbers', 'pickUpNumbers', 'referenceNumbers'].some((name) => fieldName.includes(name))) {
            const lastDotIndex = fieldName.lastIndexOf('.');
            const fieldPrefix = fieldName.substring(0, lastDotIndex);

            const getValue = (field: string) =>
                formHook.getValues(`${fieldPrefix}.${field}` as keyof ExpandedLoad)?.toString() || '';

            const locationData = {
                name: getValue('name'),
                street: getValue('street'),
                city: getValue('city'),
                state: getValue('state'),
                zip: getValue('zip'),
            };

            const cityStateZip = [locationData.city, locationData.state, locationData.zip].filter(Boolean).join(' ');
            const locationContext = [locationData.name, locationData.street, cityStateZip].filter(Boolean).join(' ');

            // Enhanced stop type context with more specific keywords
            let stopTypeContext = '';
            if (stopType === 'pickup') {
                stopTypeContext = 'pickup pick up shipper origin PU collection load';
            } else if (stopType === 'dropoff') {
                stopTypeContext = 'delivery drop off receiver destination consignee SO unload discharge';
            } else if (stopType === 'stop') {
                stopTypeContext = 'stop intermediate waypoint';
            }

            // Enhanced context with reference-specific keywords
            const referenceKeywords = fieldName.includes('poNumbers')
                ? 'PO purchase order'
                : fieldName.includes('pickUpNumbers')
                ? 'pickup number pick up'
                : 'reference ref number';

            contextValue = `${locationContext} ${stopTypeContext} ${referenceKeywords}`.trim();
        }

        // Enhanced company name handling with address proximity
        if (fieldName.includes('name')) {
            const lastDotIndex = fieldName.lastIndexOf('.');
            const fieldPrefix = fieldName.substring(0, lastDotIndex);

            const getValue = (field: string) =>
                formHook.getValues(`${fieldPrefix}.${field}` as keyof ExpandedLoad)?.toString() || '';

            const locationData = {
                street: getValue('street'),
                city: getValue('city'),
                state: getValue('state'),
                zip: getValue('zip'),
            };

            const cityStateZip = [locationData.city, locationData.state, locationData.zip].filter(Boolean).join(' ');
            contextValue = [locationData.street, cityStateZip].filter(Boolean).join(' ');

            // Enhanced stop type context with company-specific keywords
            if (stopType === 'pickup') {
                contextValue += ' pickup origin shipper sender consignor company facility';
            } else if (stopType === 'dropoff') {
                contextValue += ' delivery destination receiver consignee company facility warehouse';
            } else if (stopType === 'stop') {
                contextValue += ' stop company facility location';
            }
        }

        // Find the best match using optimized OCRMatcher
        let bestMatch = null;

        // Use enhanced date/time pattern matching
        if (isDateField && searchValue) {
            // Enhanced date format detection - handle multiple formats
            let searchDate = null;

            // Try MM/DD/YYYY format
            let dateMatch = searchValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (dateMatch) {
                const [, month, day, year] = dateMatch.map((p) => parseInt(p));
                searchDate = new Date(year, month - 1, day);
            } else {
                // Try DD/MM/YYYY format
                dateMatch = searchValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (dateMatch) {
                    const [, day, month, year] = dateMatch.map((p) => parseInt(p));
                    searchDate = new Date(year, month - 1, day);
                }
            }

            // Try MM-DD-YYYY format
            if (!searchDate) {
                dateMatch = searchValue.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
                if (dateMatch) {
                    const [, month, day, year] = dateMatch.map((p) => parseInt(p));
                    searchDate = new Date(year, month - 1, day);
                }
            }

            // Try YYYY-MM-DD format (ISO)
            if (!searchDate) {
                dateMatch = searchValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                if (dateMatch) {
                    const [, year, month, day] = dateMatch.map((p) => parseInt(p));
                    searchDate = new Date(year, month - 1, day);
                }
            }

            // Try parsing as Date object if it's a valid date string
            if (!searchDate) {
                const testDate = new Date(searchValue);
                if (!isNaN(testDate.getTime())) {
                    searchDate = testDate;
                }
            }

            if (searchDate && !isNaN(searchDate.getTime())) {
                const dateMatches = ocrLines.lines
                    .map((line, index) => {
                        const result = DateTimeFormatter.matchesDatePattern(line.text, searchDate);
                        return {
                            line,
                            ...result,
                        };
                    })
                    .filter((result) => {
                        return result.match && result.confidence > 0.5;
                    })
                    .sort((a, b) => b.confidence - a.confidence);

                if (dateMatches.length > 0) {
                    bestMatch = {
                        line: dateMatches[0].line,
                        confidence: dateMatches[0].confidence,
                        matchType: 'date_pattern',
                    };
                }
            }
        }

        if (!bestMatch && isTimeField && searchValue) {
            // Helper function to convert 24-hour to 12-hour format
            const convertTo12Hour = (time24: string): string => {
                if (!time24 || !time24.includes(':')) return time24;

                const [hours, minutes] = time24.split(':');
                const hour = parseInt(hours, 10);

                if (hour === 0) return `12:${minutes} AM`;
                if (hour < 12) return `${hour}:${minutes} AM`;
                if (hour === 12) return `12:${minutes} PM`;
                return `${hour - 12}:${minutes} PM`;
            };

            // Parse time range or single time using AI time helper
            const timeRangeValue = convertAITimeToTimeRange(searchValue);
            let timeSearchTerms: string[] = [];

            if (timeRangeValue.isRange && timeRangeValue.endTime) {
                // For time ranges, search for multiple variations
                timeSearchTerms = [
                    // Original format
                    searchValue,
                    // Standard range format
                    `${timeRangeValue.startTime}-${timeRangeValue.endTime}`,
                    // Range with spaces
                    `${timeRangeValue.startTime} - ${timeRangeValue.endTime}`,
                    // Individual times
                    timeRangeValue.startTime,
                    timeRangeValue.endTime,
                    // 12-hour format variations
                    convertTo12Hour(timeRangeValue.startTime),
                    convertTo12Hour(timeRangeValue.endTime),
                    `${convertTo12Hour(timeRangeValue.startTime)} - ${convertTo12Hour(timeRangeValue.endTime)}`,
                    // Common range patterns
                    `${timeRangeValue.startTime} to ${timeRangeValue.endTime}`,
                    `between ${timeRangeValue.startTime} and ${timeRangeValue.endTime}`,
                    // Without colons
                    `${timeRangeValue.startTime.replace(':', '')}-${timeRangeValue.endTime.replace(':', '')}`,
                ];
            } else {
                // For single times, search for variations
                timeSearchTerms = [
                    searchValue,
                    timeRangeValue.startTime,
                    convertTo12Hour(timeRangeValue.startTime),
                    timeRangeValue.startTime.replace(':', ''), // Without colon
                ];
            }

            // Remove duplicates and filter out empty strings
            const uniqueTerms = new Set(timeSearchTerms);
            timeSearchTerms = Array.from(uniqueTerms).filter(Boolean);

            let highestConfidence = 0;
            let bestTimeMatch = null;

            // Search for each time variation
            for (const timeSearchTerm of timeSearchTerms) {
                const timeMatches = ocrLines.lines
                    .map((line) => ({
                        line,
                        ...DateTimeFormatter.matchesTimePattern(line.text, timeSearchTerm),
                    }))
                    .filter((result) => result.match && result.confidence > 0.3)
                    .sort((a, b) => b.confidence - a.confidence);

                if (timeMatches.length > 0 && timeMatches[0].confidence > highestConfidence) {
                    highestConfidence = timeMatches[0].confidence;
                    bestTimeMatch = {
                        line: timeMatches[0].line,
                        confidence: timeMatches[0].confidence,
                        matchType: 'time_pattern',
                    };
                }
            }

            if (bestTimeMatch) {
                bestMatch = bestTimeMatch;
            }
        }

        // Use contextual matching with optimized OCRMatcher
        if (!bestMatch) {
            bestMatch = OCRMatcher.findContextualMatch(searchValue, ocrLines.lines, contextValue, fieldName);
        }

        // Enhanced fallback for company names
        if (!bestMatch && fieldName.includes('name') && searchValue) {
            const enhancedLocationMatches = ocrLines.lines
                .filter((line) => {
                    const normalizedLine = line.text
                        .replace(/[^a-zA-Z0-9\s]/g, '')
                        .toLowerCase()
                        .trim();
                    const normalizedSearch = searchValue
                        .replace(/[^a-zA-Z0-9\s]/g, '')
                        .toLowerCase()
                        .trim();

                    if (!normalizedLine.includes(normalizedSearch)) return false;

                    const hasAddressInfo =
                        /\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|way|blvd|boulevard)\b/i.test(
                            line.text,
                        ) ||
                        /\b\d{5}(-\d{4})?\b/.test(line.text) ||
                        /\b[A-Z]{2}\s+\d{5}\b/.test(line.text) ||
                        (/\b[A-Z]{2}\b/.test(line.text) && /\b\d+\b/.test(line.text));

                    return hasAddressInfo;
                })
                .map((line) => ({
                    line,
                    confidence: 0.85,
                    matchType: 'enhanced_location',
                }));

            if (enhancedLocationMatches.length > 0) {
                bestMatch = enhancedLocationMatches[0];
            }
        }

        // Display result
        if (bestMatch && bestMatch.confidence > 0.2) {
            setOcrVertices([bestMatch.line.boundingPoly.normalizedVertices]);
            setOcrVerticesPage(bestMatch.line.pageNumber);
        } else {
            // Fallback to legacy matching
            const legacyMatch = findLegacyMatch(searchValue);
            if (legacyMatch) {
                setOcrVertices([legacyMatch.boundingPoly.normalizedVertices]);
                setOcrVerticesPage(legacyMatch.pageNumber);
            }
        }
    };

    // Simplified legacy matching fallback
    const findLegacyMatch = (searchValue: string): Line | null => {
        if (!searchValue || !ocrLines?.lines) return null;

        const normalizedSearch = searchValue.toLowerCase().trim();

        for (const line of ocrLines.lines) {
            const normalizedLine = line.text.toLowerCase();
            if (normalizedLine.includes(normalizedSearch)) {
                return line;
            }
        }

        return null;
    };
    const mouseHoverOverFieldExited = (event: React.MouseEvent<HTMLInputElement>) => {
        // Reset the field styling
        event.currentTarget.style.backgroundColor = '';
        event.currentTarget.style.borderColor = '';

        // Reset the vertices and page number
        setOcrVertices(null);
        setOcrVerticesPage(null);
    };

    const resetForm = () => {
        // Reset the form fields
        formHook.reset({
            ...(isEditMode ? { id: formHook.getValues('id') } : {}),
            customer: null,
            loadNum: null,
            rate: null,
            shipper: {
                name: null,
                street: null,
                city: null,
                state: null,
                zip: null,
                date: null,
                time: null,
                poNumbers: null,
                pickUpNumbers: null,
                referenceNumbers: null,
            },
            receiver: {
                name: null,
                street: null,
                city: null,
                state: null,
                zip: null,
                date: null,
                time: null,
                poNumbers: null,
                pickUpNumbers: null,
                referenceNumbers: null,
            },
            stops: [],
        });

        // Remove the rate confirmation file
        setCurrentRateconFile(null);

        // Reset other state
        setOcrVertices(null);
        setOcrVerticesPage(null);
        setAiProgress(0);
        setAiProgressStage('');
        setIsProcessing(false);
        setIsProcessingText(false);
        setIsProcessingImages(false);
        setIsRetrying(false);
        setAiLimitReached(false);
        setExtractedCustomerDetails(null);
        setOpenAddCustomer(false);
        setShowMissingCustomerLabel(false);
        setPrefillName(null);
    };

    return (
        <Layout
            smHeaderComponent={
                <h1 className="text-xl font-semibold text-gray-900">{isEditMode ? 'Edit Load' : 'Create New Load'}</h1>
            }
        >
            {loadSubmitting && !isProcessingText && !isProcessingImages && !isProcessing && (
                <LoadingOverlay message={isEditMode ? 'Updating load...' : 'Creating load...'} />
            )}
            <div className="max-w-[1980px] w-full mx-auto px-3 sm:px-4 lg:px-8 py-4 md:py-6">
                <BreadCrumb
                    className="mb-4 md:mb-6"
                    paths={[
                        {
                            label: 'Loads',
                            href: '/loads',
                        },
                        {
                            label: isEditMode ? 'Edit Load' : 'Create New Load',
                        },
                    ]}
                />

                <div className="relative bg-white flex flex-col gap-3 mb-4 md:mb-6 py-2">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                        {isEditMode ? 'Edit Load' : 'Create New Load'}
                    </h1>
                    {/*
                    <div className="flex space-x-3 ">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150"
                        >
                            <ArrowPathIcon className="h-4 w-4 mr-2" />
                            Reset Form
                        </button>
                        <button
                            type="submit"
                            form="load-form"
                            className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-lg shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 ${
                                loading ? 'opacity-75 cursor-not-allowed' : ''
                            }`}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <svg
                                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                        ></path>
                                    </svg>
                                    {isEditMode ? 'Updating...' : 'Creating...'}
                                </>
                            ) : (
                                <>{isEditMode ? 'Update Load' : 'Create Load'}</>
                            )}
                        </button>
                    </div> */}
                </div>

                {!isProPlan && !isLoadingCarrier && (
                    <div
                        className={`mb-4 md:mb-6 p-3 md:p-4 border rounded-lg ${
                            aiLimitReached ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                        }`}
                    >
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <ExclamationCircleIcon
                                    className={`h-5 w-5 ${aiLimitReached ? 'text-red-400' : 'text-blue-400'}`}
                                    aria-hidden="true"
                                />
                            </div>
                            <div className="ml-3 flex-1 space-y-2 md:space-y-0 md:flex md:justify-between md:items-center">
                                <p className={`text-sm ${aiLimitReached ? 'text-red-700' : 'text-blue-700'}`}>
                                    {aiLimitReached
                                        ? 'AI load import limit reached. Unlock the speed + accuracy of AI by upgrading to Pro.'
                                        : 'Your plan has limited AI document processing. Upgrade to Pro for unlimited AI imports.'}
                                </p>
                                <div className="md:ml-6">
                                    <Link
                                        href="/billing"
                                        className={`inline-flex items-center whitespace-nowrap font-medium text-sm ${
                                            aiLimitReached
                                                ? 'text-red-700 hover:text-red-600'
                                                : 'text-blue-700 hover:text-blue-600'
                                        }`}
                                    >
                                        Upgrade Plan
                                        <span aria-hidden="true"> &rarr;</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-3 md:gap-4 lg:gap-6 flex-col xl:flex-row">
                    {/* Left side - PDF upload/viewer */}
                    <div
                        className={`${
                            currentRateconFile ? 'w-full xl:w-[55%] 2xl:w-[55%]' : 'w-full xl:w-1/3 2xl:w-1/4'
                        } transition-all duration-300`}
                    >
                        {aiProgress > 0 && (
                            <div className="bg-white p-3 md:p-4 border border-gray-200 rounded-lg mb-3 md:mb-4">
                                <div className="flex items-center mb-2">
                                    <div className={`mr-2 md:mr-3 ${isRetrying ? 'text-amber-500' : 'text-blue-500'}`}>
                                        <DocumentMagnifyingGlassIcon className="h-4 w-4 md:h-5 md:w-5 animate-pulse" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className={`font-medium text-xs md:text-sm ${
                                                isRetrying ? 'text-amber-700' : 'text-blue-700'
                                            }`}
                                        >
                                            {isRetrying ? 'Fine tuning results' : aiProgressStage || 'Reading Document'}
                                        </h3>
                                        <p className="text-xs text-gray-500 truncate">
                                            {isRetrying
                                                ? 'Enhancing data extraction accuracy...'
                                                : aiProgressStage
                                                ? `${aiProgressStage}...`
                                                : 'Extracting load information from your document...'}
                                        </p>
                                    </div>
                                    <div className="ml-2 text-xs font-medium text-gray-500 whitespace-nowrap">
                                        {Math.round(aiProgress)}%
                                    </div>
                                </div>

                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ease-out ${
                                            isRetrying ? 'bg-amber-500' : 'bg-blue-500'
                                        }`}
                                        style={{ width: `${aiProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {!currentRateconFile ? (
                            <div
                                className={`sticky top-4 bg-white border border-gray-200 rounded-lg overflow-hidden ${
                                    isProcessingText || isProcessingImages ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                <div className="p-3 md:p-4 bg-gray-50 border-b border-gray-200">
                                    <h2 className="text-base md:text-lg font-medium text-gray-900">
                                        Rate Confirmation
                                    </h2>
                                    <p className="mt-1 text-xs md:text-sm text-gray-500">
                                        Upload a document or paste text to automatically extract load information
                                    </p>
                                </div>

                                {/* Upload Options Tabs */}
                                <div className="border-b border-gray-200">
                                    <nav className="-mb-px flex w-full">
                                        <button
                                            type="button"
                                            onClick={() => setUploadMode('file')}
                                            disabled={isProcessingText || isProcessingImages}
                                            className={`flex-1 py-3 px-2 md:px-4 border-b-2 font-medium text-xs md:text-sm text-center min-h-[44px] flex items-center justify-center transition-colors duration-200 ${
                                                uploadMode === 'file'
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } ${
                                                isProcessingText || isProcessingImages
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : ''
                                            }`}
                                        >
                                            Upload File
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUploadMode('text')}
                                            disabled={isProcessingText || isProcessingImages}
                                            className={`flex-1 py-3 px-2 md:px-4 border-b-2 font-medium text-xs md:text-sm text-center min-h-[44px] flex items-center justify-center transition-colors duration-200 ${
                                                uploadMode === 'text'
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            } ${
                                                isProcessingText || isProcessingImages
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : ''
                                            }`}
                                        >
                                            Paste Text
                                        </button>
                                    </nav>
                                </div>

                                {/* Tab Content */}
                                {uploadMode === 'file' ? (
                                    /* File Upload Area */
                                    <div
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        className={`flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 transition-all duration-200 ${
                                            dragActive ? 'bg-blue-50 border-blue-200' : 'bg-white'
                                        }`}
                                    >
                                        <div className="text-center w-full max-w-sm">
                                            <div
                                                className={`mx-auto h-12 w-12 md:h-16 md:w-16 rounded-full flex items-center justify-center mb-3 md:mb-4 transition-colors duration-200 ${
                                                    dragActive ? 'bg-blue-100' : 'bg-gray-100'
                                                }`}
                                            >
                                                <svg
                                                    className={`h-6 w-6 md:h-8 md:w-8 transition-colors duration-200 ${
                                                        dragActive ? 'text-blue-500' : 'text-gray-400'
                                                    }`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                    />
                                                </svg>
                                            </div>
                                            <h3
                                                className={`text-base md:text-lg font-medium mb-2 transition-colors duration-200 ${
                                                    dragActive ? 'text-blue-700' : 'text-gray-900'
                                                }`}
                                            >
                                                {dragActive ? 'Drop your files here' : 'Upload documents'}
                                            </h3>
                                            <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6">
                                                Drag and drop files here, or click to browse
                                            </p>

                                            <div className="space-y-3 md:space-y-4">
                                                <button
                                                    type="button"
                                                    disabled={isProcessingText || isProcessingImages}
                                                    className={`w-full sm:w-auto inline-flex items-center justify-center px-4 md:px-6 py-3 md:py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 shadow-sm min-h-[44px] ${
                                                        isProcessingText || isProcessingImages
                                                            ? 'opacity-50 cursor-not-allowed'
                                                            : ''
                                                    }`}
                                                    onClick={() =>
                                                        !(isProcessingText || isProcessingImages) &&
                                                        document.getElementById('file-upload').click()
                                                    }
                                                >
                                                    <ArrowUpTrayIcon className="mr-2 h-5 w-5" />
                                                    Choose Files
                                                </button>

                                                <input
                                                    id="file-upload"
                                                    type="file"
                                                    className="hidden"
                                                    accept="application/pdf,image/jpeg,image/jpg,image/png"
                                                    multiple
                                                    disabled={isProcessingText || isProcessingImages}
                                                    onChange={handleFileInput}
                                                />

                                                {/* File limits info */}
                                                <div className="text-center text-xs text-gray-500 space-y-1">
                                                    <p>1 PDF (auto-processes) or up to 3 images</p>
                                                    <p>Total size limit: 10MB</p>
                                                </div>

                                                {/* Supported formats */}
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500 mb-2">Supported formats:</p>
                                                    <div className="flex flex-wrap justify-center gap-2">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            PDF
                                                        </span>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            JPEG
                                                        </span>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            PNG
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Selected Images Display */}
                                                {selectedImages.length > 0 && (
                                                    <div className="mt-4 md:mt-6 p-3 md:p-4 bg-gray-50 rounded-lg">
                                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                                                            <h4 className="text-sm font-medium text-gray-900">
                                                                Selected Images ({selectedImages.length}/{MAX_IMAGES})
                                                            </h4>
                                                            {canProcessImages &&
                                                                !isProcessingText &&
                                                                !isProcessingImages && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={processImages}
                                                                        className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 min-h-[36px]"
                                                                    >
                                                                        Process Images
                                                                    </button>
                                                                )}
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {selectedImages.map((file, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="relative bg-white p-3 rounded border"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-1 min-w-0 pr-2">
                                                                            <p className="text-xs font-medium text-gray-900 truncate">
                                                                                {file.name}
                                                                            </p>
                                                                            <p className="text-xs text-gray-500">
                                                                                {Math.round(file.size / 1024)} KB
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeImage(index)}
                                                                            disabled={
                                                                                isProcessingText || isProcessingImages
                                                                            }
                                                                            className={`flex-shrink-0 p-2 text-red-400 hover:text-red-600 min-h-[40px] min-w-[40px] flex items-center justify-center ${
                                                                                isProcessingText || isProcessingImages
                                                                                    ? 'opacity-50 cursor-not-allowed'
                                                                                    : ''
                                                                            }`}
                                                                        >
                                                                            <TrashIcon className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Text Paste Area */
                                    <div className="p-4 md:p-6">
                                        <div className="text-center mb-4 max-w-sm mx-auto">
                                            <div className="mx-auto h-12 w-12 md:h-16 md:w-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
                                                <svg
                                                    className="h-6 w-6 md:h-8 md:w-8 text-gray-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                            </div>
                                            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
                                                Paste rate confirmation text
                                            </h3>
                                            <p className="text-xs md:text-sm text-gray-500 mb-4">
                                                Copy and paste text from your rate confirmation document
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <textarea
                                                value={pastedText}
                                                onChange={(e) => {
                                                    const newText = e.target.value;
                                                    if (newText.length <= MAX_TEXT_LENGTH) {
                                                        setPastedText(newText);
                                                    }
                                                }}
                                                disabled={isProcessingText}
                                                placeholder="Paste your rate confirmation text here..."
                                                className={`w-full h-40 md:h-48 px-3 md:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm ${
                                                    isProcessingText ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                                maxLength={MAX_TEXT_LENGTH}
                                            />

                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                                <p
                                                    className={`text-xs order-2 sm:order-1 ${
                                                        pastedText.length > MAX_TEXT_LENGTH * 0.9
                                                            ? 'text-orange-500'
                                                            : 'text-gray-500'
                                                    }`}
                                                >
                                                    {pastedText.length.toLocaleString()} /{' '}
                                                    {MAX_TEXT_LENGTH.toLocaleString()} characters
                                                </p>
                                                <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPastedText('')}
                                                        disabled={!pastedText.trim() || isProcessingText}
                                                        className={`w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] ${
                                                            isProcessingText ? 'opacity-50 cursor-not-allowed' : ''
                                                        }`}
                                                    >
                                                        Clear
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleTextSubmit}
                                                        disabled={
                                                            !pastedText.trim() ||
                                                            pastedText.length > MAX_TEXT_LENGTH ||
                                                            isProcessingText
                                                        }
                                                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                                                    >
                                                        {isProcessingText ? 'Processing...' : 'Process Text'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="block bg-white border border-gray-200 rounded-lg overflow-hidden overflow-y-visible ">
                                <div className=" relative p-3 md:p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between overflow-hidden">
                                    <div className="flex items-center overflow-hidden flex-1 min-w-0">
                                        <PaperClipIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-400 mr-2 flex-shrink-0" />
                                        <span className="font-medium text-gray-700 text-xs md:text-sm truncate">
                                            {currentRateconFile.name} ({Math.round(currentRateconFile.size / 1024)} KB)
                                        </span>
                                    </div>
                                    <div className="flex gap-1 md:gap-2 bg-gray-50 ml-2">
                                        <button
                                            type="button"
                                            className="inline-flex items-center p-1.5 md:p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-[36px] min-h-[36px] justify-center"
                                            onClick={() => document.getElementById('file-upload-replace').click()}
                                            title="Replace file"
                                        >
                                            <ArrowPathIcon className="h-4 w-4 text-gray-500" />
                                            <input
                                                id="file-upload-replace"
                                                type="file"
                                                className="hidden"
                                                accept="application/pdf,image/jpeg,image/jpg,image/png"
                                                multiple
                                                onChange={(e) => {
                                                    const files = e.target.files;
                                                    if (files && files.length > 0) {
                                                        // Apply same naming logic for replace files
                                                        const filesArray = Array.from(files);
                                                        const renamedFiles = filesArray.map((file) => {
                                                            if (isPDF(file)) {
                                                                const newFileName = generateRateconFilename();
                                                                return new File([file], newFileName, {
                                                                    type: file.type,
                                                                });
                                                            }
                                                            return file;
                                                        });

                                                        // Create new FileList with renamed files
                                                        const dataTransfer = new DataTransfer();
                                                        renamedFiles.forEach((file) => dataTransfer.items.add(file));

                                                        // Update the input's files
                                                        const input = e.target as HTMLInputElement;
                                                        Object.defineProperty(input, 'files', {
                                                            value: dataTransfer.files,
                                                            writable: false,
                                                        });

                                                        handleFileInput(e);
                                                    }
                                                }}
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex items-center p-1.5 md:p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-[36px] min-h-[36px] justify-center"
                                            onClick={() => setCurrentRateconFile(null)}
                                            title="Remove file"
                                        >
                                            <TrashIcon className="h-4 w-4 text-gray-500" />
                                        </button>
                                    </div>
                                </div>
                                {/* PDF Viewer Component */}
                                <PDFViewer
                                    fileBlob={currentRateconFile}
                                    scrollToPage={ocrVerticesPage}
                                    ocrVertices={ocrVertices}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right side - Form */}
                    <div
                        className={`${
                            currentRateconFile ? 'w-full xl:w-[45%] 2xl:w-[45%]' : 'w-full xl:w-2/3 2xl:w-3/4'
                        } transition-all duration-300 flex-shrink-0`}
                    >
                        {/* This div makes the form panel sticky and defines its adaptive height. */}
                        {/* LoadForm inside will manage its own height based on content. */}
                        <div
                            className={`sticky top-2 md:top-4 bg-white border border-gray-200 overflow-hidden rounded-lg transition-all duration-500 ${
                                currentRateconFile ? 'xl:h-[85vh] h-full' : 'h-auto min-h-[400px] md:min-h-[600px]'
                            }`}
                        >
                            <form
                                id="load-form"
                                onSubmit={formHook.handleSubmit(submit)}
                                className="h-full transition-all duration-500"
                            >
                                <LoadForm
                                    formHook={formHook}
                                    openAddCustomerFromProp={openAddCustomer}
                                    setOpenAddCustomerFromProp={setOpenAddCustomer}
                                    showMissingCustomerLabel={showMissingCustomerLabel}
                                    setShowMissingCustomerLabel={setShowMissingCustomerLabel}
                                    prefillName={prefillName}
                                    setPrefillName={setPrefillName}
                                    parentStopsFieldArray={stopsFieldArray}
                                    mouseHoverOverField={mouseHoverOverField}
                                    mouseHoverOutField={mouseHoverOverFieldExited}
                                    loading={loading}
                                    onResetForm={resetForm}
                                    isEditMode={isEditMode}
                                    extractedCustomerDetails={extractedCustomerDetails}
                                />
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

CreateLoad.authenticationEnabled = true;

export default CreateLoad;
