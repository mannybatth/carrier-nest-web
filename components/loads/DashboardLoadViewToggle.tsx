'use client';

import React, { useState, useEffect, useRef, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Tab, Listbox, Popover, Transition, Menu } from '@headlessui/react';
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
    ChevronUpDownIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    FunnelIcon,
    PencilIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ExpandedDriverAssignment, ExpandedLoad } from 'interfaces/models';
import LoadStatusBadge from './LoadStatusBadge';
import { formatDate, formatPhoneNumber } from 'lib/helpers/format';
import { format, set, formatDistanceToNow } from 'date-fns';
import SwitchWithLabel from 'components/switchWithLabel';
import { getAssignmentById } from 'lib/rest/assignment';
import AssignmentPopup from 'components/assignment/AssignmentPopup';
import { updateRouteLegStatus } from 'lib/rest/routeLeg';
import { notify } from 'components/notifications/Notification';
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
    const router = useRouter();
    const [loadingAssignment, setLoadingAssignment] = useState(false);
    const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
    const [modalAssignment, setModalAssignment] = useState<ExpandedDriverAssignment | null>(null);
    const [assignmentId, setAssignmentId] = useState<string | null>(null);
    const [expandedLoadId, setExpandedLoadId] = useState<string | null>(null);
    const [changeLegStatusLoading, setChangeLegStatusLoading] = useState(false);
    const [updatedStatuses, setUpdatedStatuses] = useState<Record<string, string>>({});

    // New state for filtering and sorting with persistence
    const [selectedDriverIds, setSelectedDriverIds] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<{
        key: string | null;
        direction: 'asc' | 'desc';
    }>({ key: null, direction: 'asc' });

    // State for tracking last updated time
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // Popover positioning refs and state
    const driverFilterButtonRef = useRef<HTMLButtonElement>(null);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, right: 0 });
    const [isDriverPopoverOpen, setIsDriverPopoverOpen] = useState(false);

    // Calculate popover position when opened
    const updatePopoverPosition = () => {
        if (driverFilterButtonRef.current) {
            const rect = driverFilterButtonRef.current.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setPopoverPosition({
                top: rect.bottom + scrollTop + 8, // 8px spacing below button
                right: window.innerWidth - rect.right, // Align right edge of popover with right edge of button
            });
        }
    };

    // Close popover on scroll
    const handleScroll = () => {
        if (isDriverPopoverOpen) {
            setIsDriverPopoverOpen(false);
        }
    };

    // Add scroll event listener when popover is open
    React.useEffect(() => {
        if (isDriverPopoverOpen) {
            window.addEventListener('scroll', handleScroll, true);
            return () => {
                window.removeEventListener('scroll', handleScroll, true);
            };
        }
    }, [isDriverPopoverOpen]);

    // Initialize state from localStorage on mount
    React.useEffect(() => {
        try {
            const savedDriverIds = localStorage.getItem('selectedDriverIds');
            if (savedDriverIds) {
                setSelectedDriverIds(JSON.parse(savedDriverIds));
            }
        } catch (error) {
            console.warn('Failed to load saved driver IDs:', error);
        }

        try {
            const savedSortConfig = localStorage.getItem('loadsSortConfig');
            if (savedSortConfig) {
                setSortConfig(JSON.parse(savedSortConfig));
            }
        } catch (error) {
            console.warn('Failed to load saved sort config:', error);
        }
    }, []);

    // Update last updated time when loadsList changes (new data received)
    React.useEffect(() => {
        if (loadsList.length > 0) {
            setLastUpdated(new Date());
        }
    }, [loadsList]);

    const [routeLegIdUpdating, setRouteLegIdUpdating] = useState<string | null>(null);

    // Status order for sorting
    const statusOrder = ['BOOKED', 'IN_PROGRESS', 'DELIVERED', 'POD_READY', 'INVOICED', 'PAID'];

    // Get all unique drivers from current loads
    const allDrivers = React.useMemo(() => {
        const driverMap = new Map();
        loadsList.forEach((load) => {
            load.driverAssignments?.forEach((assignment) => {
                if (assignment.driver && assignment.driver.id) {
                    driverMap.set(assignment.driver.id, {
                        id: assignment.driver.id,
                        name: assignment.driver.name || 'Unknown Driver',
                    });
                }
            });
        });
        return Array.from(driverMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [loadsList]);

    // Check if there are any unassigned loads
    const hasUnassignedLoads = React.useMemo(() => {
        return loadsList.some((load) => !load.driverAssignments || load.driverAssignments.length === 0);
    }, [loadsList]);

    // Persist filter and sort changes
    React.useEffect(() => {
        try {
            localStorage.setItem('selectedDriverIds', JSON.stringify(selectedDriverIds));
        } catch (error) {
            console.warn('Failed to save driver IDs:', error);
        }
    }, [selectedDriverIds]);

    React.useEffect(() => {
        try {
            localStorage.setItem('loadsSortConfig', JSON.stringify(sortConfig));
        } catch (error) {
            console.warn('Failed to save sort config:', error);
        }
    }, [sortConfig]);

    // Clean up selected drivers that no longer exist in current loads
    React.useEffect(() => {
        if (allDrivers.length === 0 || selectedDriverIds.length === 0) return;

        const currentDriverIds = allDrivers.map((driver) => driver.id);
        // Keep 'unassigned' as it's a special filter, only validate actual driver IDs
        const validSelectedDriverIds = selectedDriverIds.filter(
            (id) => id === 'unassigned' || currentDriverIds.includes(id),
        );

        if (validSelectedDriverIds.length !== selectedDriverIds.length) {
            setSelectedDriverIds(validSelectedDriverIds);
        }
    }, [allDrivers]); // Only watch allDrivers, not selectedDriverIds to avoid infinite loop

    // Clear all filters and sorting including Today Only
    const clearAllFilters = () => {
        setSelectedDriverIds([]);
        setSortConfig({ key: null, direction: 'asc' });
        // Clear localStorage
        localStorage.removeItem('selectedDriverIds');
        localStorage.removeItem('loadsSortConfig');
        // Also clear Today Only filter by calling the parent's toggle function if it's currently enabled
        if (showTodayOnly) {
            setShowTodayOnly(false); // Update local state immediately
            localStorage.setItem('todayDataOnly', 'false'); // Update localStorage
            todayDataOnly(); // Call parent function to update parent state and reload data
        }
    };

    // Refresh load list - clears all filters and triggers data reload
    const refreshLoadList = () => {
        // Clear all filters first
        clearAllFilters();
        // Update last updated timestamp
        setLastUpdated(new Date());
        // Trigger parent data refresh
        todayDataOnly();
    };

    // Sorting function
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        const newSortConfig = { key, direction };
        setSortConfig(newSortConfig);
    };

    // Handle driver selection for better UX
    const handleDriverSelection = (driverId: string) => {
        setSelectedDriverIds((prev) => {
            const newIds = prev.includes(driverId) ? prev.filter((id) => id !== driverId) : [...prev, driverId];
            return newIds;
        });
    };

    // Debug function to check localStorage
    const debugLocalStorage = () => {
        // Debug information removed for production
    };

    // Add debug logging for persistence
    React.useEffect(() => {
        debugLocalStorage();
    }, []);

    // Filter and sort loads
    const filteredAndSortedLoads = React.useMemo(() => {
        let filtered = [...loadsList];

        // Apply driver filter
        if (selectedDriverIds.length > 0) {
            filtered = filtered.filter((load) => {
                // Check for unassigned loads
                if (selectedDriverIds.includes('unassigned')) {
                    const isUnassigned = !load.driverAssignments || load.driverAssignments.length === 0;
                    if (isUnassigned) return true;
                }

                // Check for assigned drivers
                const loadDriverIds =
                    load.driverAssignments?.map((assignment) => assignment.driver?.id).filter(Boolean) || [];
                return loadDriverIds.some((driverId) => selectedDriverIds.includes(driverId!));
            });
        }

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (sortConfig.key) {
                    case 'load':
                        aValue = parseInt(a.loadNum?.replace('LD-', '') || '0');
                        bValue = parseInt(b.loadNum?.replace('LD-', '') || '0');
                        break;
                    case 'status':
                        const aStatusIndex = statusOrder.indexOf(a.status);
                        const bStatusIndex = statusOrder.indexOf(b.status);
                        aValue = aStatusIndex === -1 ? statusOrder.length : aStatusIndex;
                        bValue = bStatusIndex === -1 ? statusOrder.length : bStatusIndex;
                        break;
                    case 'pickup':
                        aValue = new Date(a.shipper.date);
                        bValue = new Date(b.shipper.date);
                        break;
                    case 'delivery':
                        aValue = new Date(a.receiver.date);
                        bValue = new Date(b.receiver.date);
                        break;
                    case 'distance':
                        aValue = parseFloat(a.routeDistanceMiles?.toString() || '0');
                        bValue = parseFloat(b.routeDistanceMiles?.toString() || '0');
                        break;
                    case 'driver':
                        // Get first driver name for sorting
                        const aDrivers = a.driverAssignments?.map((assignment) => assignment.driver?.name) || [];
                        const bDrivers = b.driverAssignments?.map((assignment) => assignment.driver?.name) || [];
                        aValue = aDrivers.length > 0 ? aDrivers[0] || '' : '';
                        bValue = bDrivers.length > 0 ? bDrivers[0] || '' : '';
                        break;
                    default:
                        return 0;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [loadsList, selectedDriverIds, sortConfig]);

    // Helper function to get column header styling based on sort state
    const getColumnHeaderClass = (column: string, baseClass: string) => {
        const isActiveSorted = sortConfig.key === column;
        return `${baseClass} ${isActiveSorted ? 'text-blue-900' : ''} hover:bg-gray-100 transition-all duration-200`;
    };

    // Sort indicator component
    const SortIndicator = ({ column }: { column: string }) => {
        const isActiveSorted = sortConfig.key === column;
        const buttonClass = `flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200 ${
            isActiveSorted ? 'bg-blue-100 border border-blue-200' : 'bg-transparent hover:bg-gray-100'
        }`;

        if (!isActiveSorted) {
            return (
                <div className={buttonClass}>
                    <ChevronUpDownIcon className="w-4 h-4 text-gray-400 opacity-60" />
                </div>
            );
        }

        return (
            <div className={buttonClass}>
                {sortConfig.direction === 'asc' ? (
                    <ChevronUpIcon className="w-4 h-4 text-blue-600 font-bold" />
                ) : (
                    <ChevronDownIcon className="w-4 h-4 text-blue-600 font-bold" />
                )}
            </div>
        );
    };

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

    // Check if any filters or sorting are applied
    const hasActiveFilters = selectedDriverIds.length > 0 || sortConfig.key !== null || showTodayOnly;

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

    // Handle adding assignment to a load
    const addAssignmentToLoad = (load: ExpandedLoad) => {
        // Redirect to the load page with a hash to trigger assignment modal opening
        router.replace(`/loads/${load.id}#add-assignment`);
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
        <div className="flex flex-col w-full max-w-full mx-auto mt-6 mb-8 overflow-hidden">
            <AssignmentPopup
                isOpen={assignmentModalOpen}
                onClose={() => setAssignmentModalOpen(false)}
                assignment={modalAssignment}
                loading={loadingAssignment}
            />
            <div className="flex flex-col gap-4 mb-6 px-0 w-full max-w-full overflow-hidden">
                {/* Mobile/Tablet Layout */}
                <div className="flex flex-col gap-4 lg:hidden">
                    {/* Header */}
                    <div className="flex flex-col">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Load Runs</h3>
                        {showTodayOnly && (
                            <p className="text-sm text-gray-600 mt-1">
                                Today&apos;s pick-ups and deliveries, plus undelivered loads
                            </p>
                        )}
                        {!showTodayOnly && (
                            <p className="text-sm text-gray-600 mt-1">Next 7 days & past undelivered loads</p>
                        )}
                    </div>

                    {/* Controls - Stacked on mobile/tablet */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        {/* Left side controls */}
                        <div className="flex items-center gap-3">
                            {/* Refresh Button */}
                            <button
                                onClick={refreshLoadList}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                                data-tooltip-id="tooltip"
                                data-tooltip-content={`Refresh load list and clear filters (Last updated ${formatDistanceToNow(
                                    lastUpdated,
                                    { addSuffix: true },
                                )})`}
                            >
                                <ArrowPathIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                        </div>

                        {/* Right side controls */}
                        <div className="flex items-center justify-between sm:justify-end gap-4">
                            <div className="flex-shrink-0">
                                <SwitchWithLabel
                                    checked={showTodayOnly}
                                    label="Today Only"
                                    onChange={todayDataOnlyClicked}
                                />
                            </div>

                            <Tab.Group selectedIndex={selectedIndex} onChange={changeViewMode}>
                                <Tab.List className="flex p-1 space-x-1 bg-gray-100 rounded-xl shadow-sm">
                                    <Tab
                                        className={({ selected }) =>
                                            `flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                        ${
                            selected
                                ? 'bg-white shadow-sm text-gray-900 ring-1 ring-gray-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`
                                        }
                                        data-tooltip-id="tooltip"
                                        data-tooltip-content="Switch to table view"
                                    >
                                        <TableCellsIcon className="h-4 w-4" />
                                    </Tab>
                                    <Tab
                                        className={({ selected }) =>
                                            `flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                        ${
                            selected
                                ? 'bg-white shadow-sm text-gray-900 ring-1 ring-gray-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                        }`
                                        }
                                        data-tooltip-id="tooltip"
                                        data-tooltip-content="Switch to map view"
                                    >
                                        <MapIcon className="h-4 w-4" />
                                    </Tab>
                                </Tab.List>
                            </Tab.Group>
                        </div>
                    </div>
                </div>

                {/* Desktop Layout - All in one row */}
                <div className="hidden lg:flex lg:items-center lg:justify-between lg:gap-6">
                    {/* Left: Header */}
                    <div className="flex flex-col flex-shrink-0">
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Load Runs</h3>
                        {showTodayOnly && (
                            <p className="text-sm text-gray-600 mt-1">
                                Today&apos;s pick-ups and deliveries, plus undelivered loads
                            </p>
                        )}
                        {!showTodayOnly && (
                            <p className="text-sm text-gray-600 mt-1">Next 7 days & past undelivered loads</p>
                        )}
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        {/* Refresh Button */}
                        <button
                            onClick={refreshLoadList}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                            data-tooltip-id="tooltip"
                            data-tooltip-content={`Refresh load list and clear filters (Last updated ${formatDistanceToNow(
                                lastUpdated,
                                { addSuffix: true },
                            )})`}
                        >
                            <ArrowPathIcon className="h-4 w-4" />
                            Refresh
                        </button>

                        <SwitchWithLabel checked={showTodayOnly} label="Today Only" onChange={todayDataOnlyClicked} />

                        <Tab.Group selectedIndex={selectedIndex} onChange={changeViewMode}>
                            <Tab.List className="flex p-1 space-x-1 bg-gray-100 rounded-xl shadow-sm">
                                <Tab
                                    className={({ selected }) =>
                                        `flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                    ${
                        selected
                            ? 'bg-white shadow-sm text-gray-900 ring-1 ring-gray-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`
                                    }
                                    data-tooltip-id="tooltip"
                                    data-tooltip-content="Switch to table view"
                                >
                                    <TableCellsIcon className="h-4 w-4" />
                                </Tab>
                                <Tab
                                    className={({ selected }) =>
                                        `flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
                    ${
                        selected
                            ? 'bg-white shadow-sm text-gray-900 ring-1 ring-gray-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`
                                    }
                                    data-tooltip-id="tooltip"
                                    data-tooltip-content="Switch to map view"
                                >
                                    <MapIcon className="h-4 w-4" />
                                </Tab>
                            </Tab.List>
                        </Tab.Group>
                    </div>
                </div>
            </div>

            {/* Active Filters and Sorting Container */}
            {hasActiveFilters && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <FunnelIcon className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">Active Filters:</span>
                            </div>
                            {/* Show Today Only filter */}
                            {showTodayOnly && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-blue-700">Time Range:</span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Today Only
                                    </span>
                                </div>
                            )}
                            {/* Show selected drivers */}
                            {selectedDriverIds.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-blue-700">Drivers:</span>
                                    <div className="flex gap-1 flex-wrap">
                                        {selectedDriverIds.slice(0, 3).map((driverId) => {
                                            if (driverId === 'unassigned') {
                                                return (
                                                    <span
                                                        key="unassigned"
                                                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                                                    >
                                                        Unassigned
                                                    </span>
                                                );
                                            }
                                            const driver = allDrivers.find((d) => d.id === driverId);
                                            return (
                                                <span
                                                    key={driverId}
                                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                >
                                                    {driver?.name}
                                                </span>
                                            );
                                        })}
                                        {selectedDriverIds.length > 3 && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                +{selectedDriverIds.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}{' '}
                            {/* Show active sorting */}
                            {sortConfig.key && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-blue-700">Sorted by:</span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {sortConfig.key === 'load'
                                            ? 'Load Number'
                                            : sortConfig.key === 'status'
                                            ? 'Status'
                                            : sortConfig.key === 'pickup'
                                            ? 'Pickup Date'
                                            : sortConfig.key === 'delivery'
                                            ? 'Delivery Date'
                                            : sortConfig.key === 'distance'
                                            ? 'Distance'
                                            : sortConfig.key === 'driver'
                                            ? 'Driver'
                                            : sortConfig.key}
                                        {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={clearAllFilters}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                        >
                            <XMarkIcon className="h-4 w-4" />
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}

            {viewMode === 'table' &&
                (loadsList?.length === 0 ? (
                    <LoadingLoadViewTableSkeleton />
                ) : (
                    <>
                        {/* Driver Filter Popover - Outside table container */}
                        {isDriverPopoverOpen && (
                            <>
                                {/* Backdrop */}
                                <div className="fixed inset-0 z-40" onClick={() => setIsDriverPopoverOpen(false)} />

                                {/* Popover Panel */}
                                <div
                                    className="fixed z-50 w-64 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                                    style={{
                                        top: `${popoverPosition.top}px`,
                                        right: `${popoverPosition.right}px`,
                                    }}
                                >
                                    <div className="p-4">
                                        <div className="mb-3">
                                            <h4 className="text-sm font-semibold text-gray-900">Filter by Driver</h4>
                                            <p className="text-xs text-gray-500">Select drivers to filter the table</p>
                                        </div>

                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {/* Clear All Option */}
                                            {selectedDriverIds.length > 0 && (
                                                <>
                                                    <div
                                                        className="flex items-center cursor-pointer py-2 px-2 hover:bg-gray-50 rounded text-sm text-red-600 font-medium"
                                                        onClick={() => setSelectedDriverIds([])}
                                                    >
                                                        <XMarkIcon className="w-4 h-4 mr-2" />
                                                        Clear All Selections
                                                    </div>
                                                    <div className="border-t border-gray-100 my-2"></div>
                                                </>
                                            )}

                                            {/* Unassigned Option - Only show if there are unassigned loads */}
                                            {hasUnassignedLoads && (
                                                <>
                                                    <div
                                                        className="flex items-center cursor-pointer py-2 px-2 hover:bg-red-50 rounded border border-red-200 bg-red-50/50"
                                                        onClick={() => {
                                                            const isSelected = selectedDriverIds.includes('unassigned');
                                                            if (isSelected) {
                                                                setSelectedDriverIds((prev) =>
                                                                    prev.filter((id) => id !== 'unassigned'),
                                                                );
                                                            } else {
                                                                setSelectedDriverIds((prev) => [...prev, 'unassigned']);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-center w-4 h-4 mr-3">
                                                            {selectedDriverIds.includes('unassigned') ? (
                                                                <CheckCircleIcon className="w-4 h-4 text-red-600" />
                                                            ) : (
                                                                <div className="w-4 h-4 border border-red-300 rounded bg-white"></div>
                                                            )}
                                                        </div>
                                                        <span className="text-sm text-red-700 flex-1 font-medium">
                                                            Unassigned Loads
                                                        </span>
                                                        <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                                                    </div>
                                                    <div className="border-t border-gray-100 my-2"></div>
                                                </>
                                            )}

                                            {allDrivers.map((driver) => (
                                                <div
                                                    key={driver.id}
                                                    className="flex items-center cursor-pointer py-2 px-2 hover:bg-gray-50 rounded"
                                                    onClick={() => {
                                                        const isSelected = selectedDriverIds.includes(driver.id);
                                                        if (isSelected) {
                                                            setSelectedDriverIds((prev) =>
                                                                prev.filter((id) => id !== driver.id),
                                                            );
                                                        } else {
                                                            setSelectedDriverIds((prev) => [...prev, driver.id]);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center justify-center w-4 h-4 mr-3">
                                                        {selectedDriverIds.includes(driver.id) ? (
                                                            <CheckCircleIcon className="w-4 h-4 text-blue-600" />
                                                        ) : (
                                                            <div className="w-4 h-4 border border-gray-300 rounded"></div>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-gray-900 flex-1">{driver.name}</span>
                                                </div>
                                            ))}

                                            {allDrivers.length === 0 && !hasUnassignedLoads && (
                                                <div className="text-sm text-gray-500 text-center py-4">
                                                    No drivers found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="relative w-full max-w-full overflow-hidden">
                            <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-sm">
                                <div className="overflow-x-auto overflow-y-visible">
                                    <table className="min-w-full w-max divide-y divide-gray-100">
                                        <thead className="bg-gray-50/80">
                                            <tr>
                                                <th
                                                    scope="col"
                                                    className={getColumnHeaderClass(
                                                        'load',
                                                        'py-4 pl-6 pr-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer w-48 min-w-[12rem]',
                                                    )}
                                                    onClick={() => handleSort('load')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <TruckIcon
                                                                className={`w-4 h-4 mr-2 ${
                                                                    sortConfig.key === 'load'
                                                                        ? 'text-blue-600'
                                                                        : 'text-gray-400'
                                                                }`}
                                                            />
                                                            Load
                                                        </div>
                                                        <SortIndicator column="load" />
                                                    </div>
                                                </th>
                                                <th
                                                    scope="col"
                                                    className={getColumnHeaderClass(
                                                        'status',
                                                        'px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer w-28 min-w-[7rem]',
                                                    )}
                                                    onClick={() => handleSort('status')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <CircleStackIcon
                                                                className={`w-4 h-4 mr-2 ${
                                                                    sortConfig.key === 'status'
                                                                        ? 'text-blue-600'
                                                                        : 'text-gray-400'
                                                                }`}
                                                            />
                                                            Status
                                                        </div>
                                                        <SortIndicator column="status" />
                                                    </div>
                                                </th>
                                                <th
                                                    scope="col"
                                                    className={getColumnHeaderClass(
                                                        'pickup',
                                                        'px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer w-44 min-w-[11rem]',
                                                    )}
                                                    onClick={() => handleSort('pickup')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <TruckIcon
                                                                className={`w-4 h-4 mr-2 ${
                                                                    sortConfig.key === 'pickup'
                                                                        ? 'text-blue-600'
                                                                        : 'text-gray-400'
                                                                }`}
                                                            />
                                                            Pickup
                                                        </div>
                                                        <SortIndicator column="pickup" />
                                                    </div>
                                                </th>
                                                <th
                                                    scope="col"
                                                    className={getColumnHeaderClass(
                                                        'delivery',
                                                        'px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer w-44 min-w-[11rem]',
                                                    )}
                                                    onClick={() => handleSort('delivery')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <MapPinIcon
                                                                className={`w-4 h-4 mr-2 ${
                                                                    sortConfig.key === 'delivery'
                                                                        ? 'text-blue-600'
                                                                        : 'text-gray-400'
                                                                }`}
                                                            />
                                                            Delivery
                                                        </div>
                                                        <SortIndicator column="delivery" />
                                                    </div>
                                                </th>
                                                <th
                                                    scope="col"
                                                    className={getColumnHeaderClass(
                                                        'distance',
                                                        'px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer w-24 min-w-[6rem]',
                                                    )}
                                                    onClick={() => handleSort('distance')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <MapIcon
                                                                className={`w-4 h-4 mr-2 ${
                                                                    sortConfig.key === 'distance'
                                                                        ? 'text-blue-600'
                                                                        : 'text-gray-400'
                                                                }`}
                                                            />
                                                            Distance
                                                        </div>
                                                        <SortIndicator column="distance" />
                                                    </div>
                                                </th>
                                                <th
                                                    scope="col"
                                                    className={getColumnHeaderClass(
                                                        'driver',
                                                        'px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer w-40 min-w-[10rem]',
                                                    )}
                                                    onClick={() => handleSort('driver')}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <UserIcon
                                                                className={`w-4 h-4 mr-2 ${
                                                                    sortConfig.key === 'driver'
                                                                        ? 'text-blue-600'
                                                                        : 'text-gray-400'
                                                                }`}
                                                            />

                                                            {/* Driver Filter Button */}
                                                            <button
                                                                ref={driverFilterButtonRef}
                                                                className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-all duration-200 ml-3 ${
                                                                    selectedDriverIds.length > 0
                                                                        ? 'bg-blue-100 border border-blue-200 text-blue-600'
                                                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                                                }`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Prevent triggering sort
                                                                    updatePopoverPosition();
                                                                    setIsDriverPopoverOpen(!isDriverPopoverOpen);
                                                                }}
                                                            >
                                                                <PencilIcon className="w-3 h-3" aria-hidden="true" />
                                                                <span className="sr-only">Filter drivers</span>
                                                            </button>

                                                            <span className="ml-3">Driver</span>
                                                        </div>
                                                        <SortIndicator column="driver" />
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-50">
                                            {filteredAndSortedLoads?.map((load, index) => {
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
                                                            className={`transition-all duration-300 ease-in-out ${
                                                                load.driverAssignments?.length === 0
                                                                    ? 'cursor-default' +
                                                                      (allDatesInPast ? '' : ' bg-red-50/80')
                                                                    : 'cursor-pointer' +
                                                                      (allDatesInPast
                                                                          ? ' bg-red-50/90 hover:bg-red-100/50'
                                                                          : '')
                                                            } ${
                                                                load.driverAssignments?.length > 0 && isExpanded
                                                                    ? 'bg-blue-50/70 shadow-lg shadow-blue-100/50 relative z-10 border-b-0'
                                                                    : load.driverAssignments?.length > 0 &&
                                                                      expandedLoadId &&
                                                                      expandedLoadId !== load.id
                                                                    ? 'opacity-60 hover:opacity-80 hover:bg-gray-50/40'
                                                                    : load.driverAssignments?.length > 0
                                                                    ? 'hover:bg-gray-50/70 hover:shadow-sm'
                                                                    : ''
                                                            }`}
                                                            onClick={
                                                                load.driverAssignments?.length > 0
                                                                    ? () => toggleExpandRow(load.id)
                                                                    : undefined
                                                            }
                                                        >
                                                            <td className="py-5 pl-6 pr-4 text-sm relative">
                                                                {/* Expanded indicator */}
                                                                {isExpanded && (
                                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600 rounded-r-full shadow-sm"></div>
                                                                )}
                                                                <div className="flex flex-col space-y-1">
                                                                    <Link
                                                                        href={`/loads/${load.id}`}
                                                                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                        }}
                                                                    >
                                                                        Order# {load.refNum}
                                                                    </Link>
                                                                    <div className="text-xs text-gray-500 font-medium">
                                                                        Load# {load.loadNum}
                                                                    </div>
                                                                    <div
                                                                        className="text-sm font-semibold text-gray-900 truncate max-w-36"
                                                                        title={load.customer?.name || 'No Customer'}
                                                                    >
                                                                        {load.customer?.name || 'No Customer'}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-5 text-sm">
                                                                <LoadStatusBadge load={load} />
                                                            </td>
                                                            <td className="px-4 py-5 text-sm">
                                                                <div className="flex items-start space-x-3">
                                                                    <div className="flex-shrink-0 mt-1">
                                                                        <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center ring-1 ring-green-200">
                                                                            <TruckIcon
                                                                                className="w-4 h-4 text-green-600"
                                                                                aria-hidden="true"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm font-semibold text-gray-900">
                                                                            {formatDate(load.shipper.date.toString())}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                                                                            {load.shipper.time}
                                                                        </div>
                                                                        <div
                                                                            className="text-xs text-gray-700 font-medium truncate mt-1"
                                                                            title={load.shipper.name}
                                                                        >
                                                                            {load.shipper.name}
                                                                        </div>
                                                                        <div
                                                                            className="text-xs text-gray-500 truncate uppercase"
                                                                            title={`${load.shipper.city}, ${load.shipper.state}`}
                                                                        >
                                                                            {load.shipper.city}, {load.shipper.state}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-5 text-sm">
                                                                <div className="flex items-start space-x-3">
                                                                    <div className="flex-shrink-0 mt-1">
                                                                        <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center ring-1 ring-red-200">
                                                                            <MapPinIcon
                                                                                className="w-4 h-4 text-red-600"
                                                                                aria-hidden="true"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm font-semibold text-gray-900">
                                                                            {formatDate(load.receiver.date.toString())}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                                                                            {load.receiver.time}
                                                                        </div>
                                                                        <div
                                                                            className="text-xs text-gray-700 font-medium truncate mt-1"
                                                                            title={load.receiver.name}
                                                                        >
                                                                            {load.receiver.name}
                                                                        </div>
                                                                        <div
                                                                            className="text-xs text-gray-500 truncate uppercase"
                                                                            title={`${load.receiver.city}, ${load.receiver.state}`}
                                                                        >
                                                                            {load.receiver.city}, {load.receiver.state}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-5 text-sm">
                                                                <div className="flex flex-col space-y-1">
                                                                    <span className="text-sm font-semibold text-gray-900">
                                                                        {load.routeDistanceMiles
                                                                            ? `${
                                                                                  isNaN(Number(load.routeDistanceMiles))
                                                                                      ? '0'
                                                                                      : Number(
                                                                                            load.routeDistanceMiles,
                                                                                        ).toFixed(0)
                                                                              } mi`
                                                                            : 'N/A'}
                                                                    </span>
                                                                    {load.routeDurationHours && (
                                                                        <div className="text-xs text-gray-500 font-medium">
                                                                            {Math.floor(
                                                                                Number(load.routeDurationHours),
                                                                            )}
                                                                            h{' '}
                                                                            {Math.round(
                                                                                (Number(load.routeDurationHours) % 1) *
                                                                                    60,
                                                                            )}
                                                                            m
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-5 text-sm">
                                                                {load.driverAssignments?.length > 0 ? (
                                                                    <div className="flex flex-col space-y-1">
                                                                        {Array.from(
                                                                            new Map(
                                                                                load.driverAssignments.map(
                                                                                    (assignment) => [
                                                                                        assignment.driver.id,
                                                                                        assignment,
                                                                                    ],
                                                                                ),
                                                                            ).values(),
                                                                        )
                                                                            .slice(0, 2)
                                                                            .map(
                                                                                (
                                                                                    assignment,
                                                                                    index,
                                                                                    uniqueAssignments,
                                                                                ) => (
                                                                                    <Link
                                                                                        key={`${assignment.driver.id}-${index}`}
                                                                                        href={`/drivers/${assignment.driver.id}`}
                                                                                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200 truncate"
                                                                                        title={assignment.driver?.name}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                        }}
                                                                                    >
                                                                                        {assignment.driver?.name}
                                                                                    </Link>
                                                                                ),
                                                                            )}
                                                                        {Array.from(
                                                                            new Map(
                                                                                load.driverAssignments.map(
                                                                                    (assignment) => [
                                                                                        assignment.driver.id,
                                                                                        assignment,
                                                                                    ],
                                                                                ),
                                                                            ).values(),
                                                                        ).length > 2 && (
                                                                            <span className="text-xs text-gray-500 font-medium">
                                                                                +
                                                                                {Array.from(
                                                                                    new Map(
                                                                                        load.driverAssignments.map(
                                                                                            (assignment) => [
                                                                                                assignment.driver.id,
                                                                                                assignment,
                                                                                            ],
                                                                                        ),
                                                                                    ).values(),
                                                                                ).length - 2}{' '}
                                                                                more
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col space-y-2">
                                                                        <span className="text-xs text-gray-500 font-medium">
                                                                            No driver assigned
                                                                        </span>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                addAssignmentToLoad(load);
                                                                            }}
                                                                            className="flex w-fit items-center space-x-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 px-2 py-1.5 rounded-md transition-all duration-200 border border-transparent hover:border-gray-200"
                                                                        >
                                                                            <UserIcon className="w-3 h-3" />
                                                                            <span>Assign Driver</span>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>

                                                        {/* Expanded Row with Driver Assignment Details */}
                                                        {isExpanded && routeLegs.length > 0 && (
                                                            <tr className="relative z-10 animate-in fade-in duration-300 slide-in-from-top-2">
                                                                <td
                                                                    colSpan={6}
                                                                    className="p-0 bg-gradient-to-b from-blue-50/20 to-blue-50/10"
                                                                >
                                                                    <div className="p-6 bg-white/80 backdrop-blur-sm m-4 rounded-2xl shadow-xl shadow-blue-100/30 border border-blue-100/50 ring-1 ring-blue-200/20 animate-in fade-in duration-500 slide-in-from-bottom-4">
                                                                        <Tab.Group>
                                                                            <div className="flex items-center justify-between rounded-xl bg-white/60 backdrop-blur-sm p-4 mb-4 shadow-sm border border-gray-100/50">
                                                                                <Tab.List className="flex space-x-2">
                                                                                    {routeLegs.map(
                                                                                        (routeLegData, idx) => (
                                                                                            <Tab
                                                                                                key={idx}
                                                                                                className={({
                                                                                                    selected,
                                                                                                }) =>
                                                                                                    `rounded-lg py-2.5 px-4 text-sm font-semibold leading-5 transition-all duration-200 cursor-pointer
                                              ${
                                                  selected
                                                      ? 'bg-gray-200 text-gray-900 border border-gray-300'
                                                      : 'bg-transparent text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300'
                                              }`
                                                                                                }
                                                                                            >
                                                                                                Assignment {idx + 1}
                                                                                                {routeLegData
                                                                                                    .assignments
                                                                                                    .length > 1 && (
                                                                                                    <span className="ml-2 text-xs opacity-75">
                                                                                                        (
                                                                                                        {
                                                                                                            routeLegData
                                                                                                                .assignments
                                                                                                                .length
                                                                                                        }{' '}
                                                                                                        drivers)
                                                                                                    </span>
                                                                                                )}
                                                                                            </Tab>
                                                                                        ),
                                                                                    )}
                                                                                </Tab.List>

                                                                                {/* Action Buttons */}
                                                                                <div className="flex flex-row gap-2">
                                                                                    <Link
                                                                                        href={`/loads/${load.id}`}
                                                                                        target="_blank"
                                                                                        className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200"
                                                                                        onClick={(e) =>
                                                                                            e.stopPropagation()
                                                                                        }
                                                                                    >
                                                                                        View Load
                                                                                    </Link>
                                                                                    <Link
                                                                                        href={`/loads/${load.id}?routeLegId=${routeLegs[0]?.routeLeg?.id}`}
                                                                                        target="_blank"
                                                                                        className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                                                                                        onClick={(e) =>
                                                                                            e.stopPropagation()
                                                                                        }
                                                                                    >
                                                                                        Edit Assignment
                                                                                    </Link>
                                                                                </div>
                                                                            </div>
                                                                            <Tab.Panels>
                                                                                {routeLegs.map((routeLegData, idx) => {
                                                                                    const currentStatus =
                                                                                        getCurrentStatus(
                                                                                            routeLegData.routeLeg,
                                                                                        );

                                                                                    return (
                                                                                        <Tab.Panel
                                                                                            key={idx}
                                                                                            className="rounded-2xl bg-white shadow-sm border border-gray-100"
                                                                                        >
                                                                                            {/* Apple-inspired compact two-column layout */}
                                                                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                                                                                                {/* Left Column: Route Details & Stops */}
                                                                                                <div className="p-6 space-y-5">
                                                                                                    {/* Route Header */}
                                                                                                    <div className="flex items-center justify-between">
                                                                                                        <div className="flex items-center space-x-3">
                                                                                                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                                                                                            <h3 className="text-base font-semibold text-gray-900">
                                                                                                                Route
                                                                                                                Details
                                                                                                            </h3>
                                                                                                        </div>
                                                                                                        {routeLegData
                                                                                                            .routeLeg
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
                                                                                                                    className="inline-flex items-center space-x-1.5 text-gray-600 hover:text-gray-800 text-sm hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-all duration-200"
                                                                                                                    onClick={(
                                                                                                                        e,
                                                                                                                    ) =>
                                                                                                                        e.stopPropagation()
                                                                                                                    }
                                                                                                                >
                                                                                                                    <MapIcon className="w-4 h-4" />
                                                                                                                    <span className="font-medium">
                                                                                                                        Directions
                                                                                                                    </span>
                                                                                                                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                                                                                                </a>
                                                                                                            )}
                                                                                                    </div>

                                                                                                    {/* Route Info Cards */}
                                                                                                    <div className="space-y-4">
                                                                                                        <div className="flex items-center space-x-3 py-3">
                                                                                                            <CalendarIcon className="h-5 w-5 text-gray-400" />
                                                                                                            <div className="flex-1">
                                                                                                                <p className="text-sm font-medium text-gray-900">
                                                                                                                    {(() => {
                                                                                                                        const date =
                                                                                                                            routeLegData
                                                                                                                                .routeLeg
                                                                                                                                .scheduledDate;
                                                                                                                        if (
                                                                                                                            !date
                                                                                                                        )
                                                                                                                            return 'No date';

                                                                                                                        // If it's already a Date object, use it directly
                                                                                                                        if (
                                                                                                                            date instanceof
                                                                                                                            Date
                                                                                                                        ) {
                                                                                                                            return new Intl.DateTimeFormat(
                                                                                                                                'en-US',
                                                                                                                                {
                                                                                                                                    year: 'numeric',
                                                                                                                                    month: 'long',
                                                                                                                                    day: '2-digit',
                                                                                                                                },
                                                                                                                            ).format(
                                                                                                                                date,
                                                                                                                            );
                                                                                                                        }

                                                                                                                        // Parse the date string manually to avoid timezone issues
                                                                                                                        const dateStr =
                                                                                                                            date.toString();
                                                                                                                        const cleanDateStr =
                                                                                                                            dateStr.includes(
                                                                                                                                'T',
                                                                                                                            )
                                                                                                                                ? dateStr.split(
                                                                                                                                      'T',
                                                                                                                                  )[0]
                                                                                                                                : dateStr;
                                                                                                                        const [
                                                                                                                            year,
                                                                                                                            month,
                                                                                                                            day,
                                                                                                                        ] =
                                                                                                                            cleanDateStr
                                                                                                                                .split(
                                                                                                                                    '-',
                                                                                                                                )
                                                                                                                                .map(
                                                                                                                                    Number,
                                                                                                                                );

                                                                                                                        // Create date using individual components to avoid timezone conversion
                                                                                                                        const localDate =
                                                                                                                            new Date(
                                                                                                                                year,
                                                                                                                                month -
                                                                                                                                    1,
                                                                                                                                day,
                                                                                                                            );

                                                                                                                        return new Intl.DateTimeFormat(
                                                                                                                            'en-US',
                                                                                                                            {
                                                                                                                                year: 'numeric',
                                                                                                                                month: 'long',
                                                                                                                                day: '2-digit',
                                                                                                                            },
                                                                                                                        ).format(
                                                                                                                            localDate,
                                                                                                                        );
                                                                                                                    })()}{' '}
                                                                                                                    at{' '}
                                                                                                                    {formatTime(
                                                                                                                        routeLegData
                                                                                                                            .routeLeg
                                                                                                                            .scheduledTime,
                                                                                                                    )}
                                                                                                                </p>
                                                                                                                <p className="text-xs text-gray-500">
                                                                                                                    Scheduled
                                                                                                                </p>
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        <div className="flex items-center space-x-3 py-3">
                                                                                                            <ClockIcon className="h-5 w-5 text-gray-400" />
                                                                                                            <div className="flex-1">
                                                                                                                <p className="text-sm font-medium text-gray-900">
                                                                                                                    {Math.round(
                                                                                                                        Number(
                                                                                                                            routeLegData
                                                                                                                                .routeLeg
                                                                                                                                .durationHours,
                                                                                                                        ),
                                                                                                                    )}
                                                                                                                    h •{' '}
                                                                                                                    {Math.round(
                                                                                                                        Number(
                                                                                                                            routeLegData
                                                                                                                                .routeLeg
                                                                                                                                .distanceMiles,
                                                                                                                        ),
                                                                                                                    )}{' '}
                                                                                                                    mi
                                                                                                                </p>
                                                                                                                <p className="text-xs text-gray-500">
                                                                                                                    Duration
                                                                                                                    &
                                                                                                                    Distance
                                                                                                                </p>
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        {routeLegData
                                                                                                            .routeLeg
                                                                                                            .driverInstructions && (
                                                                                                            <div className="flex items-start space-x-3 py-3 px-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                                                                                                                <InformationCircleIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                                                                                                <div className="flex-1">
                                                                                                                    <p className="text-sm text-gray-900 font-medium">
                                                                                                                        {
                                                                                                                            routeLegData
                                                                                                                                .routeLeg
                                                                                                                                .driverInstructions
                                                                                                                        }
                                                                                                                    </p>
                                                                                                                    <p className="text-xs text-amber-700 font-medium mt-1">
                                                                                                                        Special
                                                                                                                        Instructions
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>

                                                                                                    {/* Stops Section */}
                                                                                                    {routeLegData
                                                                                                        .routeLeg
                                                                                                        .locations &&
                                                                                                        routeLegData
                                                                                                            .routeLeg
                                                                                                            .locations
                                                                                                            .length >
                                                                                                            0 && (
                                                                                                            <div>
                                                                                                                <div className="flex items-center space-x-2 mb-4">
                                                                                                                    <h4 className="text-sm font-semibold text-gray-900">
                                                                                                                        Stops
                                                                                                                    </h4>
                                                                                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                                                                                        {
                                                                                                                            routeLegData
                                                                                                                                .routeLeg
                                                                                                                                .locations
                                                                                                                                .length
                                                                                                                        }
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                                <div className="space-y-3">
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
                                                                                                                                    className="relative py-4 border-b border-gray-100 last:border-b-0"
                                                                                                                                >
                                                                                                                                    <div className="flex items-start space-x-3">
                                                                                                                                        <div
                                                                                                                                            className={`h-3 w-3 rounded-full ${iconColor} mt-1.5 flex-shrink-0`}
                                                                                                                                        ></div>
                                                                                                                                        <div className="flex-1 min-w-0">
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
                                                                                                                                                            className="ml-auto inline-flex items-center space-x-1 text-gray-600 hover:text-gray-800 text-xs hover:bg-gray-50 px-2 py-1 rounded transition-all duration-200"
                                                                                                                                                            onClick={(
                                                                                                                                                                e,
                                                                                                                                                            ) =>
                                                                                                                                                                e.stopPropagation()
                                                                                                                                                            }
                                                                                                                                                        >
                                                                                                                                                            <MapIcon className="w-3.5 h-3.5" />
                                                                                                                                                            <span>
                                                                                                                                                                Map
                                                                                                                                                            </span>
                                                                                                                                                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
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
                                                                                                                                </div>
                                                                                                                            );
                                                                                                                        },
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        )}
                                                                                                </div>

                                                                                                {/* Right Column: Assignment Status, Drivers & Location Updates */}
                                                                                                <div className="p-6 space-y-5">
                                                                                                    {/* Assignment Status */}
                                                                                                    <div>
                                                                                                        <div className="flex items-center space-x-3 mb-4">
                                                                                                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                                                                                            <h3 className="text-base font-semibold text-gray-900">
                                                                                                                Assignment
                                                                                                                Status
                                                                                                            </h3>
                                                                                                        </div>
                                                                                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                                                                            <div className="flex items-center justify-between">
                                                                                                                <div className="flex items-center space-x-3">
                                                                                                                    {currentStatus ===
                                                                                                                    'COMPLETED' ? (
                                                                                                                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                                                                                                    ) : currentStatus ===
                                                                                                                      'IN_PROGRESS' ? (
                                                                                                                        <ClockIconOutline className="h-5 w-5 text-amber-500" />
                                                                                                                    ) : (
                                                                                                                        <StopIcon className="h-5 w-5 text-gray-400" />
                                                                                                                    )}
                                                                                                                    <div>
                                                                                                                        <p className="text-sm font-semibold text-gray-900">
                                                                                                                            {currentStatus ===
                                                                                                                            'COMPLETED'
                                                                                                                                ? 'Completed'
                                                                                                                                : currentStatus ===
                                                                                                                                  'IN_PROGRESS'
                                                                                                                                ? 'In Progress'
                                                                                                                                : 'Assigned'}
                                                                                                                        </p>
                                                                                                                        <p className="text-xs text-gray-500">
                                                                                                                            Current
                                                                                                                            Status
                                                                                                                        </p>
                                                                                                                    </div>
                                                                                                                    {routeLegIdUpdating ===
                                                                                                                        routeLegData
                                                                                                                            .routeLeg
                                                                                                                            .id && (
                                                                                                                        <Spinner className="text-blue-500" />
                                                                                                                    )}
                                                                                                                </div>
                                                                                                                <Popover className="relative">
                                                                                                                    <Popover.Button
                                                                                                                        className="inline-flex items-center justify-center w-8 h-8 text-gray-400 bg-white rounded-lg hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                                                                                                                        onClick={(
                                                                                                                            e,
                                                                                                                        ) =>
                                                                                                                            e.stopPropagation()
                                                                                                                        }
                                                                                                                    >
                                                                                                                        <EllipsisHorizontalIcon className="w-5 h-5" />
                                                                                                                    </Popover.Button>
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
                                                                                                                        <Popover.Panel className="absolute right-0 z-10 w-56 mt-2 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-100">
                                                                                                                            {({
                                                                                                                                close,
                                                                                                                            }) => (
                                                                                                                                <div className="py-1">
                                                                                                                                    {currentStatus !==
                                                                                                                                        'ASSIGNED' && (
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
                                                                                                                                                close();
                                                                                                                                            }}
                                                                                                                                            disabled={
                                                                                                                                                changeLegStatusLoading
                                                                                                                                            }
                                                                                                                                            className="flex items-center w-full px-4 py-2.5 text-sm font-medium transition-colors duration-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                                                                        >
                                                                                                                                            <StopIcon className="w-4 h-4 mr-3 text-gray-400" />
                                                                                                                                            Mark
                                                                                                                                            as
                                                                                                                                            Assigned
                                                                                                                                        </button>
                                                                                                                                    )}
                                                                                                                                    {currentStatus !==
                                                                                                                                        'IN_PROGRESS' && (
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
                                                                                                                                                close();
                                                                                                                                            }}
                                                                                                                                            disabled={
                                                                                                                                                changeLegStatusLoading
                                                                                                                                            }
                                                                                                                                            className="flex items-center w-full px-4 py-2.5 text-sm font-medium transition-colors duration-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                                                                        >
                                                                                                                                            <ClockIconOutline className="w-4 h-4 mr-3 text-amber-500" />
                                                                                                                                            Mark
                                                                                                                                            as
                                                                                                                                            In
                                                                                                                                            Progress
                                                                                                                                        </button>
                                                                                                                                    )}
                                                                                                                                    {currentStatus !==
                                                                                                                                        'COMPLETED' && (
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
                                                                                                                                                close();
                                                                                                                                            }}
                                                                                                                                            disabled={
                                                                                                                                                changeLegStatusLoading
                                                                                                                                            }
                                                                                                                                            className="flex items-center w-full px-4 py-2.5 text-sm font-medium transition-colors duration-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                                                                        >
                                                                                                                                            <CheckCircleIcon className="w-4 h-4 mr-3 text-green-500" />
                                                                                                                                            Mark
                                                                                                                                            as
                                                                                                                                            Completed
                                                                                                                                        </button>
                                                                                                                                    )}
                                                                                                                                </div>
                                                                                                                            )}
                                                                                                                        </Popover.Panel>
                                                                                                                    </Transition>
                                                                                                                </Popover>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {/* Assigned Drivers */}
                                                                                                    <div>
                                                                                                        <div className="flex items-center space-x-2 mb-4">
                                                                                                            <h4 className="text-sm font-semibold text-gray-900">
                                                                                                                Assigned
                                                                                                                Drivers
                                                                                                            </h4>
                                                                                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                                                                                {
                                                                                                                    routeLegData
                                                                                                                        .assignments
                                                                                                                        .length
                                                                                                                }
                                                                                                            </span>
                                                                                                        </div>
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
                                                                                                                        className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                                                                                                                    >
                                                                                                                        <div className="space-y-3">
                                                                                                                            <div className="flex items-center space-x-3">
                                                                                                                                <UserIcon className="h-5 w-5 text-gray-400" />
                                                                                                                                <Link
                                                                                                                                    href={`/drivers/${assignment.driver.id}`}
                                                                                                                                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                                                                                                                                    onClick={(
                                                                                                                                        e,
                                                                                                                                    ) =>
                                                                                                                                        e.stopPropagation()
                                                                                                                                    }
                                                                                                                                >
                                                                                                                                    {
                                                                                                                                        assignment
                                                                                                                                            .driver
                                                                                                                                            .name
                                                                                                                                    }
                                                                                                                                </Link>
                                                                                                                            </div>
                                                                                                                            <div className="flex items-center space-x-3">
                                                                                                                                <PhoneIcon className="h-5 w-5 text-gray-400" />
                                                                                                                                <a
                                                                                                                                    href={`tel:${assignment.driver.phone}`}
                                                                                                                                    className="text-sm text-gray-700 hover:text-blue-600 transition-colors duration-200"
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
                                                                                                                            <div className="flex items-center space-x-3">
                                                                                                                                <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                                                                                                                                <div>
                                                                                                                                    <p className="text-sm font-semibold text-gray-900">
                                                                                                                                        {assignment.chargeType ===
                                                                                                                                        'PER_HOUR'
                                                                                                                                            ? `$${assignment.chargeValue}/hr`
                                                                                                                                            : assignment.chargeType ===
                                                                                                                                              'PER_MILE'
                                                                                                                                            ? `$${assignment.chargeValue}/mi`
                                                                                                                                            : assignment.chargeType ===
                                                                                                                                              'PERCENTAGE_OF_LOAD'
                                                                                                                                            ? `${assignment.chargeValue}%`
                                                                                                                                            : `$${assignment.chargeValue}`}
                                                                                                                                    </p>
                                                                                                                                    <p className="text-xs text-gray-500">
                                                                                                                                        {assignment.chargeType ===
                                                                                                                                        'PER_HOUR'
                                                                                                                                            ? 'Per Hour'
                                                                                                                                            : assignment.chargeType ===
                                                                                                                                              'PER_MILE'
                                                                                                                                            ? 'Per Mile'
                                                                                                                                            : assignment.chargeType ===
                                                                                                                                              'PERCENTAGE_OF_LOAD'
                                                                                                                                            ? 'Percentage of Load'
                                                                                                                                            : assignment.chargeType ===
                                                                                                                                              'FIXED_PAY'
                                                                                                                                            ? 'Fixed Pay'
                                                                                                                                            : 'Fixed Amount'}
                                                                                                                                    </p>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                ),
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {/* Location Updates */}
                                                                                                    {(routeLegData
                                                                                                        .routeLeg
                                                                                                        .startLatitude ||
                                                                                                        routeLegData
                                                                                                            .routeLeg
                                                                                                            .endLatitude) && (
                                                                                                        <div>
                                                                                                            <div className="flex items-center space-x-2 mb-4">
                                                                                                                <h4 className="text-sm font-semibold text-gray-900">
                                                                                                                    Location
                                                                                                                    Updates
                                                                                                                </h4>
                                                                                                            </div>
                                                                                                            <div className="space-y-3">
                                                                                                                {routeLegData
                                                                                                                    .routeLeg
                                                                                                                    .startLatitude &&
                                                                                                                    routeLegData
                                                                                                                        .routeLeg
                                                                                                                        .startLongitude && (
                                                                                                                        <div className="py-4 border-b border-gray-100">
                                                                                                                            <div className="flex items-center justify-between mb-2">
                                                                                                                                <div className="flex items-center space-x-3">
                                                                                                                                    <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                                                                                                                                    <div>
                                                                                                                                        <p className="text-sm font-semibold text-gray-900">
                                                                                                                                            Started
                                                                                                                                        </p>
                                                                                                                                        <p className="text-xs text-gray-500">
                                                                                                                                            Location
                                                                                                                                            tracked
                                                                                                                                        </p>
                                                                                                                                    </div>
                                                                                                                                </div>
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
                                                                                                                                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-gray-800 text-xs hover:bg-gray-50 px-2 py-1 rounded transition-all duration-200"
                                                                                                                                    onClick={(
                                                                                                                                        e,
                                                                                                                                    ) =>
                                                                                                                                        e.stopPropagation()
                                                                                                                                    }
                                                                                                                                >
                                                                                                                                    <MapIcon className="w-3.5 h-3.5" />
                                                                                                                                    <span>
                                                                                                                                        Map
                                                                                                                                    </span>
                                                                                                                                </a>
                                                                                                                            </div>
                                                                                                                            {routeLegData
                                                                                                                                .routeLeg
                                                                                                                                .startedAt && (
                                                                                                                                <p className="text-xs text-gray-600">
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
                                                                                                                        </div>
                                                                                                                    )}

                                                                                                                {routeLegData
                                                                                                                    .routeLeg
                                                                                                                    .endLatitude &&
                                                                                                                    routeLegData
                                                                                                                        .routeLeg
                                                                                                                        .endLongitude && (
                                                                                                                        <div className="py-4">
                                                                                                                            <div className="flex items-center justify-between mb-2">
                                                                                                                                <div className="flex items-center space-x-3">
                                                                                                                                    <div className="h-3 w-3 rounded-full bg-gray-600"></div>
                                                                                                                                    <div>
                                                                                                                                        <p className="text-sm font-semibold text-gray-900">
                                                                                                                                            Completed
                                                                                                                                        </p>
                                                                                                                                        <p className="text-xs text-gray-500">
                                                                                                                                            Location
                                                                                                                                            tracked
                                                                                                                                        </p>
                                                                                                                                    </div>
                                                                                                                                </div>
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
                                                                                                                                    className="inline-flex items-center space-x-1 text-gray-600 hover:text-gray-800 text-xs hover:bg-gray-50 px-2 py-1 rounded transition-all duration-200"
                                                                                                                                    onClick={(
                                                                                                                                        e,
                                                                                                                                    ) =>
                                                                                                                                        e.stopPropagation()
                                                                                                                                    }
                                                                                                                                >
                                                                                                                                    <MapIcon className="w-3.5 h-3.5" />
                                                                                                                                    <span>
                                                                                                                                        Map
                                                                                                                                    </span>
                                                                                                                                </a>
                                                                                                                            </div>
                                                                                                                            {routeLegData
                                                                                                                                .routeLeg
                                                                                                                                .endedAt && (
                                                                                                                                <p className="text-xs text-gray-600">
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
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
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
                        </div>
                    </>
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
                                                                {load.customer?.name || 'No Customer Assigned'}
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
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                addAssignmentToLoad(load);
                                                            }}
                                                            className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-all duration-200"
                                                        >
                                                            <UserIcon className="w-3 h-3" />
                                                            <span>Assign Driver</span>
                                                        </button>
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
