'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import polyline from '@mapbox/polyline';

interface LoadRouteMapProps {
    locations: Array<{
        id?: string;
        latitude?: number;
        longitude?: number;
        name?: string;
        type: 'origin' | 'destination' | 'stop';
    }>;
    routeEncoded?: string;
    className?: string;
}

const LoadRouteMap: React.FC<LoadRouteMapProps> = ({ locations, routeEncoded, className = '' }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

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
            projection: 'mercator', // Disable globe view
        });

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

    // Update map when locations or route change
    useEffect(() => {
        if (!map.current || !isLoaded || locations.length < 1) return;

        updateMapWithRoute();
    }, [locations, routeEncoded, isLoaded]);

    const updateMapWithRoute = () => {
        if (!map.current) return;

        // Clear existing layers and sources
        clearMapLayers();

        // Add route if available
        if (routeEncoded) {
            displayRoute(routeEncoded);
        }

        // Add location markers
        addLocationMarkers();

        // Fit map to locations
        fitMapToLocations();
    };

    const clearMapLayers = () => {
        if (!map.current) return;

        // Remove existing route layer and source
        if (map.current.getLayer('route')) {
            map.current.removeLayer('route');
        }
        if (map.current.getSource('route')) {
            map.current.removeSource('route');
        }

        // Clear existing markers
        const markers = document.querySelectorAll('.mapboxgl-marker');
        markers.forEach((marker) => marker.remove());
    };

    const displayRoute = (encodedRoute: string) => {
        if (!map.current) return;

        try {
            // Decode the polyline
            const decoded = polyline.decode(encodedRoute);
            const coordinates = decoded.map((coord: number[]) => [coord[1], coord[0]]);

            // Add route source
            map.current.addSource('route', {
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

            // Add route layer
            map.current.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                },
                paint: {
                    'line-color': '#007AFF',
                    'line-width': 4,
                    'line-opacity': 0.8,
                },
            });
        } catch (error) {
            console.error('Error displaying route:', error);
        }
    };

    const addLocationMarkers = () => {
        if (!map.current) return;

        locations.forEach((location, index) => {
            if (!location.latitude || !location.longitude) return;

            const isFirst = index === 0;
            const isLast = index === locations.length - 1;

            // Create marker element
            const markerEl = document.createElement('div');
            markerEl.className = 'route-marker';
            markerEl.style.cssText = `
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 13px;
                color: white;
                background-color: ${
                    location.type === 'origin' ? '#34D399' : location.type === 'destination' ? '#EF4444' : '#3B82F6'
                };
                cursor: pointer;
                transition: box-shadow 0.2s ease, filter 0.2s ease;
                transform-origin: center;
            `;

            // Add number or icon
            if (location.type === 'origin') {
                markerEl.textContent = 'P';
            } else if (location.type === 'destination') {
                markerEl.textContent = 'D';
            } else {
                markerEl.textContent = index.toString();
            }

            // Add hover effect without transform to prevent jumping
            markerEl.addEventListener('mouseenter', () => {
                markerEl.style.boxShadow = '0 8px 25px rgba(0,0,0,0.25)';
                markerEl.style.filter = 'brightness(1.1)';
            });
            markerEl.addEventListener('mouseleave', () => {
                markerEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                markerEl.style.filter = 'brightness(1)';
            });

            // Add double-click functionality to zoom to street level
            markerEl.addEventListener('dblclick', (e) => {
                e.stopPropagation(); // Prevent map double-click

                if (map.current) {
                    // Zoom to street level (zoom level 16-18 is good for street view)
                    map.current.flyTo({
                        center: [location.longitude!, location.latitude!],
                        zoom: 17,
                        duration: 1500,
                        essential: true,
                    });

                    // Show a temporary popup with location name
                    const popup = new mapboxgl.Popup({
                        closeButton: true,
                        closeOnClick: true,
                        className: 'street-view-popup',
                        maxWidth: '300px',
                    })
                        .setLngLat([location.longitude!, location.latitude!])
                        .setHTML(
                            `
                        <div class="p-4">
                            <h3 class="font-bold text-lg text-gray-900 mb-2">${location.name || 'Location'}</h3>
                            <div class="space-y-1 text-sm text-gray-600">
                                <p class="flex items-center">
                                    <span class="inline-block w-2 h-2 rounded-full mr-2" style="background-color: ${
                                        location.type === 'origin'
                                            ? '#34D399'
                                            : location.type === 'destination'
                                            ? '#EF4444'
                                            : '#3B82F6'
                                    }"></span>
                                    ${
                                        location.type === 'origin'
                                            ? 'Pickup Location'
                                            : location.type === 'destination'
                                            ? 'Delivery Location'
                                            : `Stop ${index}`
                                    }
                                </p>
                                <p class="text-xs text-gray-500 mt-2">
                                    Double-click to zoom to this location
                                </p>
                            </div>
                        </div>
                    `,
                        )
                        .addTo(map.current);

                    // Auto-close popup after 5 seconds
                    setTimeout(() => {
                        if (popup.isOpen()) {
                            popup.remove();
                        }
                    }, 5000);
                }
            });

            // Add marker to map with popup
            new mapboxgl.Marker(markerEl)
                .setLngLat([location.longitude, location.latitude])
                .setPopup(
                    new mapboxgl.Popup({
                        offset: 25,
                        closeButton: false,
                        className: 'route-popup',
                    }).setHTML(`
                        <div class="p-3">
                            <h3 class="font-semibold text-sm text-gray-900">${location.name || 'Location'}</h3>
                            <p class="text-xs text-gray-600 mt-1">
                                ${
                                    location.type === 'origin'
                                        ? 'Pickup Location'
                                        : location.type === 'destination'
                                        ? 'Delivery Location'
                                        : `Stop ${index}`
                                }
                            </p>
                            <p class="text-xs text-blue-600 mt-2 font-medium">
                                Double-click to zoom to street level
                            </p>
                        </div>
                    `),
                )
                .addTo(map.current);
        });
    };

    const fitMapToLocations = () => {
        if (!map.current || locations.length === 0) return;

        const validLocations = locations.filter((loc) => loc.latitude && loc.longitude);
        if (validLocations.length === 0) return;

        if (validLocations.length === 1) {
            const loc = validLocations[0];
            map.current.flyTo({
                center: [loc.longitude!, loc.latitude!],
                zoom: 12,
                duration: 1500,
            });
        } else {
            const bounds = new mapboxgl.LngLatBounds();
            validLocations.forEach((location) => {
                bounds.extend([location.longitude!, location.latitude!]);
            });

            map.current.fitBounds(bounds, {
                padding: { top: 40, bottom: 40, left: 40, right: 40 },
                maxZoom: 15,
                duration: 1500,
            });
        }
    };

    return (
        <div className={`relative ${className}`}>
            <div
                ref={mapContainer}
                className="w-full h-64 md:h-80 rounded-2xl overflow-hidden shadow-sm bg-gray-100"
                style={{ minHeight: '256px' }}
            />

            {/* Center Route Button */}
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={() => fitMapToLocations()}
                    className="inline-flex items-center px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-lg hover:bg-white/95 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 group"
                    title="Center route on screen"
                >
                    <svg
                        className="w-4 h-4 text-gray-700 group-hover:text-blue-600 transition-colors"
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
                    <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors hidden sm:inline">
                        Center Route
                    </span>
                </button>
            </div>

            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-2xl">
                    <div className="flex items-center space-x-2 text-gray-500">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Loading map...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoadRouteMap;
