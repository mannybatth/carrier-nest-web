'use client';

import React, { useState, useEffect, useRef, Fragment } from 'react';
import Link from 'next/link';
import { Tab } from '@headlessui/react';
import {
    MapPinIcon,
    TruckIcon,
    TableCellsIcon,
    MapIcon,
    PhoneIcon,
    ClockIcon,
    CurrencyDollarIcon,
    UserIcon,
    InformationCircleIcon,
    ArrowTopRightOnSquareIcon,
    CalendarIcon,
    EllipsisHorizontalIcon,
    CheckCircleIcon,
    ClockIcon as ClockIconOutline,
    CircleStackIcon,
    PlayCircleIcon,
    StopIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ExpandedDriverAssignment, ExpandedLoad } from 'interfaces/models';
import LoadStatusBadge from './LoadStatusBadge';
import { formatDate, formatPhoneNumber } from 'lib/helpers/format';
import { format, set } from 'date-fns';
import SwitchWithLabel from 'components/switchWithLabel';
import { getAssignmentById } from 'lib/rest/assignment';
import AssignmentPopup from 'components/assignment/AssignmentPopup';
import { updateRouteLegStatus } from 'lib/rest/routeLeg';
import { notify } from 'components/Notification';
import { Route } from 'next';
import { RouteLegStatus } from '@prisma/client';
import Spinner from 'components/Spinner';

interface LoadViewToggleProps {
    loadsList: ExpandedLoad[];
    todayDataOnly: () => void;
    updateLoadStatus: (updatedLoad: ExpandedLoad) => void;
}

// Create Google Maps URL from coordinates
const createGoogleMapsUrl = (latitude: number, longitude: number, label?: string) => {
    const baseUrl = 'https://www.google.com/maps';

    if (label) {
        // Include a label/pin text if provided
        return `${baseUrl}?q=${latitude},${longitude}&z=15&query=${latitude},${longitude}&query_place_id=${encodeURIComponent(
            label,
        )}`;
    } else {
        return `${baseUrl}?q=${latitude},${longitude}&z=15`;
    }
};

// Add a function to create Google Maps directions URL with waypoints
// Add this after the existing createGoogleMapsUrl function
const createGoogleMapsDirectionsUrl = (locations) => {
    if (!locations || locations.length < 2) return '';

    const baseUrl = 'https://www.google.com/maps/dir/?api=1';

    // Get first location as origin
    const firstLocation = locations[0];
    const origin = firstLocation.loadStop
        ? `${firstLocation.loadStop.latitude},${firstLocation.loadStop.longitude}`
        : firstLocation.location
        ? `${firstLocation.location.latitude},${firstLocation.location.longitude}`
        : '';

    // Get last location as destination
    const lastLocation = locations[locations.length - 1];
    const destination = lastLocation.loadStop
        ? `${lastLocation.loadStop.latitude},${lastLocation.loadStop.longitude}`
        : lastLocation.location
        ? `${lastLocation.location.latitude},${lastLocation.location.longitude}`
        : '';

    // Get middle locations as waypoints
    const waypoints = locations
        .slice(1, locations.length - 1)
        .map((loc) => {
            return loc.loadStop
                ? `${loc.loadStop.latitude},${loc.loadStop.longitude}`
                : loc.location
                ? `${loc.location.latitude},${loc.location.longitude}`
                : '';
        })
        .filter((wp) => wp !== '')
        .join('|');

    return `${baseUrl}&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`;
};

const formatTime = (timeString: string) => {
    // Convert 24-hour time format to 12-hour format
    if (!timeString) return '';

    // Handle time ranges like "07:00-14:00"
    if (timeString.includes('-')) {
        const [start, end] = timeString.split('-');
        return `${formatTime(start)} - ${formatTime(end)}`;
    }

    const [hours, minutes] = timeString.split(':');
    const hour = Number.parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

const LoadViewToggle: React.FC<LoadViewToggleProps> = ({ loadsList = [], todayDataOnly, updateLoadStatus }) => {
    const [loadingAssignment, setLoadingAssignment] = useState(false);
    const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
    const [modalAssignment, setModalAssignment] = useState<ExpandedDriverAssignment | null>(null);
    const [assignmentId, setAssignmentId] = useState<string | null>(null);
    const [expandedLoadId, setExpandedLoadId] = useState<string | null>(null);
    const [changeLegStatusLoading, setChangeLegStatusLoading] = useState(false);
    const [updatedStatuses, setUpdatedStatuses] = useState<Record<string, string>>({});

    const [routeLegIdUpdating, setRouteLegIdUpdating] = useState<string | null>(null);

    // Get assignment by assignment ID
    const getAssignment = async (assId: string, driverId: string) => {
        setAssignmentModalOpen(true);
        setLoadingAssignment(true);
        if (assId === assignmentId) {
            setLoadingAssignment(false);
            return;
        }

        const assignment: ExpandedDriverAssignment = await getAssignmentById(assId);

        setModalAssignment(assignment);
        setAssignmentId(assignment.id);
        setLoadingAssignment(false);
    };

    const [selectedIndex, setSelectedIndex] = useState(0);
    const viewModes = ['table', 'map'];
    const [viewMode, setViewMode] = useState(viewModes[selectedIndex]);
    const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);

    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const carouselRef = useRef<HTMLDivElement>(null);

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const [showTodayOnly, setShowTodayOnly] = useState(localStorage.getItem('todayDataOnly') === 'true');
    const todayDataOnlyClicked = () => {
        setShowTodayOnly((prev) => !prev);
        todayDataOnly();
    };

    const today = format(new Date(), 'PPP'); // e.g. Apr 25, 2025

    const boundPadding = {
        top: screenHeight * 0.1, // 10% of the screen height
        bottom: screenHeight * 0.1, // 10% of the screen height
        left: screenWidth < 500 ? screenWidth * 0.1 : screenWidth * 0.35, // 10% of the screen width
        right: screenWidth * 0.1, // 10% of the screen width
    };

    // Decode polyline function
    const decodePolyline = (encoded: string) => {
        if (!encoded) return [];

        let index = 0;
        const len = encoded.length;
        let lat = 0;
        let lng = 0;
        const coordinates = [];

        while (index < len) {
            let b;
            let shift = 0;
            let result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
            lat += dlat;

            shift = 0;
            result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
            lng += dlng;

            coordinates.push([lng * 1e-5, lat * 1e-5]);
        }

        return coordinates;
    };

    useEffect(() => {
        // Check local storage for last selected viewModes
        const view = localStorage.getItem('selectedLoadView');
        if (view) {
            setViewMode(view);
            setSelectedIndex(viewModes.indexOf(view));
        }
    }, []);

    useEffect(() => {
        if (viewMode !== 'map' || !mapContainer.current) return;

        mapboxgl.accessToken =
            process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
            'pk.eyJ1IjoiY2Fycmllcm5lc3RhcHAiLCJhIjoiY2xrM2prOWZvMDhyczNncG55a2I1aDhhOSJ9._mlA6WAuqHcbS-U_f5KK5w';

        if (map.current) return; // Map already initialized

        try {
            // Initialize map with a cleaner style
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/light-v10', // Cleaner, light style
                center: [-98.5795, 39.8283], // Center of US
                zoom: 3,
                attributionControl: false, // Hide attribution for cleaner look
            });

            // Add navigation controls
            map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

            // Add loads to map when it loads
            map.current.on('load', () => {
                if (!map.current) return;

                // Bounds to fit all markers
                const bounds = new mapboxgl.LngLatBounds();

                // Add markers and routes for each load
                loadsList?.forEach((load) => {
                    if (!map.current) return;

                    // Add origin marker (shipper)
                    const originEl = document.createElement('div');
                    originEl.className = 'origin-marker';
                    originEl.style.backgroundColor = '#22c55e';
                    originEl.style.width = '20px';
                    originEl.style.height = '20px';
                    originEl.style.borderRadius = '50%';
                    originEl.style.border = '3px solid white';
                    originEl.style.boxShadow = '0 0 0 2px rgba(0, 0, 0, 0.1)';
                    originEl.setAttribute('data-load-id', load.id);

                    const originMarker = new mapboxgl.Marker(originEl)
                        .setLngLat([load.shipper.longitude, load.shipper.latitude])
                        .setPopup(
                            new mapboxgl.Popup({ offset: 25, closeButton: false, altitude: 0 })
                                .setHTML(
                                    `
                <div class="font-sans p-1">
                  <div class="font-bold">${load.shipper.name}</div>
                  <div>${load.shipper.street}</div>
                  <div>${load.shipper.city}, ${load.shipper.state} ${load.shipper.zip}</div>
                  <div class="mt-2">
                    <span class="font-semibold">Pickup:</span> ${formatDate(load.shipper.date.toString())} @ ${
                                        load.shipper.time
                                    }
                  </div>
                </div>
              `,
                                )
                                .on('open', () => {
                                    map.current.flyTo(
                                        { center: [load.shipper.longitude, load.shipper.latitude] },
                                        { zoom: 22, speed: 1.2, curve: 1.2 },
                                    );
                                }),
                        )
                        .addTo(map.current);

                    // Add destination marker (receiver)
                    const destEl = document.createElement('div');
                    destEl.className = 'destination-marker';
                    destEl.style.backgroundColor = '#ef4444';
                    destEl.style.width = '20px';
                    destEl.style.height = '20px';
                    destEl.style.borderRadius = '50%';
                    destEl.style.border = '3px solid white';
                    destEl.style.boxShadow = '0 0 0 2px rgba(0, 0, 0, 0.1)';
                    destEl.setAttribute('data-load-id', load.id);

                    const destMarker = new mapboxgl.Marker(destEl)
                        .setLngLat([load.receiver.longitude, load.receiver.latitude])
                        .setPopup(
                            new mapboxgl.Popup({ offset: 25, closeButton: false })
                                .setHTML(
                                    `
                <div class="font-sans p-1">
                  <div class="font-bold">${load.receiver.name}</div>
                  <div>${load.receiver.street}</div>
                  <div>${load.receiver.city}, ${load.receiver.state} ${load.receiver.zip}</div>
                  <div class="mt-2">
                    <span class="font-semibold">Delivery:</span> ${formatDate(load.receiver.date.toString())} @ ${
                                        load.receiver.time
                                    }
                  </div>
                </div>
              `,
                                )
                                .on('open', () => {
                                    map.current.flyTo(
                                        { center: [load?.receiver?.longitude, load?.receiver?.latitude] },
                                        { zoom: 22, speed: 1.2, curve: 1.2 },
                                    );
                                }),
                        )
                        .addTo(map.current);

                    // Add route if available
                    if (load.routeEncoded) {
                        const coordinates = decodePolyline(load.routeEncoded);

                        // Add route line
                        map.current.addSource(`route-${load.id}`, {
                            type: 'geojson',
                            data: {
                                type: 'Feature',
                                properties: {},
                                geometry: {
                                    type: 'LineString',
                                    coordinates: coordinates,
                                },
                            },
                        });

                        map.current.addLayer({
                            id: `route-${load.id}`,
                            type: 'line',
                            source: `route-${load.id}`,
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round',
                            },
                            paint: {
                                'line-color': '#3b82f6',
                                'line-width': 3,
                                'line-opacity': 0.8,
                            },
                        });

                        // Extend bounds to include route
                        coordinates.forEach((coord) => {
                            bounds.extend(coord as [number, number]);
                        });
                    } else {
                        // If no route, just extend bounds with origin and destination
                        bounds.extend([load.shipper.longitude, load.shipper.latitude]);
                        bounds.extend([load.receiver.longitude, load.receiver.latitude]);
                    }
                });

                // Fit map to bounds with padding
                if (!bounds.isEmpty()) {
                    map.current.fitBounds(bounds, {
                        padding: boundPadding,
                        maxZoom: 18,

                        // Animation settings:
                        animate: true, // default is true, but explicit is fine
                        duration: 1500, // 1.5 seconds
                        easing: (t) => t * (2 - t), // ease‑out quad
                    });
                }
            });
        } catch (error) {
            console.error('Error initializing map:', error);
        }

        // Clean up on unmount
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [viewMode, loadsList]);

    useEffect(() => {
        if (!selectedLoadId) {
            // Reset all markers to default size and opacity
            const markers = document.querySelectorAll('.origin-marker, .destination-marker');
            markers.forEach((marker: any) => {
                marker.style.width = '20px';
                marker.style.height = '20px';
                marker.style.zIndex = '1';
                marker.style.opacity = '1';
            });
            return;
        }
        if (!map.current || !selectedLoadId) return;

        // Update marker sizes based on selection
        const markers = document.querySelectorAll('.origin-marker, .destination-marker');
        markers.forEach((marker: any) => {
            const loadId = marker.getAttribute('data-load-id');
            if (loadId === selectedLoadId) {
                marker.style.width = '24px';
                marker.style.height = '24px';
                marker.style.zIndex = '10';
                marker.style.opacity = '1';
            } else {
                marker.style.width = '20px';
                marker.style.height = '20px';
                marker.style.zIndex = '1';
                marker.style.opacity = '0';
            }
        });
    }, [selectedLoadId]);

    useEffect(() => {
        if (!map.current || !map.current.loaded()) return;

        // Wait for map style to be fully loaded
        if (!map.current.isStyleLoaded()) {
            map.current.once('styledata', () => {
                updateRouteColors();
            });
            return;
        }

        updateRouteColors();

        function updateRouteColors() {
            // Update all route colors based on selection
            loadsList?.forEach((load) => {
                const routeId = `route-${load.id}`;
                if (map.current && map.current.getLayer(routeId)) {
                    map.current.setPaintProperty(
                        routeId,
                        'line-color',
                        load.id === selectedLoadId ? '#ef4444' : '#3b82f6',
                    );
                    map.current.setPaintProperty(routeId, 'line-width', load.id === selectedLoadId ? 5 : 3);
                    map.current.setPaintProperty(routeId, 'line-opacity', load.id === selectedLoadId ? 1 : 0.0);
                }
            });
        }
    }, [selectedLoadId, loadsList]);

    const changeViewMode = (index: number) => {
        setSelectedIndex(index);
        setViewMode(viewModes[index]);
        localStorage.setItem('selectedLoadView', viewModes[index]);
    };

    // Group assignments by routeLegId
    const getRouteLegsForLoad = (load) => {
        if (!load.driverAssignments || load.driverAssignments.length === 0) return [];

        // Group assignments by routeLegId
        const routeLegsMap = new Map();

        load.driverAssignments.forEach((assignment) => {
            const routeLegId = assignment.routeLegId;

            if (!routeLegsMap.has(routeLegId)) {
                routeLegsMap.set(routeLegId, {
                    routeLeg: assignment.routeLeg,
                    assignments: [],
                });
            }

            routeLegsMap.get(routeLegId).assignments.push(assignment);
        });

        return Array.from(routeLegsMap.values());
    };

    const toggleExpandRow = (loadId: string) => {
        setExpandedLoadId(expandedLoadId === loadId ? null : loadId);
    };

    // Helper function to get the current status (either updated or original)
    const getCurrentStatus = (routeLeg) => {
        return updatedStatuses[routeLeg.id] || routeLeg.status;
    };

    const changeLegStatusClicked = async (status: string, routeLegId: string) => {
        setChangeLegStatusLoading(true);
        setRouteLegIdUpdating(routeLegId);
        try {
            // change status to routelegstatus type
            const routeLegStatus = status as RouteLegStatus;

            const { loadStatus, routeLeg: newRouteLeg } = await updateRouteLegStatus(routeLegId, routeLegStatus);

            // Update local state immediately for UI feedback
            setUpdatedStatuses((prev) => ({
                ...prev,
                [routeLegId]: status,
            }));

            // Update the load status in the load object
            const load = loadsList.find((load) =>
                load.driverAssignments.some((assignment: any) => assignment.routeLeg?.id === routeLegId),
            );
            if (load) {
                load.status = loadStatus;
            }

            // Update the route leg status in the load object
            updateLoadStatus(load);

            notify({ title: 'Load Assignment Status', message: 'Load assignment successfully updated' });
        } catch (error) {
            console.error('Error updating route leg status:', error);
            // Revert the status change in case of error
            setUpdatedStatuses((prev) => {
                const newStatuses = { ...prev };
                delete newStatuses[routeLegId];
                return newStatuses;
            });
        } finally {
            setChangeLegStatusLoading(false);
            setRouteLegIdUpdating(null);
        }
    };

    // Loading skeleton components
    const LoadingLoadViewTableSkeleton = () => {
        // Create an array of 8 items to map over
        const skeletonRows = Array(6).fill(null);

        return (
            <div className="px-0 overflow-x-auto pb-0 border border-gray-200 rounded-lg shadow-sm">
                <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200 border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-600">
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold uppercase">
                                    Load
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase">
                                    Status
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase">
                                    Pickup
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase">
                                    Delivery
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase">
                                    Distance
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase">
                                    Driver
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {skeletonRows.map((_, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                        <div className="flex flex-col">
                                            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                                            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <div className="flex items-start space-x-2">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                                                    <TruckIcon
                                                        className="w-3 h-3 text-green-800 opacity-50"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
                                                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                                                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                                                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <div className="flex items-start space-x-2">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                                                    <MapPinIcon
                                                        className="w-3 h-3 text-red-800 opacity-50"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
                                                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                                                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                                                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
                                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const LoadingLoadMapViewSkeleton = () => {
        // Number of skeleton cards to display
        const skeletonCount = 5;

        return (
            <div className="px-0 pb-0 relative">
                {/* Map loading skeleton */}
                <div className="w-full h-[50vh] md:h-[80vh] rounded-lg border border-gray-200 overflow-hidden relative z-10 bg-gray-100">
                    {/* Map placeholder with shimmer effect */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <MapIcon className="w-16 h-16 text-gray-300" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>

                {/* Loads list skeleton overlay */}
                <div className="relative md:absolute bottom-0 top-0 left-0 z-20 px-0 pb-0 overflow-x-auto md:overflow-y-auto hide-scrollbar">
                    <div className="relative">
                        {/* Scroll container */}
                        <div className="flex flex-row md:flex-col overflow-y-auto hide-scrollbar px-2 my-4">
                            {Array.from({ length: skeletonCount }).map((_, i) => (
                                <div
                                    key={i}
                                    className="snap-start flex-shrink-0 w-72 m-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible"
                                >
                                    <div className="p-3 pb-1">
                                        <div className="relative flex justify-between items-start mb-2">
                                            <div className="w-full">
                                                <div className="h-3 w-16 bg-gray-200 rounded mb-2 animate-pulse"></div>
                                                <div className="h-4 w-36 bg-gray-300 rounded animate-pulse"></div>
                                            </div>
                                            <div className="absolute -top-6 right-0">
                                                <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 mb-1.5">
                                            <div className="flex-shrink-0">
                                                <div className="flex items-center justify-center w-5 h-5 bg-green-100 rounded-full">
                                                    <TruckIcon className="w-3 h-3 text-green-300" aria-hidden="true" />
                                                </div>
                                            </div>
                                            <div className="h-3 w-40 bg-gray-200 rounded animate-pulse"></div>
                                        </div>

                                        <div className="flex items-center space-x-2 mb-2">
                                            <div className="flex-shrink-0">
                                                <div className="flex items-center justify-center w-5 h-5 bg-red-100 rounded-full">
                                                    <MapPinIcon className="w-3 h-3 text-red-300" aria-hidden="true" />
                                                </div>
                                            </div>
                                            <div className="h-3 w-40 bg-gray-200 rounded animate-pulse"></div>
                                        </div>

                                        <div className="flex justify-between items-center text-xs">
                                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                                            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                    <div className="p-3 pt-1">
                                        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col w-full mx-auto mt-6 mb-8">
            <AssignmentPopup
                isOpen={assignmentModalOpen}
                onClose={() => setAssignmentModalOpen(false)}
                assignment={modalAssignment}
                loading={loadingAssignment}
            />
            <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center lg:justify-between mb-4 px-0">
                <div className="flex flex-col flex-1">
                    <h3 className="text-xl font-semibold text-[#1D1D1F]">Upcoming Load Runs</h3>
                    {showTodayOnly && (
                        <p className="font-light text-gray-500 text-xs">
                            Showing today&apos;s pick-ups and deliveries, along with any undelivered loads
                        </p>
                    )}
                    {!showTodayOnly && (
                        <p className="font-light text-gray-500 text-xs">
                            Showing load runs for next 7 days & past undelivered loads{' '}
                        </p>
                    )}
                </div>

                <div className="flex flex-row gap-3">
                    <SwitchWithLabel
                        checked={showTodayOnly}
                        label="Show Today's Runs Only"
                        onChange={todayDataOnlyClicked}
                    />

                    <Tab.Group selectedIndex={selectedIndex} onChange={changeViewMode}>
                        <Tab.List className="flex p-1 space-x-1 bg-gray-100 rounded-lg">
                            <Tab
                                className={({ selected }) =>
                                    `flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all
                ${
                    selected
                        ? 'bg-white shadow text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/[0.12]'
                }`
                                }
                            >
                                <TableCellsIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Table</span>
                            </Tab>
                            <Tab
                                className={({ selected }) =>
                                    `flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all
                ${
                    selected
                        ? 'bg-white shadow text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/[0.12]'
                }`
                                }
                            >
                                <MapIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Map</span>
                            </Tab>
                        </Tab.List>
                    </Tab.Group>
                </div>
            </div>

            {viewMode === 'table' &&
                (loadsList?.length === 0 ? (
                    <LoadingLoadViewTableSkeleton />
                ) : (
                    <div className="mx-0 md:mx-0 md:px-0 overflow-x-auto pb-0 border border-gray-200 rounded-lg shadow-sm">
                        <div className="inline-block min-w-full align-middle">
                            <table className="min-w-full divide-y divide-gray-200 border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-600">
                                        <th
                                            scope="col"
                                            className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold uppercase"
                                        >
                                            Load
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-xs font-semibold uppercase"
                                        >
                                            Status
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-xs font-semibold uppercase"
                                        >
                                            Pickup
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-xs font-semibold uppercase"
                                        >
                                            Delivery
                                        </th>

                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-xs font-semibold uppercase"
                                        >
                                            Distance
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-xs font-semibold uppercase"
                                        >
                                            Driver
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {loadsList?.map((load, index) => {
                                        // Calculate if shipper/receiver/loadstop dates are in the past
                                        const allDates = [
                                            load.shipper.date,
                                            load.receiver.date,
                                            ...load.stops.map((stop) => stop.date),
                                        ];

                                        const now = new Date();
                                        now.setHours(0, 0, 0, 0); // Set current time to midnight

                                        const allDatesInPast = allDates.every((dateStr) => {
                                            const date = new Date(dateStr);
                                            date.setHours(0, 0, 0, 0); // Set stop date to midnight
                                            return date < now;
                                        });

                                        // Get route legs for this load
                                        const routeLegs = getRouteLegsForLoad(load);
                                        const isExpanded = expandedLoadId === load.id;

                                        return (
                                            <React.Fragment key={index}>
                                                <tr
                                                    className={`hover:bg-gray-50 cursor-pointer ${
                                                        load.driverAssignments?.length === 0 && !allDatesInPast
                                                            ? 'bg-red-50'
                                                            : ''
                                                    } ${allDatesInPast ? 'bg-red-100 animate-none' : ''} ${
                                                        isExpanded ? 'bg-gray-50' : ''
                                                    }`}
                                                    onClick={() => toggleExpandRow(load.id)}
                                                >
                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                                        <div className="flex flex-col">
                                                            <div className="text-sm text-gray-500">
                                                                <Link
                                                                    href={`/loads/${load.id}`}
                                                                    className="font-semibold cursor-pointer hover:underline"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                    }}
                                                                >
                                                                    Order# {load.refNum}
                                                                </Link>
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                Load# {load.loadNum}
                                                            </div>
                                                            <div className="font-base text-gray-900 font-semibold">
                                                                {load.customer.name.toUpperCase()}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                        <LoadStatusBadge load={load} />
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                        <div className="flex items-start space-x-2">
                                                            <div className="flex-shrink-0 mt-0.5">
                                                                <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                                                                    <TruckIcon
                                                                        className="w-3 h-3 text-green-800"
                                                                        aria-hidden="true"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900">
                                                                    {formatDate(load.shipper.date.toString())}
                                                                </div>
                                                                <div className="text-gray-500">{load.shipper.time}</div>
                                                                <div className="text-gray-500 truncate">
                                                                    {load.shipper.name.toUpperCase()}
                                                                </div>
                                                                <div className="text-gray-500 capitalize">
                                                                    {load.shipper.city.toLowerCase()},{' '}
                                                                    {load.shipper.state.toUpperCase()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                        <div className="flex items-start space-x-2">
                                                            <div className="flex-shrink-0 mt-0.5">
                                                                <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                                                                    <MapPinIcon
                                                                        className="w-3 h-3 text-red-800"
                                                                        aria-hidden="true"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900">
                                                                    {formatDate(load.receiver.date.toString())}
                                                                </div>
                                                                <div className="text-gray-500">
                                                                    {load.receiver.time}
                                                                </div>
                                                                <div className="text-gray-500 truncate">
                                                                    {load.receiver.name.toUpperCase()}
                                                                </div>
                                                                <div className="text-gray-500 capitalize">
                                                                    {load.receiver.city.toLowerCase()},{' '}
                                                                    {load.receiver.state.toUpperCase()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        {load.routeDistanceMiles
                                                            ? `${
                                                                  isNaN(Number(load.routeDistanceMiles))
                                                                      ? '0'
                                                                      : Number(load.routeDistanceMiles).toFixed(0)
                                                              } mi`
                                                            : 'N/A'}
                                                        {load.routeDurationHours && (
                                                            <div className="text-xs text-gray-400">
                                                                {Math.floor(Number(load.routeDurationHours))}h{' '}
                                                                {Math.round((Number(load.routeDurationHours) % 1) * 60)}
                                                                m
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                        {load.driverAssignments?.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {Array.from(
                                                                    new Map(
                                                                        load.driverAssignments.map((assignment) => [
                                                                            assignment.driver.id,
                                                                            assignment,
                                                                        ]),
                                                                    ).values(),
                                                                ).map((assignment, index, uniqueAssignments) => (
                                                                    <Link
                                                                        key={`${assignment.driver.id}-${index}`}
                                                                        href={`/drivers/${assignment.driver.id}`}
                                                                        className="font-medium cursor-pointer hover:underline"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                        }}
                                                                    >
                                                                        {assignment.driver?.name}
                                                                        {index < uniqueAssignments.length - 1
                                                                            ? ', '
                                                                            : ''}
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">No driver assigned</span>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded Row with Driver Assignment Details */}
                                                {isExpanded && routeLegs.length > 0 && (
                                                    <tr>
                                                        <td
                                                            colSpan={6}
                                                            className="p-0 bg-blue-50 border-t border-gray-100"
                                                        >
                                                            <div className="p-4">
                                                                <Tab.Group>
                                                                    <Tab.List className="flex space-x-1 rounded-xl bg-blue-100 p-1 mb-4">
                                                                        {routeLegs.map((routeLegData, idx) => (
                                                                            <Tab
                                                                                key={idx}
                                                                                className={({ selected }) =>
                                                                                    `w-full rounded-lg py-2 text-sm font-medium leading-5
                                          ${
                                              selected
                                                  ? 'bg-white shadow text-blue-700'
                                                  : 'text-blue-600 hover:bg-white/[0.12] hover:text-blue-700'
                                          }`
                                                                                }
                                                                            >
                                                                                Assignment {idx + 1}
                                                                                <span className="text-gray-400 text-xs">
                                                                                    {routeLegData.assignments.length >
                                                                                        1 &&
                                                                                        ` (${routeLegData.assignments.length} drivers)`}
                                                                                </span>
                                                                            </Tab>
                                                                        ))}
                                                                    </Tab.List>
                                                                    <Tab.Panels>
                                                                        {routeLegs.map((routeLegData, idx) => {
                                                                            const currentStatus = getCurrentStatus(
                                                                                routeLegData.routeLeg,
                                                                            );

                                                                            return (
                                                                                <Tab.Panel
                                                                                    key={idx}
                                                                                    className="rounded-xl bg-white p-4 shadow-sm border border-gray-100"
                                                                                >
                                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                                        {/* Route Details */}
                                                                                        <div className="md:col-span-2">
                                                                                            {/* Assignment Status - Moved to the top */}
                                                                                            <div className="mb-4">
                                                                                                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                                                                                                    Assignment Status
                                                                                                </h4>
                                                                                                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                                                                                    <div className="flex items-center">
                                                                                                        <div className="flex items-center">
                                                                                                            {currentStatus ===
                                                                                                            'COMPLETED' ? (
                                                                                                                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                                                                                                            ) : currentStatus ===
                                                                                                              'IN_PROGRESS' ? (
                                                                                                                <ClockIconOutline className="h-4 w-4 text-amber-500 mr-2" />
                                                                                                            ) : (
                                                                                                                <StopIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                                                                            )}
                                                                                                            <span className="text-sm font-medium text-gray-700">
                                                                                                                {currentStatus ===
                                                                                                                'COMPLETED'
                                                                                                                    ? 'Completed'
                                                                                                                    : currentStatus ===
                                                                                                                      'IN_PROGRESS'
                                                                                                                    ? 'In Progress'
                                                                                                                    : 'Assigned'}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        {routeLegIdUpdating ===
                                                                                                            routeLegData
                                                                                                                .routeLeg
                                                                                                                .id && (
                                                                                                            <Spinner className="px-4 text-blue-500" />
                                                                                                        )}
                                                                                                    </div>

                                                                                                    <div className="relative items-center">
                                                                                                        <Menu>
                                                                                                            <Menu.Button
                                                                                                                className="inline-flex items-center justify-center w-8 h-8 text-gray-400 bg-white rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                                                                                                onClick={(
                                                                                                                    e,
                                                                                                                ) =>
                                                                                                                    e.stopPropagation()
                                                                                                                }
                                                                                                            >
                                                                                                                <span className="sr-only">
                                                                                                                    Open
                                                                                                                    options
                                                                                                                </span>
                                                                                                                <EllipsisHorizontalIcon
                                                                                                                    className="w-5 h-5"
                                                                                                                    aria-hidden="true"
                                                                                                                />
                                                                                                            </Menu.Button>
                                                                                                            <Transition
                                                                                                                as={
                                                                                                                    Fragment
                                                                                                                }
                                                                                                                enter="transition ease-out duration-100"
                                                                                                                enterFrom="transform opacity-0 scale-95"
                                                                                                                enterTo="transform opacity-100 scale-100"
                                                                                                                leave="transition ease-in duration-75"
                                                                                                                leaveFrom="transform opacity-100 scale-100"
                                                                                                                leaveTo="transform opacity-0 scale-95"
                                                                                                            >
                                                                                                                <Menu.Items className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                                                                                    <div className="py-1">
                                                                                                                        {currentStatus !==
                                                                                                                            'ASSIGNED' && (
                                                                                                                            <Menu.Item>
                                                                                                                                {({
                                                                                                                                    active,
                                                                                                                                }) => (
                                                                                                                                    <button
                                                                                                                                        onClick={(
                                                                                                                                            e,
                                                                                                                                        ) => {
                                                                                                                                            e.stopPropagation();
                                                                                                                                            changeLegStatusClicked(
                                                                                                                                                'ASSIGNED',
                                                                                                                                                routeLegData
                                                                                                                                                    .routeLeg
                                                                                                                                                    .id,
                                                                                                                                            );
                                                                                                                                        }}
                                                                                                                                        disabled={
                                                                                                                                            changeLegStatusLoading
                                                                                                                                        }
                                                                                                                                        className={`${
                                                                                                                                            active
                                                                                                                                                ? 'bg-gray-50 text-gray-900'
                                                                                                                                                : 'text-gray-700'
                                                                                                                                        } flex w-full px-4 py-2 text-sm ${
                                                                                                                                            changeLegStatusLoading
                                                                                                                                                ? 'opacity-50 cursor-not-allowed'
                                                                                                                                                : ''
                                                                                                                                        }`}
                                                                                                                                    >
                                                                                                                                        Mark
                                                                                                                                        as
                                                                                                                                        Assigned
                                                                                                                                    </button>
                                                                                                                                )}
                                                                                                                            </Menu.Item>
                                                                                                                        )}

                                                                                                                        {currentStatus !==
                                                                                                                            'IN_PROGRESS' && (
                                                                                                                            <Menu.Item>
                                                                                                                                {({
                                                                                                                                    active,
                                                                                                                                }) => (
                                                                                                                                    <button
                                                                                                                                        onClick={(
                                                                                                                                            e,
                                                                                                                                        ) => {
                                                                                                                                            e.stopPropagation();
                                                                                                                                            changeLegStatusClicked(
                                                                                                                                                'IN_PROGRESS',
                                                                                                                                                routeLegData
                                                                                                                                                    .routeLeg
                                                                                                                                                    .id,
                                                                                                                                            );
                                                                                                                                        }}
                                                                                                                                        disabled={
                                                                                                                                            changeLegStatusLoading
                                                                                                                                        }
                                                                                                                                        className={`${
                                                                                                                                            active
                                                                                                                                                ? 'bg-gray-50 text-gray-900'
                                                                                                                                                : 'text-gray-700'
                                                                                                                                        } flex w-full px-4 py-2 text-sm ${
                                                                                                                                            changeLegStatusLoading
                                                                                                                                                ? 'opacity-50 cursor-not-allowed'
                                                                                                                                                : ''
                                                                                                                                        }`}
                                                                                                                                    >
                                                                                                                                        Mark
                                                                                                                                        as
                                                                                                                                        In
                                                                                                                                        Progress
                                                                                                                                    </button>
                                                                                                                                )}
                                                                                                                            </Menu.Item>
                                                                                                                        )}

                                                                                                                        {currentStatus !==
                                                                                                                            'COMPLETED' && (
                                                                                                                            <Menu.Item>
                                                                                                                                {({
                                                                                                                                    active,
                                                                                                                                }) => (
                                                                                                                                    <button
                                                                                                                                        onClick={(
                                                                                                                                            e,
                                                                                                                                        ) => {
                                                                                                                                            e.stopPropagation();
                                                                                                                                            changeLegStatusClicked(
                                                                                                                                                'COMPLETED',
                                                                                                                                                routeLegData
                                                                                                                                                    .routeLeg
                                                                                                                                                    .id,
                                                                                                                                            );
                                                                                                                                        }}
                                                                                                                                        disabled={
                                                                                                                                            changeLegStatusLoading
                                                                                                                                        }
                                                                                                                                        className={`${
                                                                                                                                            active
                                                                                                                                                ? 'bg-gray-50 text-gray-900'
                                                                                                                                                : 'text-gray-700'
                                                                                                                                        } flex w-full px-4 py-2 text-sm ${
                                                                                                                                            changeLegStatusLoading
                                                                                                                                                ? 'opacity-50 cursor-not-allowed'
                                                                                                                                                : ''
                                                                                                                                        }`}
                                                                                                                                    >
                                                                                                                                        Mark
                                                                                                                                        as
                                                                                                                                        Completed
                                                                                                                                    </button>
                                                                                                                                )}
                                                                                                                            </Menu.Item>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                </Menu.Items>
                                                                                                            </Transition>
                                                                                                        </Menu>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="flex justify-between items-center mb-3">
                                                                                                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                                                    Route Details
                                                                                                </h4>
                                                                                                {routeLegData.routeLeg
                                                                                                    .locations &&
                                                                                                    routeLegData
                                                                                                        .routeLeg
                                                                                                        .locations
                                                                                                        .length >=
                                                                                                        2 && (
                                                                                                        <a
                                                                                                            href={createGoogleMapsDirectionsUrl(
                                                                                                                routeLegData
                                                                                                                    .routeLeg
                                                                                                                    .locations,
                                                                                                            )}
                                                                                                            target="_blank"
                                                                                                            rel="noopener noreferrer"
                                                                                                            className="flex items-center text-blue-600 hover:text-blue-800 text-xs bg-blue-50 px-2 py-1 rounded-md"
                                                                                                            onClick={(
                                                                                                                e,
                                                                                                            ) =>
                                                                                                                e.stopPropagation()
                                                                                                            }
                                                                                                        >
                                                                                                            <MapIcon className="w-3.5 h-3.5 mr-1" />
                                                                                                            Get
                                                                                                            Directions
                                                                                                            <ArrowTopRightOnSquareIcon className="w-3 h-3 ml-0.5" />
                                                                                                        </a>
                                                                                                    )}
                                                                                            </div>
                                                                                            <div className="flex items-center mb-2">
                                                                                                <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                                                                <span className="text-sm font-medium text-gray-700">
                                                                                                    {formatDate(
                                                                                                        routeLegData
                                                                                                            .routeLeg
                                                                                                            .scheduledDate,
                                                                                                    )}{' '}
                                                                                                    at{' '}
                                                                                                    {formatTime(
                                                                                                        routeLegData
                                                                                                            .routeLeg
                                                                                                            .scheduledTime,
                                                                                                    )}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="flex items-center mb-2">
                                                                                                <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                                                                <span className="text-sm text-gray-700">
                                                                                                    {Math.round(
                                                                                                        Number(
                                                                                                            routeLegData
                                                                                                                .routeLeg
                                                                                                                .durationHours,
                                                                                                        ),
                                                                                                    )}{' '}
                                                                                                    hours (
                                                                                                    {Math.round(
                                                                                                        Number(
                                                                                                            routeLegData
                                                                                                                .routeLeg
                                                                                                                .distanceMiles,
                                                                                                        ),
                                                                                                    )}{' '}
                                                                                                    miles)
                                                                                                </span>
                                                                                            </div>
                                                                                            {routeLegData.routeLeg
                                                                                                .driverInstructions && (
                                                                                                <div className="flex items-start mb-4">
                                                                                                    <InformationCircleIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                                                                                                    <span className="text-sm text-gray-700">
                                                                                                        {
                                                                                                            routeLegData
                                                                                                                .routeLeg
                                                                                                                .driverInstructions
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Locations */}
                                                                                            {routeLegData.routeLeg
                                                                                                .locations &&
                                                                                                routeLegData.routeLeg
                                                                                                    .locations.length >
                                                                                                    0 && (
                                                                                                    <div className="mb-4">
                                                                                                        <h4 className="text-xs font-medium mt-4 text-gray-500 uppercase tracking-wider mb-3">
                                                                                                            Stops (
                                                                                                            {
                                                                                                                routeLegData
                                                                                                                    .routeLeg
                                                                                                                    .locations
                                                                                                                    .length
                                                                                                            }
                                                                                                            )
                                                                                                        </h4>
                                                                                                        <div className="relative pl-6 pb-1">
                                                                                                            {routeLegData
                                                                                                                .routeLeg
                                                                                                                .locations
                                                                                                                .length >
                                                                                                                1 && (
                                                                                                                <div className="absolute left-[9px] top-[24px] bottom-[24px] w-0.5 bg-gray-200"></div>
                                                                                                            )}

                                                                                                            {routeLegData.routeLeg.locations.map(
                                                                                                                (
                                                                                                                    locationItem,
                                                                                                                    index,
                                                                                                                ) => {
                                                                                                                    const isFirst =
                                                                                                                        index ===
                                                                                                                        0;
                                                                                                                    const isLast =
                                                                                                                        index ===
                                                                                                                        routeLegData
                                                                                                                            .routeLeg
                                                                                                                            .locations
                                                                                                                            .length -
                                                                                                                            1;
                                                                                                                    const isLoadStop =
                                                                                                                        locationItem.loadStop !==
                                                                                                                        null;
                                                                                                                    const isCustomLocation =
                                                                                                                        locationItem.location !==
                                                                                                                        null;

                                                                                                                    // Get location data based on type
                                                                                                                    const locationData =
                                                                                                                        isLoadStop
                                                                                                                            ? locationItem.loadStop
                                                                                                                            : locationItem.location;

                                                                                                                    if (
                                                                                                                        !locationData
                                                                                                                    )
                                                                                                                        return null;

                                                                                                                    // Determine stop type and styling
                                                                                                                    let stopTypeLabel =
                                                                                                                        '';
                                                                                                                    let iconColor =
                                                                                                                        '';

                                                                                                                    if (
                                                                                                                        isLoadStop
                                                                                                                    ) {
                                                                                                                        if (
                                                                                                                            locationItem
                                                                                                                                .loadStop
                                                                                                                                .type ===
                                                                                                                            'SHIPPER'
                                                                                                                        ) {
                                                                                                                            stopTypeLabel =
                                                                                                                                'Pickup';
                                                                                                                            iconColor =
                                                                                                                                'bg-green-500';
                                                                                                                        } else if (
                                                                                                                            locationItem
                                                                                                                                .loadStop
                                                                                                                                .type ===
                                                                                                                            'RECEIVER'
                                                                                                                        ) {
                                                                                                                            stopTypeLabel =
                                                                                                                                'Delivery';
                                                                                                                            iconColor =
                                                                                                                                'bg-red-500';
                                                                                                                        } else if (
                                                                                                                            locationItem
                                                                                                                                .loadStop
                                                                                                                                .type ===
                                                                                                                            'STOP'
                                                                                                                        ) {
                                                                                                                            stopTypeLabel =
                                                                                                                                'Stop';
                                                                                                                            iconColor =
                                                                                                                                'bg-amber-500';
                                                                                                                        }
                                                                                                                    } else if (
                                                                                                                        isCustomLocation
                                                                                                                    ) {
                                                                                                                        stopTypeLabel =
                                                                                                                            'Custom Location';
                                                                                                                        iconColor =
                                                                                                                            'bg-purple-500';
                                                                                                                    }

                                                                                                                    return (
                                                                                                                        <div
                                                                                                                            key={
                                                                                                                                locationItem.id
                                                                                                                            }
                                                                                                                            className={`relative ${
                                                                                                                                !isLast
                                                                                                                                    ? 'mb-5'
                                                                                                                                    : ''
                                                                                                                            }`}
                                                                                                                        >
                                                                                                                            <div className="absolute left-[-24px] top-1">
                                                                                                                                <div
                                                                                                                                    className={`h-5 w-5 rounded-full ${
                                                                                                                                        isFirst
                                                                                                                                            ? 'bg-green-100'
                                                                                                                                            : isLast
                                                                                                                                            ? 'bg-red-100'
                                                                                                                                            : 'bg-gray-100'
                                                                                                                                    } flex items-center justify-center`}
                                                                                                                                >
                                                                                                                                    <div
                                                                                                                                        className={`h-2.5 w-2.5 rounded-full ${iconColor}`}
                                                                                                                                    ></div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div>
                                                                                                                                <div className="flex items-center">
                                                                                                                                    <h5 className="font-semibold text-sm text-gray-900">
                                                                                                                                        {
                                                                                                                                            stopTypeLabel
                                                                                                                                        }
                                                                                                                                    </h5>
                                                                                                                                    {locationData.date && (
                                                                                                                                        <span className="ml-2 text-xs text-gray-500">
                                                                                                                                            {formatDate(
                                                                                                                                                locationData.date.toString(),
                                                                                                                                            )}{' '}
                                                                                                                                            at{' '}
                                                                                                                                            {formatTime(
                                                                                                                                                locationData.time,
                                                                                                                                            )}
                                                                                                                                        </span>
                                                                                                                                    )}
                                                                                                                                    {locationData.latitude &&
                                                                                                                                        locationData.longitude && (
                                                                                                                                            <a
                                                                                                                                                href={createGoogleMapsUrl(
                                                                                                                                                    Number(
                                                                                                                                                        locationData.latitude,
                                                                                                                                                    ),
                                                                                                                                                    Number(
                                                                                                                                                        locationData.longitude,
                                                                                                                                                    ),
                                                                                                                                                    load.loadNum,
                                                                                                                                                )}
                                                                                                                                                target="_blank"
                                                                                                                                                rel="noopener noreferrer"
                                                                                                                                                className="ml-auto flex items-center text-gray-400 hover:text-blue-600 text-xs"
                                                                                                                                                onClick={(
                                                                                                                                                    e,
                                                                                                                                                ) =>
                                                                                                                                                    e.stopPropagation()
                                                                                                                                                }
                                                                                                                                            >
                                                                                                                                                <MapIcon className="w-3.5 h-3.5 mr-1" />
                                                                                                                                                Map
                                                                                                                                                <ArrowTopRightOnSquareIcon className="w-3 h-3 ml-0.5" />
                                                                                                                                            </a>
                                                                                                                                        )}
                                                                                                                                </div>
                                                                                                                                <p className="text-sm text-gray-700 font-medium mt-1">
                                                                                                                                    {
                                                                                                                                        locationData.name
                                                                                                                                    }
                                                                                                                                </p>
                                                                                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                                                                                    {
                                                                                                                                        locationData.street
                                                                                                                                    }

                                                                                                                                    ,{' '}
                                                                                                                                    {
                                                                                                                                        locationData.city
                                                                                                                                    }

                                                                                                                                    ,{' '}
                                                                                                                                    {
                                                                                                                                        locationData.state
                                                                                                                                    }{' '}
                                                                                                                                    {
                                                                                                                                        locationData.zip
                                                                                                                                    }
                                                                                                                                </p>
                                                                                                                                {isLoadStop &&
                                                                                                                                    locationItem
                                                                                                                                        .loadStop
                                                                                                                                        .pickUpNumbers && (
                                                                                                                                        <p className="text-xs text-gray-500 mt-1.5">
                                                                                                                                            <span className="font-medium">
                                                                                                                                                {locationItem
                                                                                                                                                    .loadStop
                                                                                                                                                    .type ===
                                                                                                                                                'RECEIVER'
                                                                                                                                                    ? 'Confirmation #:'
                                                                                                                                                    : 'Pickup #:'}
                                                                                                                                            </span>{' '}
                                                                                                                                            {
                                                                                                                                                locationItem
                                                                                                                                                    .loadStop
                                                                                                                                                    .pickUpNumbers
                                                                                                                                            }
                                                                                                                                        </p>
                                                                                                                                    )}
                                                                                                                                {isLoadStop &&
                                                                                                                                    locationItem
                                                                                                                                        .loadStop
                                                                                                                                        .referenceNumbers && (
                                                                                                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                                                                                                            <span className="font-medium">
                                                                                                                                                Reference
                                                                                                                                                #:
                                                                                                                                            </span>{' '}
                                                                                                                                            {
                                                                                                                                                locationItem
                                                                                                                                                    .loadStop
                                                                                                                                                    .referenceNumbers
                                                                                                                                            }
                                                                                                                                        </p>
                                                                                                                                    )}
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    );
                                                                                                                },
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}

                                                                                            {/* Location Updates */}
                                                                                            {(routeLegData.routeLeg
                                                                                                .startLatitude ||
                                                                                                routeLegData.routeLeg
                                                                                                    .endLatitude) && (
                                                                                                <div className="mt-4">
                                                                                                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                                                                                        Location Updates
                                                                                                    </h4>
                                                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                                        {routeLegData
                                                                                                            .routeLeg
                                                                                                            .startLatitude &&
                                                                                                            routeLegData
                                                                                                                .routeLeg
                                                                                                                .startLongitude && (
                                                                                                                <div className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                                                                                                                    <div className="flex items-center justify-between">
                                                                                                                        <h5 className="text-xs font-semibold text-gray-700">
                                                                                                                            <div className="flex items-center">
                                                                                                                                <div className="h-3 w-3 rounded-full bg-amber-500 mr-1.5"></div>
                                                                                                                                Started
                                                                                                                            </div>
                                                                                                                        </h5>
                                                                                                                        <a
                                                                                                                            href={createGoogleMapsUrl(
                                                                                                                                Number(
                                                                                                                                    routeLegData
                                                                                                                                        .routeLeg
                                                                                                                                        .startLatitude,
                                                                                                                                ),
                                                                                                                                Number(
                                                                                                                                    routeLegData
                                                                                                                                        .routeLeg
                                                                                                                                        .startLongitude,
                                                                                                                                ),
                                                                                                                                load.loadNum,
                                                                                                                            )}
                                                                                                                            target="_blank"
                                                                                                                            rel="noopener noreferrer"
                                                                                                                            className="flex items-center text-blue-600 hover:text-blue-800 text-xs"
                                                                                                                            onClick={(
                                                                                                                                e,
                                                                                                                            ) =>
                                                                                                                                e.stopPropagation()
                                                                                                                            }
                                                                                                                        >
                                                                                                                            <MapIcon className="w-3.5 h-3.5 mr-1" />
                                                                                                                            Map
                                                                                                                            <ArrowTopRightOnSquareIcon className="w-3 h-3 ml-0.5" />
                                                                                                                        </a>
                                                                                                                    </div>
                                                                                                                    {routeLegData
                                                                                                                        .routeLeg
                                                                                                                        .startedAt && (
                                                                                                                        <p className="text-xs text-gray-500 mt-1.5">
                                                                                                                            {formatDate(
                                                                                                                                routeLegData
                                                                                                                                    .routeLeg
                                                                                                                                    .startedAt,
                                                                                                                            )}{' '}
                                                                                                                            at{' '}
                                                                                                                            {new Date(
                                                                                                                                routeLegData.routeLeg.startedAt,
                                                                                                                            ).toLocaleTimeString(
                                                                                                                                [],
                                                                                                                                {
                                                                                                                                    hour: '2-digit',
                                                                                                                                    minute: '2-digit',
                                                                                                                                },
                                                                                                                            )}
                                                                                                                        </p>
                                                                                                                    )}
                                                                                                                    <p className="text-xs text-gray-500 mt-1.5">
                                                                                                                        Location
                                                                                                                        updated
                                                                                                                        when
                                                                                                                        assignment
                                                                                                                        was
                                                                                                                        marked
                                                                                                                        as
                                                                                                                        in
                                                                                                                        progress
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                            )}

                                                                                                        {routeLegData
                                                                                                            .routeLeg
                                                                                                            .endLatitude &&
                                                                                                            routeLegData
                                                                                                                .routeLeg
                                                                                                                .endLongitude && (
                                                                                                                <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                                                                                                                    <div className="flex items-center justify-between">
                                                                                                                        <h5 className="text-xs font-semibold text-gray-700">
                                                                                                                            <div className="flex items-center">
                                                                                                                                <div className="h-3 w-3 rounded-full bg-green-500 mr-1.5"></div>
                                                                                                                                Completed
                                                                                                                            </div>
                                                                                                                        </h5>
                                                                                                                        <a
                                                                                                                            href={createGoogleMapsUrl(
                                                                                                                                Number(
                                                                                                                                    routeLegData
                                                                                                                                        .routeLeg
                                                                                                                                        .endLatitude,
                                                                                                                                ),
                                                                                                                                Number(
                                                                                                                                    routeLegData
                                                                                                                                        .routeLeg
                                                                                                                                        .endLongitude,
                                                                                                                                ),
                                                                                                                                load.loadNum,
                                                                                                                            )}
                                                                                                                            target="_blank"
                                                                                                                            rel="noopener noreferrer"
                                                                                                                            className="flex items-center text-blue-600 hover:text-blue-800 text-xs"
                                                                                                                            onClick={(
                                                                                                                                e,
                                                                                                                            ) =>
                                                                                                                                e.stopPropagation()
                                                                                                                            }
                                                                                                                        >
                                                                                                                            <MapIcon className="w-3.5 h-3.5 mr-1" />
                                                                                                                            Map
                                                                                                                            <ArrowTopRightOnSquareIcon className="w-3 h-3 ml-0.5" />
                                                                                                                        </a>
                                                                                                                    </div>
                                                                                                                    {routeLegData
                                                                                                                        .routeLeg
                                                                                                                        .endedAt && (
                                                                                                                        <p className="text-xs text-gray-500 mt-1.5">
                                                                                                                            {formatDate(
                                                                                                                                routeLegData
                                                                                                                                    .routeLeg
                                                                                                                                    .endedAt,
                                                                                                                            )}{' '}
                                                                                                                            at{' '}
                                                                                                                            {new Date(
                                                                                                                                routeLegData.routeLeg.endedAt,
                                                                                                                            ).toLocaleTimeString(
                                                                                                                                [],
                                                                                                                                {
                                                                                                                                    hour: '2-digit',
                                                                                                                                    minute: '2-digit',
                                                                                                                                },
                                                                                                                            )}
                                                                                                                        </p>
                                                                                                                    )}
                                                                                                                    <p className="text-xs text-gray-500 mt-1.5">
                                                                                                                        Location
                                                                                                                        updated
                                                                                                                        when
                                                                                                                        assignment
                                                                                                                        was
                                                                                                                        marked
                                                                                                                        as
                                                                                                                        completed
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                            )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>

                                                                                        {/* Driver Assignments */}
                                                                                        <div>
                                                                                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                                                                                                Assigned Drivers (
                                                                                                {
                                                                                                    routeLegData
                                                                                                        .assignments
                                                                                                        .length
                                                                                                }
                                                                                                )
                                                                                            </h4>
                                                                                            <div className="space-y-3">
                                                                                                {routeLegData.assignments.map(
                                                                                                    (
                                                                                                        assignment,
                                                                                                        assignmentIdx,
                                                                                                    ) => (
                                                                                                        <div
                                                                                                            key={
                                                                                                                assignmentIdx
                                                                                                            }
                                                                                                            className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm"
                                                                                                        >
                                                                                                            <div className="flex items-center mb-2">
                                                                                                                <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                                                                                <Link
                                                                                                                    href={`/drivers/${assignment.driver.id}`}
                                                                                                                    className="text-sm font-medium text-blue-600 hover:underline"
                                                                                                                    onClick={(
                                                                                                                        e,
                                                                                                                    ) => {
                                                                                                                        e.stopPropagation();
                                                                                                                    }}
                                                                                                                >
                                                                                                                    {
                                                                                                                        assignment
                                                                                                                            .driver
                                                                                                                            .name
                                                                                                                    }
                                                                                                                </Link>
                                                                                                            </div>
                                                                                                            <div className="flex items-center mb-2">
                                                                                                                <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                                                                                <a
                                                                                                                    href={`tel:${assignment.driver.phone}`}
                                                                                                                    className="text-sm text-gray-700 hover:underline"
                                                                                                                    onClick={(
                                                                                                                        e,
                                                                                                                    ) =>
                                                                                                                        e.stopPropagation()
                                                                                                                    }
                                                                                                                >
                                                                                                                    {formatPhoneNumber(
                                                                                                                        assignment
                                                                                                                            .driver
                                                                                                                            .phone,
                                                                                                                    )}
                                                                                                                </a>
                                                                                                            </div>
                                                                                                            <div className="flex items-center">
                                                                                                                <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-2" />
                                                                                                                <span className="text-sm text-gray-700">
                                                                                                                    {assignment.chargeType ===
                                                                                                                    'PER_HOUR'
                                                                                                                        ? `$${assignment.chargeValue}/hr`
                                                                                                                        : assignment.chargeType ===
                                                                                                                          'PER_MILE'
                                                                                                                        ? `$${assignment.chargeValue}/mi`
                                                                                                                        : `$${assignment.chargeValue} (fixed)`}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ),
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="flex flex-1 flex-row gap-2 items-end justify-end my-4">
                                                                                                <Link
                                                                                                    href={`/loads/${load.id}`}
                                                                                                    target="_blank"
                                                                                                    className="text-sm px-4 py-1.5 bg-blue-600 w-fit text-white rounded-lg  hover:bg-blue-700 transition text-center"
                                                                                                >
                                                                                                    View Load
                                                                                                </Link>
                                                                                                <Link
                                                                                                    href={`/loads/${load.id}?routeLegId=${routeLegData.routeLeg?.id}`}
                                                                                                    target="_blank"
                                                                                                    className="text-sm px-4 py-1.5 bg-blue-600 w-fit text-white rounded-lg shadow-md hover:bg-blue-700 transition text-center"
                                                                                                >
                                                                                                    Edit Assignment
                                                                                                </Link>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </Tab.Panel>
                                                                            );
                                                                        })}
                                                                    </Tab.Panels>
                                                                </Tab.Group>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

            {viewMode === 'map' &&
                (loadsList?.length === 0 ? (
                    <LoadingLoadMapViewSkeleton />
                ) : (
                    <div className="px-0 pb-0 relative ">
                        <div
                            ref={mapContainer}
                            className="w-full h-[50vh] md:h-[80vh] rounded-lg border border-gray-200 overflow-hidden relative "
                            style={{ background: '#f8f8f8' }}
                        />

                        {/* Compact load cards overlay */}
                        <div className="relative md:absolute bottom-0 top-0 left-0 z-20 px-0 pb-0 overflow-x-auto md:overflow-y-auto hide-scrollbar">
                            <div className="relative  ">
                                <div
                                    ref={carouselRef}
                                    className="flex flex-row md:flex-col md:overflow-y-auto md:overflow-x-hidden
                                      overflow-x-auto hide-scrollbar px-0 md:px-2 my-4"
                                >
                                    {loadsList?.map((load, i) => {
                                        const allDates = [
                                            load.shipper.date,
                                            load.receiver.date,
                                            ...load.stops.map((stop) => stop.date),
                                        ];

                                        const now = new Date();
                                        now.setHours(0, 0, 0, 0); // Set current time to midnight

                                        const allDatesInPast = allDates.every((dateStr) => {
                                            const date = new Date(dateStr);
                                            date.setHours(0, 0, 0, 0); // Set stop date to midnight
                                            return date < now;
                                        });

                                        return (
                                            <div
                                                key={load.id}
                                                className={`
                                                  snap-start
                                                  flex-shrink-0
                                                  w-72 m-2
                                                   ${
                                                       load.driverAssignments.length === 0 && !allDatesInPast
                                                           ? 'bg-red-50 hover:bg-red-100'
                                                           : ' bg-white hover:bg-slate-50'
                                                   } ${
                                                    allDatesInPast ? '!bg-red-100 !hover:bg-red-200' : ' '
                                                } rounded-lg
                                                  border
                                                  ${
                                                      selectedLoadId === load.id
                                                          ? 'border-blue-800 ring-2 ring-blue-700'
                                                          : 'border-gray-200'
                                                  }
                                                  shadow-sm hover:shadow-xl
                                                  transition-shadow
                                                  cursor-pointer
                                                  overflow-visible
                                                `}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const newId = load.id === selectedLoadId ? null : load.id;
                                                    setSelectedLoadId(newId);

                                                    if (newId === null) {
                                                        // Reset all routes
                                                        loadsList?.forEach((l) => {
                                                            const rid = `route-${l.id}`;
                                                            if (map.current!.getLayer(rid)) {
                                                                map.current!.setPaintProperty(
                                                                    rid,
                                                                    'line-color',
                                                                    '#3b82f6',
                                                                )
                                                                    .setPaintProperty(rid, 'line-width', 3)
                                                                    .setPaintProperty(rid, 'line-opacity', 0.8);
                                                            }
                                                        });

                                                        if (map.current && load.routeEncoded) {
                                                            // fit bounds
                                                            const coords = decodePolyline(load.routeEncoded);
                                                            if (coords.length) {
                                                                const bounds = new mapboxgl.LngLatBounds();
                                                                coords.forEach((c) =>
                                                                    bounds.extend(c as [number, number]),
                                                                );
                                                                map.current.fitBounds(bounds, {
                                                                    padding: boundPadding,
                                                                    maxZoom: 18,
                                                                });
                                                            }
                                                        }
                                                    } else {
                                                        if (map.current && load.routeEncoded) {
                                                            // reset all routes
                                                            loadsList?.forEach((l) => {
                                                                const rid = `route-${l.id}`;
                                                                if (map.current!.getLayer(rid)) {
                                                                    map.current!.setPaintProperty(
                                                                        rid,
                                                                        'line-color',
                                                                        '#3b82f6',
                                                                    )
                                                                        .setPaintProperty(rid, 'line-width', 3)
                                                                        .setPaintProperty(rid, 'line-opacity', 0);
                                                                }
                                                            });

                                                            // highlight selected
                                                            const selectedRouteId = `route-${load.id}`;
                                                            if (map.current.getLayer(selectedRouteId)) {
                                                                map.current
                                                                    .setPaintProperty(
                                                                        selectedRouteId,
                                                                        'line-color',
                                                                        '#00008B',
                                                                    )
                                                                    .setPaintProperty(selectedRouteId, 'line-width', 4)
                                                                    .setPaintProperty(
                                                                        selectedRouteId,
                                                                        'line-opacity',
                                                                        1,
                                                                    );
                                                            }

                                                            // fit bounds
                                                            const coords = decodePolyline(load.routeEncoded);
                                                            if (coords.length) {
                                                                const bounds = new mapboxgl.LngLatBounds();
                                                                coords.forEach((c) =>
                                                                    bounds.extend(c as [number, number]),
                                                                );
                                                                map.current.fitBounds(bounds, {
                                                                    padding: boundPadding,
                                                                    maxZoom: 18,
                                                                });
                                                            }
                                                        }
                                                    }
                                                }}
                                            >
                                                <div className="p-3 pb-1">
                                                    <div className="relative flex justify-between items-start mb-2">
                                                        <div>
                                                            <div className="text-xs text-gray-500">
                                                                <Link
                                                                    href={`/loads/${load.id}`}
                                                                    className="font-medium cursor-pointer hover:underline"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                    }}
                                                                >
                                                                    Order# {load.refNum}
                                                                </Link>
                                                            </div>
                                                            <div className="font-semibold text-sm text-gray-900 truncate uppercase">
                                                                {load.customer.name}
                                                            </div>
                                                        </div>
                                                        <div className="absolute -top-6 right-0">
                                                            <LoadStatusBadge load={load} />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-2 mb-1.5">
                                                        <div className="flex-shrink-0">
                                                            <div className="flex items-center justify-center w-5 h-5 bg-green-100 rounded-full">
                                                                <TruckIcon
                                                                    className="w-3 h-3 text-green-800"
                                                                    aria-hidden="true"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-gray-600 truncate capitalize">
                                                            {load.shipper.name.toUpperCase()} (
                                                            {load.shipper.city.toLowerCase()},{' '}
                                                            {load.shipper.state.toUpperCase()})
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <div className="flex-shrink-0">
                                                            <div className="flex items-center justify-center w-5 h-5 bg-red-100 rounded-full">
                                                                <MapPinIcon
                                                                    className="w-3 h-3 text-red-800"
                                                                    aria-hidden="true"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-gray-600 truncate capitalize">
                                                            {load.receiver.name.toUpperCase()} (
                                                            {load.receiver.city.toLowerCase()},{' '}
                                                            {load.receiver.state.toUpperCase()})
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center text-xs">
                                                        <div className="text-gray-500">
                                                            {load.routeDistanceMiles
                                                                ? `${
                                                                      isNaN(Number(load.routeDistanceMiles))
                                                                          ? '0'
                                                                          : Number(load.routeDistanceMiles).toFixed(0)
                                                                  } mi`
                                                                : 'N/A'}
                                                            {load.routeDurationHours && (
                                                                <span>
                                                                    {' '}
                                                                    · {Math.floor(
                                                                        Number(load.routeDurationHours),
                                                                    )}h{' '}
                                                                    {Math.round(
                                                                        (Number(load.routeDurationHours) % 1) * 60,
                                                                    )}
                                                                    m
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-start">
                                                            <Link
                                                                href={`/loads/${load.id}`}
                                                                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                View Load →
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="font-medium text-xs text-gray-700 truncate p-3 pt-1">
                                                    {load.driverAssignments?.length ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {Array.from(
                                                                new Map(
                                                                    load.driverAssignments.map((a) => [a.driver.id, a]),
                                                                ).values(),
                                                            ).map((assignment, i, arr) => (
                                                                <Link
                                                                    key={`${assignment.driver.id}-${i}`}
                                                                    href={`/drivers/${assignment.driver.id}`}
                                                                    className="font-medium hover:underline"
                                                                    onClick={(e) => {
                                                                        getAssignment(
                                                                            assignment.id,
                                                                            assignment.driver.id,
                                                                        );
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                    }}
                                                                >
                                                                    {assignment.driver.name}
                                                                    {i < arr.length - 1 ? ', ' : ''}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">No driver assigned</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
        </div>
    );
};

export default LoadViewToggle;

const LoadingLoadViewTableSkeleton = () => {
    // Create an array of 8 items to map over
    const skeletonRows = Array(6).fill(null);

    return (
        <div className="px-0 overflow-x-auto pb-0 border border-gray-200 rounded-lg shadow-sm">
            <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200 border-collapse">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600">
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold uppercase">
                                Load
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase">
                                Status
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase">
                                Pickup
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase">
                                Delivery
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase">
                                Distance
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold uppercase">
                                Driver
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {skeletonRows.map((_, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                    <div className="flex flex-col">
                                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <div className="flex items-start space-x-2">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <div className="flex items-center justify-center w-6 h-6 bg-green-100 rounded-full">
                                                <TruckIcon
                                                    className="w-3 h-3 text-green-800 opacity-50"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
                                            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                                            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <div className="flex items-start space-x-2">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                                                <MapPinIcon
                                                    className="w-3 h-3 text-red-800 opacity-50"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
                                            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
                                            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                                            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
                                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const LoadingLoadMapViewSkeleton = () => {
    // Number of skeleton cards to display
    const skeletonCount = 5;

    return (
        <div className="px-0 pb-0 relative">
            {/* Map loading skeleton */}
            <div className="w-full h-[50vh] md:h-[80vh] rounded-lg border border-gray-200 overflow-hidden relative z-10 bg-gray-100">
                {/* Map placeholder with shimmer effect */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <MapIcon className="w-16 h-16 text-gray-300" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            </div>

            {/* Loads list skeleton overlay */}
            <div className="relative md:absolute bottom-0 top-0 left-0 z-20 px-0 pb-0 overflow-x-auto md:overflow-y-auto hide-scrollbar">
                <div className="relative">
                    {/* Scroll container */}
                    <div className="flex flex-row md:flex-col overflow-y-auto hide-scrollbar px-2 my-4">
                        {Array.from({ length: skeletonCount }).map((_, i) => (
                            <div
                                key={i}
                                className="snap-start flex-shrink-0 w-72 m-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible"
                            >
                                <div className="p-3 pb-1">
                                    <div className="relative flex justify-between items-start mb-2">
                                        <div className="w-full">
                                            <div className="h-3 w-16 bg-gray-200 rounded mb-2 animate-pulse"></div>
                                            <div className="h-4 w-36 bg-gray-300 rounded animate-pulse"></div>
                                        </div>
                                        <div className="absolute -top-6 right-0">
                                            <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2 mb-1.5">
                                        <div className="flex-shrink-0">
                                            <div className="flex items-center justify-center w-5 h-5 bg-green-100 rounded-full">
                                                <TruckIcon className="w-3 h-3 text-green-300" aria-hidden="true" />
                                            </div>
                                        </div>
                                        <div className="h-3 w-40 bg-gray-200 rounded animate-pulse"></div>
                                    </div>

                                    <div className="flex items-center space-x-2 mb-2">
                                        <div className="flex-shrink-0">
                                            <div className="flex items-center justify-center w-5 h-5 bg-red-100 rounded-full">
                                                <MapPinIcon className="w-3 h-3 text-red-300" aria-hidden="true" />
                                            </div>
                                        </div>
                                        <div className="h-3 w-40 bg-gray-200 rounded animate-pulse"></div>
                                    </div>

                                    <div className="flex justify-between items-center text-xs">
                                        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                                        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="p-3 pt-1">
                                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
