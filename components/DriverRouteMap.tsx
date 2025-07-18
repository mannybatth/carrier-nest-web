'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import polyline from '@mapbox/polyline';
import { getRouteForCoords } from '../lib/mapbox/searchGeo';
import { ExpandedDriverAssignment } from '../interfaces/models';
import { AssignmentCard } from './AssignmentCard';

interface DriverRouteMapProps {
    assignments: ExpandedDriverAssignment[];
    emptyMiles: { [key: string]: number };
    onEmptyMilesUpdate?: (emptyMiles: { [key: string]: number }) => void;
    selectedAssignmentId?: string | null; // New prop for selected assignment
    onAssignmentSelect?: (assignmentId: string | null) => void; // Callback for assignment selection
    className?: string;
}

interface MapRoute {
    type: 'assignment' | 'empty';
    assignmentId?: string;
    coordinates: [number, number][];
    distance: number;
    encoded?: string;
}

interface RouteCache {
    [key: string]: {
        encoded: string;
        distance: number;
        timestamp: number;
    };
}

const DriverRouteMap: React.FC<DriverRouteMapProps> = ({
    assignments,
    emptyMiles,
    onEmptyMilesUpdate,
    selectedAssignmentId = null, // Default to null (show all)
    onAssignmentSelect, // Callback for assignment selection
    className = '',
}) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const fullScreenMapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [routes, setRoutes] = useState<MapRoute[]>([]);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
    const [routeCache, setRouteCache] = useState<RouteCache>({});
    const [emptyMilesInput, setEmptyMilesInput] = useState<{ [key: string]: string }>({});

    // Cache duration in milliseconds (24 hours)
    const CACHE_DURATION = 24 * 60 * 60 * 1000;
    const CACHE_KEY = 'driver-route-cache';

    // Check if cached route is still valid
    const isCacheValid = (timestamp: number) => {
        return Date.now() - timestamp < CACHE_DURATION;
    };

    // Load cache from localStorage on component mount
    useEffect(() => {
        try {
            const savedCache = localStorage.getItem(CACHE_KEY);
            if (savedCache) {
                const parsed = JSON.parse(savedCache);
                // Clean up expired entries
                const now = Date.now();
                const validEntries: RouteCache = {};

                Object.entries(parsed).forEach(([key, value]: [string, any]) => {
                    if (isCacheValid(value.timestamp)) {
                        validEntries[key] = value;
                    }
                });

                setRouteCache(validEntries);

                // Save cleaned cache back to localStorage
                if (Object.keys(validEntries).length !== Object.keys(parsed).length) {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(validEntries));
                }
            }
        } catch (error) {
            console.warn('Failed to load route cache:', error);
        }
    }, []);

    // Save cache to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(routeCache));
        } catch (error) {
            console.warn('Failed to save route cache:', error);
        }
    }, [routeCache]);

    // Generate cache key for route coordinates
    const generateCacheKey = (coords: [number, number][]) => {
        return coords.map(([lat, lon]) => `${lat.toFixed(6)},${lon.toFixed(6)}`).join('|');
    };

    // Get route with caching
    const getCachedRoute = async (coords: [number, number][]) => {
        const cacheKey = generateCacheKey(coords);

        // Check if route is in cache and still valid
        if (routeCache[cacheKey] && isCacheValid(routeCache[cacheKey].timestamp)) {
            // console.log('🚀 Using cached route for:', cacheKey.substring(0, 30) + '... (saved API call)');
            return {
                routes: [
                    {
                        routeEncoded: routeCache[cacheKey].encoded,
                        distanceMiles: routeCache[cacheKey].distance,
                    },
                ],
            };
        }

        // Fetch new route from API
        // console.log('🌐 Fetching new route from Mapbox API for:', cacheKey.substring(0, 30) + '...');
        const routeData = await getRouteForCoords(coords);

        // Cache the result if successful
        if (routeData && routeData.routes && routeData.routes.length > 0) {
            const route = routeData.routes[0];
            // console.log('💾 Caching route for future use:', cacheKey.substring(0, 30) + '...');
            setRouteCache((prev) => ({
                ...prev,
                [cacheKey]: {
                    encoded: route.routeEncoded,
                    distance: route.distanceMiles,
                    timestamp: Date.now(),
                },
            }));
        }

        return routeData;
    };

    // Handle route selection
    const handleRouteSelection = (assignmentId: string) => {
        if (selectedRouteId === assignmentId) {
            // Deselect if clicking the same route
            setSelectedRouteId(null);
        } else {
            setSelectedRouteId(assignmentId);
        }
        // Re-display routes with new selection
        if (routes.length > 0) {
            displayRoutes(routes);
        }
    };

    // Effect to redisplay routes when selection changes
    useEffect(() => {
        if (routes.length > 0 && isFullScreen) {
            displayRoutes(routes);
        }
    }, [selectedRouteId, isFullScreen]);

    // Add custom styles for Apple-like popups
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .mapboxgl-popup.apple-popup .mapboxgl-popup-content {
                padding: 0 !important;
                border-radius: 16px !important;
                box-shadow: 0 20px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1) !important;
                border: 1px solid rgba(0,0,0,0.05) !important;
                backdrop-filter: blur(20px) !important;
            }
            .mapboxgl-popup.apple-popup .mapboxgl-popup-tip {
                display: none !important;
            }
            .mapboxgl-popup.apple-popup .mapboxgl-popup-close-button {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Helper function to calculate distance between two points using Haversine formula
    const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 3959; // Earth's radius in miles
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Initialize map
    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/light-v11',
            center: [-98.5795, 39.8283], // Center of US
            zoom: 4,
            attributionControl: false,
            logoPosition: 'bottom-right',
            projection: { name: 'mercator' }, // Disable globe mode
            maxZoom: 18,
            minZoom: 2,
            antialias: true,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
            setIsLoaded(true);
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Update map when assignments or selectedAssignmentId changes
    useEffect(() => {
        if (!map.current || !isLoaded || assignments.length === 0) return;
        updateMapWithAssignments();
    }, [assignments, isLoaded, selectedAssignmentId]);

    // Display routes when routes state changes
    useEffect(() => {
        if (!map.current || !isLoaded || routes.length === 0) {
            /* console.log('Routes useEffect skipped:', {
                mapExists: !!map.current,
                isLoaded,
                routesLength: routes.length,
            }); */
            return;
        }
        // console.log('Displaying routes:', routes.length, routes);
        displayRoutes(routes);
    }, [routes, isLoaded]);

    const updateMapWithAssignments = async () => {
        if (!map.current || assignments.length === 0) return;

        setIsCalculating(true);

        // Clear existing layers and sources
        clearMapLayers();

        // Filter assignments based on selectedAssignmentId
        const assignmentsToProcess = selectedAssignmentId
            ? assignments.filter((assignment) => assignment.id === selectedAssignmentId)
            : assignments;

        // Sort assignments by date
        const sortedAssignments = assignmentsToProcess.sort((a, b) => {
            const dateA = new Date(a.routeLeg.startedAt || a.routeLeg.createdAt);
            const dateB = new Date(b.routeLeg.startedAt || b.routeLeg.createdAt);
            return dateA.getTime() - dateB.getTime();
        });

        const mapRoutes: MapRoute[] = [];
        const newEmptyMiles: { [key: string]: number } = { ...emptyMiles };

        // Process each assignment and calculate routes
        for (let i = 0; i < sortedAssignments.length; i++) {
            const assignment = sortedAssignments[i];
            const routeLocations = assignment.routeLeg.locations;

            /* console.log(
                `Processing assignment ${i + 1} with ${routeLocations.length} locations:`,
                routeLocations.map((loc) => loc.loadStop?.name || loc.location?.name),
            ); */

            // Create route segments between consecutive locations within the assignment
            const allSegmentCoordinates: [number, number][] = [];
            let totalAssignmentDistance = 0;

            for (let j = 0; j < routeLocations.length - 1; j++) {
                const fromLocation = routeLocations[j];
                const toLocation = routeLocations[j + 1];

                const fromLat = fromLocation.loadStop?.latitude || fromLocation.location?.latitude;
                const fromLng = fromLocation.loadStop?.longitude || fromLocation.location?.longitude;
                const toLat = toLocation.loadStop?.latitude || toLocation.location?.latitude;
                const toLng = toLocation.loadStop?.longitude || toLocation.location?.longitude;

                if (fromLat && fromLng && toLat && toLng) {
                    try {
                        /* console.log(
                            `Getting route segment ${j + 1}/${routeLocations.length - 1} for assignment ${i + 1}:`,
                            `${fromLocation.loadStop?.name || fromLocation.location?.name} -> ${
                                toLocation.loadStop?.name || toLocation.location?.name
                            }`,
                        ); */

                        // Get route for this segment
                        const segmentRouteData = await getCachedRoute([
                            [fromLng, fromLat],
                            [toLng, toLat],
                        ]);

                        if (segmentRouteData && segmentRouteData.routes && segmentRouteData.routes.length > 0) {
                            const segmentRoute = segmentRouteData.routes[0];
                            const segmentDecoded = polyline.decode(segmentRoute.routeEncoded);
                            const segmentCoordinates: [number, number][] = segmentDecoded.map((coord: number[]) => [
                                coord[1],
                                coord[0],
                            ]);

                            // Add to overall assignment route (avoid duplicate points)
                            if (j === 0) {
                                allSegmentCoordinates.push(...segmentCoordinates);
                            } else {
                                // Skip first coordinate to avoid duplication with previous segment's end
                                allSegmentCoordinates.push(...segmentCoordinates.slice(1));
                            }

                            totalAssignmentDistance += segmentRoute.distanceMiles; // Already in miles
                            // console.log(`Segment ${j + 1} distance: ${segmentRoute.distanceMiles.toFixed(2)} miles`);
                        } else {
                            // Fallback to straight line for this segment
                            // console.log(`No route data for segment ${j + 1}, using straight line`);
                            const straightLineDistance = calculateHaversineDistance(fromLat, fromLng, toLat, toLng);

                            if (j === 0) {
                                allSegmentCoordinates.push([fromLng, fromLat], [toLng, toLat]);
                            } else {
                                allSegmentCoordinates.push([toLng, toLat]);
                            }

                            totalAssignmentDistance += straightLineDistance;
                        }
                    } catch (error) {
                        console.error(
                            `Error getting route for segment ${j + 1} in assignment ${assignment.id}:`,
                            error,
                        );
                        // Fallback to straight line
                        const straightLineDistance = calculateHaversineDistance(fromLat, fromLng, toLat, toLng);

                        if (j === 0) {
                            allSegmentCoordinates.push([fromLng, fromLat], [toLng, toLat]);
                        } else {
                            allSegmentCoordinates.push([toLng, toLat]);
                        }

                        totalAssignmentDistance += straightLineDistance;
                    }
                } else {
                    console.warn(`Missing coordinates for segment ${j + 1} in assignment ${assignment.id}`);
                }
            }

            // Add the complete assignment route if we have valid coordinates
            if (allSegmentCoordinates.length > 0) {
                /* console.log(
                    `Assignment ${i + 1} total route: ${
                        allSegmentCoordinates.length
                    } coordinates, ${totalAssignmentDistance.toFixed(2)} miles`,
                ); */

                mapRoutes.push({
                    type: 'assignment',
                    assignmentId: assignment.id,
                    coordinates: allSegmentCoordinates,
                    distance: totalAssignmentDistance,
                    encoded: undefined, // We're building this from multiple segments
                });
            } else {
                console.warn(`No valid coordinates found for assignment ${assignment.id}`);
            }

            // Calculate empty miles to next assignment (only if not filtering to a single assignment)
            if (i < sortedAssignments.length - 1 && !selectedAssignmentId) {
                const nextAssignment = sortedAssignments[i + 1];
                const nextStartLocation = nextAssignment.routeLeg.locations[0];
                const nextStartLat = nextStartLocation.loadStop?.latitude || nextStartLocation.location?.latitude;
                const nextStartLng = nextStartLocation.loadStop?.longitude || nextStartLocation.location?.longitude;

                // Get the last location of current assignment for empty miles calculation
                const currentLastLocation = routeLocations[routeLocations.length - 1];
                const currentEndLat = currentLastLocation.loadStop?.latitude || currentLastLocation.location?.latitude;
                const currentEndLng =
                    currentLastLocation.loadStop?.longitude || currentLastLocation.location?.longitude;

                if (nextStartLat && nextStartLng && currentEndLat && currentEndLng) {
                    try {
                        // Get empty miles route
                        const emptyRouteData = await getCachedRoute([
                            [currentEndLng, currentEndLat],
                            [nextStartLng, nextStartLat],
                        ]);

                        if (emptyRouteData && emptyRouteData.routes && emptyRouteData.routes.length > 0) {
                            const emptyRoute = emptyRouteData.routes[0];
                            const emptyDecoded = polyline.decode(emptyRoute.routeEncoded);
                            const emptyCoordinates: [number, number][] = emptyDecoded.map((coord: number[]) => [
                                coord[1],
                                coord[0],
                            ]);
                            const emptyDistance = emptyRoute.distanceMiles; // Already in miles

                            mapRoutes.push({
                                type: 'empty',
                                coordinates: emptyCoordinates,
                                distance: emptyDistance,
                            });

                            // Update empty miles
                            const emptyMilesKey = `${assignment.id}-to-${nextAssignment.id}`;
                            newEmptyMiles[emptyMilesKey] = Math.round(emptyDistance * 100) / 100;
                        }
                    } catch (error) {
                        console.warn('Could not get route for empty miles, using straight-line distance');
                        // Fall back to straight-line distance
                        const straightLineDistance = calculateHaversineDistance(
                            currentEndLat,
                            currentEndLng,
                            nextStartLat,
                            nextStartLng,
                        );
                        const emptyMilesKey = `${assignment.id}-to-${nextAssignment.id}`;
                        newEmptyMiles[emptyMilesKey] = Math.round(straightLineDistance * 100) / 100;

                        // Add straight line for visualization
                        mapRoutes.push({
                            type: 'empty',
                            coordinates: [
                                [currentEndLng, currentEndLat],
                                [nextStartLng, nextStartLat],
                            ],
                            distance: straightLineDistance,
                        });
                    }
                }
            }
        }

        // console.log('Setting routes:', mapRoutes.length, mapRoutes);
        setRoutes(mapRoutes);

        // Don't automatically update parent with calculated empty miles
        // Only update when user manually changes empty miles values through input fields

        // Add location markers
        addLocationMarkers();

        // Fit map to show all locations
        fitMapToLocations();

        setIsCalculating(false);
    };

    const clearMapLayers = () => {
        if (!map.current) return;

        // Remove existing assignment route layers (individual layers for each assignment)
        for (let i = 0; i < 10; i++) {
            // Support up to 10 assignments
            const layerId = `assignment-route-${i}`;
            const sourceId = `assignment-route-source-${i}`;

            if (map.current.getLayer(layerId)) {
                map.current.removeLayer(layerId);
            }
            if (map.current.getSource(sourceId)) {
                map.current.removeSource(sourceId);
            }
        }

        // Remove empty routes layer
        if (map.current.getLayer('empty-routes')) {
            map.current.removeLayer('empty-routes');
        }
        if (map.current.getSource('empty-routes')) {
            map.current.removeSource('empty-routes');
        }

        // Clear existing markers
        const markers = document.querySelectorAll('.mapboxgl-marker');
        markers.forEach((marker) => marker.remove());
    };

    const clearRouteLayers = () => {
        if (!map.current) return;

        // Remove existing assignment route layers (individual layers for each assignment)
        for (let i = 0; i < 10; i++) {
            // Support up to 10 assignments
            const layerId = `assignment-route-${i}`;
            const sourceId = `assignment-route-source-${i}`;

            if (map.current.getLayer(layerId)) {
                map.current.removeLayer(layerId);
            }
            if (map.current.getSource(sourceId)) {
                map.current.removeSource(sourceId);
            }
        }

        // Remove empty routes layer
        if (map.current.getLayer('empty-routes')) {
            map.current.removeLayer('empty-routes');
        }
        if (map.current.getSource('empty-routes')) {
            map.current.removeSource('empty-routes');
        }
    };

    const displayRoutes = (routes: MapRoute[]) => {
        if (!map.current) return;

        // console.log('displayRoutes called with:', routes.length, routes);

        // Clear existing route layers only
        clearRouteLayers();

        // Color palette for different assignments
        const assignmentColors = [
            '#3b82f6', // Blue
            '#10b981', // Emerald
            '#f59e0b', // Amber
            '#ef4444', // Red
            '#8b5cf6', // Violet
            '#06b6d4', // Cyan
            '#84cc16', // Lime
            '#f97316', // Orange
            '#ec4899', // Pink
            '#6366f1', // Indigo
        ];

        // Filter routes based on selection (only in full-screen mode)
        let routesToDisplay = routes;
        if (isFullScreen && selectedRouteId) {
            routesToDisplay = routes.filter(
                (route) => route.assignmentId === selectedRouteId || route.type === 'empty',
            );
        }

        // Separate assignment and empty routes for processing
        const filteredAssignmentRoutes = routesToDisplay.filter((r) => r.type === 'assignment');
        const filteredEmptyRoutes = routesToDisplay.filter((r) => r.type === 'empty');

        // console.log('Assignment routes:', filteredAssignmentRoutes.length, 'Empty routes:', filteredEmptyRoutes.length);

        // Display each assignment route with a unique color
        filteredAssignmentRoutes.forEach((route, index) => {
            if (!route.coordinates || route.coordinates.length === 0) {
                console.warn('Skipping route with no coordinates:', route);
                return;
            }

            const color = assignmentColors[index % assignmentColors.length];
            const layerId = `assignment-route-${index}`;
            const sourceId = `assignment-route-source-${index}`;

            /* console.log(`Adding assignment route ${index + 1}:`, {
                layerId,
                sourceId,
                color,
                coordinatesCount: route.coordinates.length,
                firstCoord: route.coordinates[0],
                lastCoord: route.coordinates[route.coordinates.length - 1],
            }); */

            try {
                map.current!.addSource(sourceId, {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {
                            assignmentId: route.assignmentId,
                            distance: route.distance,
                            assignmentIndex: index + 1,
                            color: color,
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: route.coordinates,
                        },
                    },
                });

                map.current!.addLayer({
                    id: layerId,
                    type: 'line',
                    source: sourceId,
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                    },
                    paint: {
                        'line-color': color,
                        'line-width': 3,
                        'line-opacity': 0.9,
                    },
                });

                // console.log(`Successfully added assignment route layer: ${layerId}`);
            } catch (error) {
                console.error(`Error adding assignment route ${index}:`, error);
            }

            // Add click event for route details
            map.current!.on('click', layerId, (e) => {
                if (e.features && e.features[0]) {
                    const properties = e.features[0].properties;
                    const assignmentId = properties?.assignmentId;
                    const assignment = assignments.find((a) => a.id === assignmentId);

                    if (assignment) {
                        new mapboxgl.Popup({
                            closeButton: false,
                            closeOnClick: true,
                            className: 'apple-popup',
                            maxWidth: '280px',
                        })
                            .setLngLat(e.lngLat)
                            .setHTML(
                                `
                                <div class="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-black/5">
                                    <div class="flex items-center gap-3 mb-3">
                                        <div class="w-6 h-6 rounded-full flex items-center justify-center" style="background-color: ${color}">
                                            <span class="text-white text-xs font-bold">${
                                                properties?.assignmentIndex
                                            }</span>
                                        </div>
                                        <div>
                                            <h4 class="font-semibold text-gray-900 text-sm">Assignment ${
                                                properties?.assignmentIndex
                                            }</h4>
                                            <p class="text-xs text-gray-500">${assignment.load.refNum}</p>
                                        </div>
                                    </div>
                                    <div class="space-y-2">
                                        <div class="flex justify-between items-center py-1">
                                            <span class="text-xs text-gray-600">Distance</span>
                                            <span class="text-xs font-medium text-gray-900">${properties?.distance?.toFixed(
                                                2,
                                            )} miles</span>
                                        </div>
                                        <div class="flex justify-between items-center py-1">
                                            <span class="text-xs text-gray-600">Rate</span>
                                            <span class="text-xs font-medium text-gray-900">$${
                                                assignment.chargeValue
                                            }/mile</span>
                                        </div>
                                        <div class="mt-3 pt-3 border-t border-gray-200/60">
                                            <div class="flex justify-between items-center">
                                                <span class="text-sm font-medium text-gray-900">Total Pay</span>
                                                <span class="text-sm font-semibold text-green-600">$${(
                                                    properties?.distance * Number(assignment.chargeValue)
                                                ).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `,
                            )
                            .addTo(map.current!);
                    }
                }
            });

            map.current!.on('mouseenter', layerId, () => {
                map.current!.getCanvas().style.cursor = 'pointer';
            });

            map.current!.on('mouseleave', layerId, () => {
                map.current!.getCanvas().style.cursor = '';
            });
        });

        // Display empty routes with dashed yellow lines
        if (filteredEmptyRoutes.length > 0) {
            // console.log('Adding empty routes:', filteredEmptyRoutes.length);

            try {
                map.current.addSource('empty-routes', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: filteredEmptyRoutes
                            .map((route, index) => {
                                if (!route.coordinates || route.coordinates.length === 0) {
                                    console.warn('Skipping empty route with no coordinates:', route);
                                    return null;
                                }
                                return {
                                    type: 'Feature' as const,
                                    properties: {
                                        distance: route.distance,
                                        index: index,
                                    },
                                    geometry: {
                                        type: 'LineString' as const,
                                        coordinates: route.coordinates,
                                    },
                                };
                            })
                            .filter(Boolean), // Remove null entries
                    },
                });

                map.current.addLayer({
                    id: 'empty-routes',
                    type: 'line',
                    source: 'empty-routes',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                    },
                    paint: {
                        'line-color': '#eab308',
                        'line-width': 3,
                        'line-opacity': 0.8,
                        'line-dasharray': [3, 3],
                    },
                });

                // console.log('Successfully added empty routes layer');
            } catch (error) {
                console.error('Error adding empty routes:', error);
            }

            // Add click event for empty miles
            map.current.on('click', 'empty-routes', (e) => {
                if (e.features && e.features[0]) {
                    const properties = e.features[0].properties;
                    new mapboxgl.Popup({
                        closeButton: false,
                        closeOnClick: true,
                        className: 'apple-popup',
                        maxWidth: '240px',
                    })
                        .setLngLat(e.lngLat)
                        .setHTML(
                            `
                            <div class="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-black/5">
                                <div class="flex items-center gap-3 mb-3">
                                    <div class="w-6 h-1 bg-yellow-500 rounded-full border-2 border-yellow-600/20"></div>
                                    <h4 class="font-semibold text-gray-900 text-sm">Empty Miles</h4>
                                </div>
                                <div class="space-y-2">
                                    <div class="flex justify-between items-center py-1">
                                        <span class="text-xs text-gray-600">Distance</span>
                                        <span class="text-xs font-medium text-gray-900">${properties?.distance?.toFixed(
                                            2,
                                        )} miles</span>
                                    </div>
                                    <div class="mt-3 pt-3 border-t border-gray-200/60">
                                        <p class="text-xs text-yellow-700 bg-yellow-50/80 px-2 py-1 rounded-lg">
                                            Travel between deliveries
                                        </p>
                                    </div>
                                </div>
                            </div>
                        `,
                        )
                        .addTo(map.current!);
                }
            });

            map.current.on('mouseenter', 'empty-routes', () => {
                map.current!.getCanvas().style.cursor = 'pointer';
            });

            map.current.on('mouseleave', 'empty-routes', () => {
                map.current!.getCanvas().style.cursor = '';
            });
        }
    };

    const addLocationMarkers = () => {
        if (!map.current) return;

        // Filter assignments based on selectedAssignmentId
        const assignmentsToDisplay = selectedAssignmentId
            ? assignments.filter((assignment) => assignment.id === selectedAssignmentId)
            : assignments;

        assignmentsToDisplay.forEach((assignment, assignmentIndex) => {
            const routeLocations = assignment.routeLeg.locations;

            // Find the original assignment index for consistent numbering
            const originalAssignmentIndex = assignments.findIndex((a) => a.id === assignment.id);

            routeLocations.forEach((location, locationIndex) => {
                const lat = location.loadStop?.latitude || location.location?.latitude;
                const lng = location.loadStop?.longitude || location.location?.longitude;

                if (lat && lng) {
                    const isFirstLocation = locationIndex === 0;
                    const isLastLocation = locationIndex === routeLocations.length - 1;

                    let markerColor, markerText, markerSize, locationTypeText;

                    if (isFirstLocation) {
                        markerColor = '#22c55e'; // Green for pickup
                        markerText = (originalAssignmentIndex + 1).toString();
                        markerSize = 32;
                        locationTypeText = 'Pickup';
                    } else if (isLastLocation) {
                        markerColor = '#ef4444'; // Red for delivery
                        markerText = 'D';
                        markerSize = 28;
                        locationTypeText = 'Delivery';
                    } else {
                        markerColor = '#f59e0b'; // Amber for intermediate stops
                        markerText = (locationIndex + 1).toString();
                        markerSize = 26;
                        locationTypeText = `Stop ${locationIndex + 1}`;
                    }

                    const marker = document.createElement('div');
                    marker.className = 'route-marker';
                    marker.style.cssText = `
                        width: ${markerSize}px;
                        height: ${markerSize}px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 8px 24px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        font-size: ${markerSize === 32 ? '12px' : '10px'};
                        color: white;
                        background-color: ${markerColor};
                        cursor: pointer;
                        transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    `;
                    marker.textContent = markerText;

                    // Add hover effects using filter and box-shadow instead of transform
                    marker.addEventListener('mouseenter', () => {
                        marker.style.filter = 'brightness(1.1) saturate(1.2)';
                        marker.style.boxShadow = '0 12px 32px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.15)';
                        marker.style.borderWidth = '4px';
                        marker.style.zIndex = '1000';
                    });

                    marker.addEventListener('mouseleave', () => {
                        marker.style.filter = 'brightness(1) saturate(1)';
                        marker.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)';
                        marker.style.borderWidth = '3px';
                        marker.style.zIndex = 'auto';
                    });

                    new mapboxgl.Marker(marker)
                        .setLngLat([lng, lat])
                        .setPopup(
                            new mapboxgl.Popup({
                                offset: 25,
                                closeButton: false,
                                className: 'apple-popup',
                                maxWidth: '260px',
                            }).setHTML(`
                                <div class="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-black/5">
                                    <div class="flex items-center gap-3 mb-3">
                                        <div class="w-6 h-6 rounded-full flex items-center justify-center" style="background-color: ${markerColor}">
                                            <span class="text-white text-xs font-bold">${markerText}</span>
                                        </div>
                                        <div>
                                            <h3 class="font-semibold text-sm text-gray-900">Assignment ${
                                                originalAssignmentIndex + 1
                                            }</h3>
                                            <p class="text-xs text-gray-500">${locationTypeText}</p>
                                        </div>
                                    </div>
                                    <div class="space-y-2">
                                        <div>
                                            <p class="text-xs font-medium text-gray-900">${
                                                location.loadStop?.name || location.location?.name
                                            }</p>
                                            <p class="text-xs text-gray-500">${
                                                location.loadStop?.city || location.location?.city
                                            }, ${location.loadStop?.state || location.location?.state}</p>
                                        </div>
                                        ${
                                            isFirstLocation
                                                ? `
                                            <div class="mt-3 pt-3 border-t border-gray-200/60">
                                                <div class="flex justify-between items-center">
                                                    <span class="text-xs text-gray-600">Route Distance</span>
                                                    <span class="text-xs font-medium text-gray-900">${assignment.routeLeg.distanceMiles} miles</span>
                                                </div>
                                                <div class="flex justify-between items-center mt-1">
                                                    <span class="text-xs text-gray-600">Rate</span>
                                                    <span class="text-xs font-medium text-green-600">$${assignment.chargeValue}/mile</span>
                                                </div>
                                            </div>
                                        `
                                                : ''
                                        }
                                        ${
                                            !isFirstLocation && !isLastLocation
                                                ? `
                                            <div class="mt-3 pt-3 border-t border-gray-200/60">
                                                <p class="text-xs text-amber-700 bg-amber-50/80 px-2 py-1 rounded-lg text-center">
                                                    Intermediate Stop
                                                </p>
                                            </div>
                                        `
                                                : ''
                                        }
                                    </div>
                                </div>
                            `),
                        )
                        .addTo(map.current);
                }
            });
        });
    };

    const fitMapToLocations = () => {
        if (!map.current || assignments.length === 0) return;

        const bounds = new mapboxgl.LngLatBounds();
        let hasValidLocation = false;

        // Filter assignments based on selectedAssignmentId
        const assignmentsToDisplay = selectedAssignmentId
            ? assignments.filter((assignment) => assignment.id === selectedAssignmentId)
            : assignments;

        assignmentsToDisplay.forEach((assignment) => {
            assignment.routeLeg.locations.forEach((location) => {
                const lat = location.loadStop?.latitude || location.location?.latitude;
                const lng = location.loadStop?.longitude || location.location?.longitude;
                if (lat && lng) {
                    bounds.extend([lng, lat]);
                    hasValidLocation = true;
                }
            });
        });

        if (hasValidLocation) {
            map.current.fitBounds(bounds, {
                padding: { top: 50, bottom: 50, left: 50, right: 50 },
                maxZoom: 12,
                duration: 1500,
            });
        }
    };

    const recalculateRoutes = () => {
        // Clear the route cache to force fresh API calls
        setRouteCache({});
        localStorage.removeItem(CACHE_KEY);
        // console.log('Route cache cleared, recalculating routes...');
        updateMapWithAssignments();
    };

    const toggleFullScreen = () => {
        const newFullScreenState = !isFullScreen;
        setIsFullScreen(newFullScreenState);

        // Move the map to the appropriate container after a short delay
        setTimeout(() => {
            if (map.current) {
                const targetContainer = newFullScreenState ? fullScreenMapContainer.current : mapContainer.current;

                if (targetContainer) {
                    // Get the current map canvas element
                    const mapCanvas = map.current.getContainer();

                    // Clear the target container and append the map canvas
                    targetContainer.innerHTML = '';
                    targetContainer.appendChild(mapCanvas);

                    // Resize the map to fit the new container
                    map.current.resize();
                }
            }
        }, 50); // Short delay to ensure DOM is ready
    };

    // Color palette for assignments (make it accessible outside displayRoutes)
    const assignmentColors = [
        '#3b82f6', // Blue
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#ef4444', // Red
        '#8b5cf6', // Violet
        '#06b6d4', // Cyan
        '#84cc16', // Lime
        '#f97316', // Orange
        '#ec4899', // Pink
        '#6366f1', // Indigo
    ];

    return (
        <>
            {/* Normal Map View */}
            {!isFullScreen && (
                <div className={`relative h-full ${className}`}>
                    <div
                        ref={mapContainer}
                        className="w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-gray-50"
                    />

                    {/* Control Panel - Apple Design */}
                    <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
                        {/* Full Screen Toggle Button */}
                        <button
                            onClick={toggleFullScreen}
                            className="group relative flex items-center justify-center w-11 h-11 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 border border-black/5"
                            title="Enter full screen"
                        >
                            <svg
                                className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                />
                            </svg>

                            {/* Tooltip */}
                            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/90 backdrop-blur-xl text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                                Enter full screen
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900/90 rotate-45"></div>
                            </div>
                        </button>

                        {/* Recalculate Routes Button */}
                        <button
                            onClick={recalculateRoutes}
                            disabled={isCalculating}
                            className="group relative flex items-center justify-center w-11 h-11 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed border border-black/5"
                            title="Recalculate routes"
                        >
                            {isCalculating ? (
                                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <svg
                                    className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                            )}

                            {/* Tooltip */}
                            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/90 backdrop-blur-xl text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                                {isCalculating ? 'Calculating routes...' : 'Recalculate routes'}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900/90 rotate-45"></div>
                            </div>
                        </button>

                        {/* Center Route Button */}
                        <button
                            onClick={fitMapToLocations}
                            className="group relative flex items-center justify-center w-11 h-11 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 border border-black/5"
                            title="Center map view"
                        >
                            <svg
                                className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 2v4m0 12v4m10-10h-4M6 12H2"
                                />
                            </svg>

                            {/* Tooltip */}
                            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/90 backdrop-blur-xl text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                                Center map view
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900/90 rotate-45"></div>
                            </div>
                        </button>
                    </div>

                    {/* Legend - Hide on small screens, only show when not in full screen */}
                    {!isFullScreen && (
                        <div className="absolute bottom-6 left-6 z-10 hidden lg:block">
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-black/5 p-4 max-w-xs">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    <h4 className="text-sm font-semibold text-gray-900">Route Overview</h4>
                                </div>

                                {/* Assignment Routes with Colors */}
                                {assignments.length > 1 && (
                                    <div className="mb-4">
                                        <div className="text-xs font-medium text-gray-600 mb-2">Assignments</div>
                                        <div className="space-y-2">
                                            {assignments.map((assignment, index) => {
                                                const color = assignmentColors[index % assignmentColors.length];
                                                const isSelected = selectedAssignmentId === assignment.id;

                                                return (
                                                    <div
                                                        key={assignment.id}
                                                        className={`flex items-center gap-2 ${
                                                            isSelected
                                                                ? 'opacity-100'
                                                                : selectedAssignmentId
                                                                ? 'opacity-40'
                                                                : 'opacity-100'
                                                        }`}
                                                    >
                                                        <div
                                                            className="w-3 h-1 rounded-full"
                                                            style={{ backgroundColor: color }}
                                                        ></div>
                                                        <span
                                                            className={`text-xs truncate flex-1 ${
                                                                isSelected
                                                                    ? 'text-blue-700 font-medium'
                                                                    : 'text-gray-700'
                                                            }`}
                                                        >
                                                            #{index + 1} {assignment.load.refNum}
                                                        </span>
                                                        {isSelected && (
                                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Location Types */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">1</span>
                                        </div>
                                        <span className="text-xs text-gray-700">Pickup locations</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">•</span>
                                        </div>
                                        <span className="text-xs text-gray-700">Intermediate stops</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">D</span>
                                        </div>
                                        <span className="text-xs text-gray-700">Delivery locations</span>
                                    </div>

                                    {/* Route Types */}
                                    <div className="pt-2 border-t border-gray-200/60">
                                        {assignments.length === 1 && (
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-4 h-0.5 bg-blue-500 rounded-full"></div>
                                                <span className="text-xs text-gray-700">Assignment route</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-0.5 bg-yellow-500 rounded-full border-dashed border border-yellow-600/40"></div>
                                            <span className="text-xs text-gray-700">Empty miles</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/95 backdrop-blur-sm rounded-2xl">
                            <div className="flex flex-col items-center space-y-4">
                                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                <div className="text-center">
                                    <div className="text-sm font-medium text-gray-700">Loading map</div>
                                    <div className="text-xs text-gray-500 mt-1">Preparing route visualization</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Full Screen Modal */}
            {isFullScreen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div className="fixed inset-0 z-[99999] bg-black/20 backdrop-blur-sm" style={{ zIndex: 99999 }}>
                        <div className="absolute inset-0 bg-white">
                            {/* Full Screen Map Container */}
                            <div className="relative w-full h-full flex lg:flex-row flex-col">
                                {/* Map taking 75% width on desktop, flexible height on mobile (expands to fill remaining space) */}
                                <div className="relative lg:w-3/4 w-full lg:h-full flex-1 flex-shrink-0">
                                    <div ref={fullScreenMapContainer} className="w-full h-full bg-gray-50" />

                                    {/* Full Screen Control Panel */}
                                    <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
                                        {/* Exit Full Screen Button */}
                                        <button
                                            onClick={toggleFullScreen}
                                            className="group relative flex items-center justify-center w-11 h-11 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 border border-black/5"
                                            title="Exit full screen"
                                        >
                                            <svg
                                                className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>

                                            {/* Tooltip */}
                                            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/90 backdrop-blur-xl text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                                                Exit full screen
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900/90 rotate-45"></div>
                                            </div>
                                        </button>

                                        {/* Recalculate Routes Button */}
                                        <button
                                            onClick={recalculateRoutes}
                                            disabled={isCalculating}
                                            className="group relative flex items-center justify-center w-11 h-11 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed border border-black/5"
                                            title="Recalculate routes"
                                        >
                                            {isCalculating ? (
                                                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <svg
                                                    className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                                    />
                                                </svg>
                                            )}

                                            {/* Tooltip */}
                                            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/90 backdrop-blur-xl text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                                                {isCalculating ? 'Calculating routes...' : 'Recalculate routes'}
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900/90 rotate-45"></div>
                                            </div>
                                        </button>

                                        {/* Center Route Button */}
                                        <button
                                            onClick={fitMapToLocations}
                                            className="group relative flex items-center justify-center w-11 h-11 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 border border-black/5"
                                            title="Center map view"
                                        >
                                            <svg
                                                className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                                />
                                            </svg>

                                            {/* Tooltip */}
                                            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900/90 backdrop-blur-xl text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                                                Center map view
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900/90 rotate-45"></div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Assignment Cards Sidebar - 25% width on desktop, flexible height on mobile (max 40%) */}
                                <div className="lg:w-1/4 w-full lg:h-screen max-h-[40vh] lg:max-h-none bg-gray-50/95 backdrop-blur-xl lg:border-l lg:border-t-0 border-t border-gray-200/50 flex flex-col">
                                    {/* Header - Fixed at top on desktop */}
                                    <div className="p-2 lg:p-3 border-b border-gray-200/50 flex-shrink-0 lg:sticky lg:top-0 bg-gray-50/95 backdrop-blur-xl lg:z-10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                <h2 className="text-xs lg:text-sm font-semibold text-gray-900">
                                                    Assignments
                                                </h2>
                                                <span className="text-xs text-gray-500 bg-gray-200/60 px-1.5 py-0.5 rounded-full">
                                                    {assignments.length}
                                                </span>
                                                {selectedAssignmentId && (
                                                    <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                                                        Filtered
                                                    </span>
                                                )}
                                            </div>
                                            {selectedAssignmentId && (
                                                <button
                                                    onClick={() => onAssignmentSelect && onAssignmentSelect(null)}
                                                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-lg transition-colors"
                                                >
                                                    Show All
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Scrollable Assignment Cards */}
                                    <div className="flex-1 overflow-auto">
                                        {/* Desktop: Vertical scroll - Compact */}
                                        <div className="hidden lg:block p-2 space-y-2">
                                            {assignments.map((assignment, index) => {
                                                const color = assignmentColors[index % assignmentColors.length];
                                                const routeData = routes.find((r) => r.assignmentId === assignment.id);
                                                const isSelected = selectedAssignmentId === assignment.id;

                                                // Calculate empty miles to next assignment
                                                let emptyMilesToNext = 0;
                                                const nextAssignment =
                                                    index < assignments.length - 1 ? assignments[index + 1] : null;

                                                if (nextAssignment) {
                                                    const routeLocations = assignment.routeLeg.locations;
                                                    const endLocation = routeLocations[routeLocations.length - 1];
                                                    const nextStartLocation = nextAssignment.routeLeg.locations[0];
                                                    const endLat =
                                                        endLocation.loadStop?.latitude ||
                                                        endLocation.location?.latitude;
                                                    const endLon =
                                                        endLocation.loadStop?.longitude ||
                                                        endLocation.location?.longitude;
                                                    const nextStartLat =
                                                        nextStartLocation.loadStop?.latitude ||
                                                        nextStartLocation.location?.latitude;
                                                    const nextStartLon =
                                                        nextStartLocation.loadStop?.longitude ||
                                                        nextStartLocation.location?.longitude;

                                                    if (endLat && endLon && nextStartLat && nextStartLon) {
                                                        // Simple distance calculation
                                                        const R = 3959; // Earth's radius in miles
                                                        const dLat = ((nextStartLat - endLat) * Math.PI) / 180;
                                                        const dLon = ((nextStartLon - endLon) * Math.PI) / 180;
                                                        const a =
                                                            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                                            Math.cos((endLat * Math.PI) / 180) *
                                                                Math.cos((nextStartLat * Math.PI) / 180) *
                                                                Math.sin(dLon / 2) *
                                                                Math.sin(dLon / 2);
                                                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                                        emptyMilesToNext = Math.round(R * c * 100) / 100;
                                                    }
                                                }

                                                const assignmentMiles = Number(
                                                    assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles,
                                                );

                                                return (
                                                    <AssignmentCard
                                                        key={assignment.id}
                                                        assignment={assignment}
                                                        index={index}
                                                        color={color}
                                                        isSelected={isSelected}
                                                        assignmentMiles={assignmentMiles}
                                                        nextAssignment={nextAssignment}
                                                        emptyMiles={emptyMiles}
                                                        emptyMilesToNext={emptyMilesToNext}
                                                        onAssignmentSelect={onAssignmentSelect}
                                                        onEmptyMilesUpdate={onEmptyMilesUpdate}
                                                        isMobile={false}
                                                        isLastAssignment={index === assignments.length - 1}
                                                    />
                                                );
                                            })}
                                        </div>

                                        {/* Mobile: Horizontal scroll - Compact */}
                                        <div className="lg:hidden">
                                            <div className="p-2 overflow-x-auto">
                                                <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
                                                    {assignments.map((assignment, index) => {
                                                        const color = assignmentColors[index % assignmentColors.length];
                                                        const isSelected = selectedAssignmentId === assignment.id;

                                                        const assignmentMiles = Number(
                                                            assignment.billedDistanceMiles ||
                                                                assignment.routeLeg.distanceMiles,
                                                        );

                                                        // Calculate empty miles to next assignment
                                                        let emptyMilesToNext = 0;
                                                        const nextAssignment =
                                                            index < assignments.length - 1
                                                                ? assignments[index + 1]
                                                                : null;

                                                        if (nextAssignment) {
                                                            const routeLocations = assignment.routeLeg.locations;
                                                            const endLocation =
                                                                routeLocations[routeLocations.length - 1];
                                                            const nextStartLocation =
                                                                nextAssignment.routeLeg.locations[0];
                                                            const endLat =
                                                                endLocation.loadStop?.latitude ||
                                                                endLocation.location?.latitude;
                                                            const endLon =
                                                                endLocation.loadStop?.longitude ||
                                                                endLocation.location?.longitude;
                                                            const nextStartLat =
                                                                nextStartLocation.loadStop?.latitude ||
                                                                nextStartLocation.location?.latitude;
                                                            const nextStartLon =
                                                                nextStartLocation.loadStop?.longitude ||
                                                                nextStartLocation.location?.longitude;

                                                            if (endLat && endLon && nextStartLat && nextStartLon) {
                                                                const R = 3959; // Earth's radius in miles
                                                                const dLat = ((nextStartLat - endLat) * Math.PI) / 180;
                                                                const dLon = ((nextStartLon - endLon) * Math.PI) / 180;
                                                                const a =
                                                                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                                                    Math.cos((endLat * Math.PI) / 180) *
                                                                        Math.cos((nextStartLat * Math.PI) / 180) *
                                                                        Math.sin(dLon / 2) *
                                                                        Math.sin(dLon / 2);
                                                                const c =
                                                                    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                                                emptyMilesToNext = Math.round(R * c * 100) / 100;
                                                            }
                                                        }

                                                        return (
                                                            <AssignmentCard
                                                                key={assignment.id}
                                                                assignment={assignment}
                                                                index={index}
                                                                color={color}
                                                                isSelected={isSelected}
                                                                assignmentMiles={assignmentMiles}
                                                                nextAssignment={nextAssignment}
                                                                emptyMiles={emptyMiles}
                                                                emptyMilesToNext={emptyMilesToNext}
                                                                onAssignmentSelect={onAssignmentSelect}
                                                                onEmptyMilesUpdate={onEmptyMilesUpdate}
                                                                isMobile={true}
                                                                isLastAssignment={index === assignments.length - 1}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Footer - Fixed at bottom on desktop */}
                                    <div className="p-2 lg:p-3 border-t border-gray-200/50 bg-white/80 flex-shrink-0 lg:sticky lg:bottom-0">
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <div className="text-xs text-gray-600 mb-0.5">Loaded</div>
                                                <div className="text-sm lg:text-base font-bold text-blue-600">
                                                    {assignments
                                                        .reduce((total, assignment) => {
                                                            const miles = Number(
                                                                assignment.billedDistanceMiles ||
                                                                    assignment.routeLeg.distanceMiles ||
                                                                    0,
                                                            );
                                                            return total + miles;
                                                        }, 0)
                                                        .toFixed(1)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-600 mb-0.5">Empty</div>
                                                <div className="text-sm lg:text-base font-bold text-amber-600">
                                                    {Object.values(emptyMiles)
                                                        .reduce((total, miles) => total + miles, 0)
                                                        .toFixed(1)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-600 mb-0.5">Total</div>
                                                <div className="text-sm lg:text-base font-bold text-gray-900">
                                                    {(() => {
                                                        const loadedMiles = assignments.reduce((total, assignment) => {
                                                            const miles = Number(
                                                                assignment.billedDistanceMiles ||
                                                                    assignment.routeLeg.distanceMiles ||
                                                                    0,
                                                            );
                                                            return total + miles;
                                                        }, 0);
                                                        const emptyMilesTotal = Object.values(emptyMiles).reduce(
                                                            (total, miles) => total + miles,
                                                            0,
                                                        );
                                                        return (loadedMiles + emptyMilesTotal).toFixed(1);
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
};

export default DriverRouteMap;
