'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getRouteForCoords } from 'lib/mapbox/searchGeo';
import polyline from '@mapbox/polyline';
import {
    ArrowPathIcon,
    MapIcon,
    InformationCircleIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import type { ExpandedRouteLegLocation } from 'interfaces/models';

interface RouteMapViewerProps {
    locations: ExpandedRouteLegLocation[];
    routeEncoded?: string;
    distanceMiles?: number;
    durationHours?: number;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    selectedRouteIndex?: number;
    onRouteUpdate?: (routeData: {
        routeEncoded: string;
        distanceMiles: number;
        durationHours: number;
        selectedRouteIndex: number;
    }) => void;
    className?: string;
}

const RouteMapViewer: React.FC<RouteMapViewerProps> = ({
    locations,
    routeEncoded,
    distanceMiles,
    durationHours,
    isCollapsed = false,
    onToggleCollapse,
    selectedRouteIndex = 0,
    onRouteUpdate,
    className = '',
}) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [routeStatus, setRouteStatus] = useState<'idle' | 'calculating' | 'success' | 'error'>('idle');
    const [alternativeRoutes, setAlternativeRoutes] = useState<any[]>([]);

    // Initialize map
    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-98.5795, 39.8283], // Center of US
            zoom: 4,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Update map when locations change
    useEffect(() => {
        if (!map.current || locations.length < 2) return;

        updateMapWithRoute();
    }, [locations]);

    // Update map styles when selectedRouteIndex changes
    useEffect(() => {
        if (!map.current || alternativeRoutes.length === 0) return;

        alternativeRoutes.forEach((_, index) => {
            const layerId = `route-${index}`;
            const isSelected = index === selectedRouteIndex;

            if (map.current && map.current.getLayer(layerId)) {
                map.current.setPaintProperty(layerId, 'line-width', isSelected ? 3 : 2);
                map.current.setPaintProperty(layerId, 'line-opacity', isSelected ? 1.0 : 0.4);
            }
        });
    }, [selectedRouteIndex, alternativeRoutes]);

    const updateMapWithRoute = async () => {
        if (!map.current || locations.length < 2) return;

        setIsLoading(true);
        setRouteStatus('calculating');

        try {
            // Clear existing layers and sources
            clearMapLayers();

            // Add location markers
            addLocationMarkers();

            // Get route data
            const coords = locations
                .map((location) => {
                    const lat = location.loadStop?.latitude ?? location.location?.latitude;
                    const lng = location.loadStop?.longitude ?? location.location?.longitude;
                    return [lng, lat];
                })
                .filter((coord) => coord[0] && coord[1]);

            // Get multiple route alternatives
            const routeData = await getRouteWithAlternatives(coords);
            setAlternativeRoutes(routeData.routes);

            // Display ALL routes on the map
            routeData.routes.forEach((route, index) => {
                displayRoute(route, index);
            });

            // Fit map to route bounds
            fitMapToRoute(coords);

            setRouteStatus('success');

            // Only notify parent to update route data if this is the first time we're loading routes
            // and we don't have existing route data. This prevents overriding the selectedRouteIndex
            // when the modal reopens with existing route data.
            if (onRouteUpdate && routeData.routes.length > 0 && !routeEncoded) {
                const validRouteIndex = selectedRouteIndex < routeData.routes.length ? selectedRouteIndex : 0;
                const route = routeData.routes[validRouteIndex];
                onRouteUpdate({
                    routeEncoded: route.routeEncoded,
                    distanceMiles: route.distanceMiles,
                    durationHours: route.durationHours,
                    selectedRouteIndex: validRouteIndex,
                });
            }
        } catch (error) {
            console.error('Error updating route:', error);
            setRouteStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    const getRouteWithAlternatives = async (coords: number[][]) => {
        try {
            // Use the updated getRouteForCoords function that handles alternatives
            const routeData = await getRouteForCoords(coords);

            // Transform the routes to include geometry for map display
            const routesWithGeometry = routeData.routes.map((route: any, index: number) => ({
                ...route,
                geometry: {
                    type: 'LineString',
                    coordinates: polyline.decode(route.routeEncoded).map((coord: number[]) => [coord[1], coord[0]]),
                },
                index,
            }));

            return {
                routes: routesWithGeometry,
            };
        } catch (error) {
            console.error('Route calculation error:', error);
            throw error;
        }
    };

    const clearMapLayers = () => {
        if (!map.current) return;

        // Remove existing route layers (support up to 5 alternative routes)
        for (let i = 0; i < 5; i++) {
            const layerId = `route-${i}`;
            if (map.current.getLayer(layerId)) {
                map.current.removeLayer(layerId);
            }
        }

        // Remove existing sources
        for (let i = 0; i < 5; i++) {
            const sourceId = `route-${i}`;
            if (map.current.getSource(sourceId)) {
                map.current.removeSource(sourceId);
            }
        }

        // Clear markers
        document.querySelectorAll('.mapboxgl-marker').forEach((marker) => marker.remove());
    };

    const addLocationMarkers = () => {
        if (!map.current) return;

        locations.forEach((location, index) => {
            const lat = location.loadStop?.latitude ?? location.location?.latitude;
            const lng = location.loadStop?.longitude ?? location.location?.longitude;

            if (!lat || !lng) return;

            const isFirst = index === 0;
            const isLast = index === locations.length - 1;

            // Create marker element
            const markerEl = document.createElement('div');
            markerEl.className = 'route-marker';
            markerEl.style.cssText = `
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 12px;
                color: white;
                background-color: ${isFirst ? '#10B981' : isLast ? '#EF4444' : '#3B82F6'};
            `;
            markerEl.textContent = isFirst ? 'S' : isLast ? 'E' : (index + 1).toString();

            // Add marker to map
            new mapboxgl.Marker(markerEl)
                .setLngLat([lng, lat])
                .setPopup(
                    new mapboxgl.Popup({ offset: 25 }).setHTML(`
                            <div class="p-2">
                                <h3 class="font-semibold text-sm">${
                                    location.loadStop?.name || location.location?.name
                                }</h3>
                                <p class="text-xs text-gray-600">${
                                    location.loadStop?.city || location.location?.city
                                }, ${location.loadStop?.state || location.location?.state}</p>
                            </div>
                        `),
                )
                .addTo(map.current);
        });
    };

    const displayRoute = (route: any, routeIndex: number) => {
        if (!map.current || !route) return;

        const sourceId = `route-${routeIndex}`;
        const layerId = `route-${routeIndex}`;
        const isSelected = routeIndex === selectedRouteIndex;

        // Add route source
        map.current.addSource(sourceId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry,
            },
        });

        // Add route layer with consistent color but different opacity and width
        map.current.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
            },
            paint: {
                'line-color': '#1E40AF', // Dark blue for all routes
                'line-width': isSelected ? 3 : 2, // 3px for selected, 2px for alternatives
                'line-opacity': isSelected ? 1.0 : 0.4, // Full opacity for selected, 40% for alternatives
            },
        });

        // Add click handler for route selection
        map.current.on('click', layerId, () => {
            selectRoute(routeIndex);
        });

        // Change cursor on hover
        map.current.on('mouseenter', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
        });
    };

    const selectRoute = (routeIndex: number) => {
        // Update layer styles for all routes
        alternativeRoutes.forEach((_, index) => {
            const layerId = `route-${index}`;
            const isSelected = index === routeIndex;

            if (map.current && map.current.getLayer(layerId)) {
                // Update route line styles with consistent color
                map.current.setPaintProperty(layerId, 'line-width', isSelected ? 3 : 2);
                map.current.setPaintProperty(layerId, 'line-opacity', isSelected ? 1.0 : 0.4);
            }
        });

        // Notify parent of route change
        if (onRouteUpdate && alternativeRoutes[routeIndex]) {
            const route = alternativeRoutes[routeIndex];
            onRouteUpdate({
                routeEncoded: route.routeEncoded,
                distanceMiles: parseFloat(route.distanceMiles),
                durationHours: parseFloat(route.durationHours),
                selectedRouteIndex: routeIndex,
            });
        }
    };

    const fitMapToRoute = (coords: number[][]) => {
        if (!map.current || coords.length === 0) return;

        const bounds = new mapboxgl.LngLatBounds();
        coords.forEach((coord) => bounds.extend(coord as [number, number]));

        map.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15,
        });
    };

    const formatDuration = (hours: number) => {
        const totalMinutes = Math.round(hours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className={`route-map-viewer ${className}`}>
            {/* Collapsible Header */}
            {onToggleCollapse && (
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onToggleCollapse}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2"
                    >
                        {isCollapsed ? (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                                Show Route Visualization
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 15l7-7 7 7"
                                    />
                                </svg>
                                Hide Route Visualization
                            </>
                        )}
                    </button>

                    {!isCollapsed && alternativeRoutes.length > 0 && (
                        <div className="text-sm text-gray-600">
                            {alternativeRoutes.length} route{alternativeRoutes.length > 1 ? 's' : ''} available
                        </div>
                    )}
                </div>
            )}

            {!isCollapsed && (
                <>
                    {/* Map Container */}
                    <div className="relative">
                        <div ref={mapContainer} className="w-full h-80 bg-gray-100" />

                        {/* Loading Overlay */}
                        {isLoading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                <div className="bg-white p-4 rounded-lg flex items-center space-x-3">
                                    <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />
                                    <span className="text-sm font-medium">Calculating route...</span>
                                </div>
                            </div>
                        )}

                        {/* Status Indicator */}
                        <div className="absolute top-4 left-4">
                            {routeStatus === 'success' && (
                                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    Route calculated
                                </div>
                            )}
                            {routeStatus === 'error' && (
                                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                                    Route error
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Route Controls */}
                    <div className="px-4 mt-4 space-y-3">
                        {/* Route Statistics */}
                        {alternativeRoutes[selectedRouteIndex] && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div>
                                            <span className="text-xs font-medium text-blue-600">Distance</span>
                                            <p className="text-lg font-bold text-blue-900">
                                                {alternativeRoutes[selectedRouteIndex].distanceMiles} mi
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-medium text-blue-600">Duration</span>
                                            <p className="text-lg font-bold text-blue-900">
                                                {formatDuration(
                                                    parseFloat(alternativeRoutes[selectedRouteIndex].durationHours),
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={updateMapWithRoute}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2 text-sm"
                                        disabled={isLoading}
                                    >
                                        <ArrowPathIcon className="h-4 w-4" />
                                        <span>Recalculate</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Alternative Routes */}
                        {alternativeRoutes.length > 1 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700 flex items-center">
                                    <MapIcon className="h-4 w-4 mr-2" />
                                    Route Options
                                </h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {alternativeRoutes.map((route, index) => (
                                        <button
                                            key={index}
                                            onClick={() => selectRoute(index)}
                                            className={`p-3 border rounded-lg text-left transition-colors ${
                                                index === selectedRouteIndex
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="text-sm font-medium">
                                                        Route {index + 1}
                                                        {index === selectedRouteIndex && (
                                                            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                                                Selected
                                                            </span>
                                                        )}
                                                    </span>
                                                    <div className="flex space-x-4 mt-1 text-xs text-gray-600">
                                                        <span>{route.distanceMiles} mi</span>
                                                        <span>{formatDuration(parseFloat(route.durationHours))}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Help Text */}
                        <div className="flex items-start space-x-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                            <InformationCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <p>
                                    Click on route lines to select different routing options. Routes are optimized for
                                    truck traffic and exclude ferries.
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default RouteMapViewer;
