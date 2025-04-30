import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Tab } from '@headlessui/react';
import { MapPinIcon, TruckIcon, TableCellsIcon, ViewColumnsIcon, MapIcon } from '@heroicons/react/24/outline';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ExpandedLoad } from 'interfaces/models';
import LoadStatusBadge from './LoadStatusBadge';
import { formatDate } from 'lib/helpers/format';
import { format } from 'date-fns';
import SwitchWithLabel from 'components/switchWithLabel';

interface LoadViewToggleProps {
    loadsList: ExpandedLoad[];
    todayDataOnly: () => void;
}

const LoadViewToggle: React.FC<LoadViewToggleProps> = ({ loadsList, todayDataOnly }) => {
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
                loadsList.forEach((load) => {
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
            loadsList.forEach((load) => {
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

    return (
        <div className="flex flex-col w-full mx-auto mt-6 mb-8">
            <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center lg:justify-between mb-4 px-0   ">
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

                <div className="flex flex-row gap-3  ">
                    <SwitchWithLabel
                        checked={showTodayOnly}
                        label="Show Today's Runs Only"
                        onChange={todayDataOnlyClicked}
                    />

                    <Tab.Group selectedIndex={selectedIndex} onChange={changeViewMode}>
                        <Tab.List className="flex p-1 space-x-1 bg-gray-100 rounded-lg">
                            {/* <Tab
                            className={({ selected }) =>
                                `flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all
                ${
                    selected
                        ? 'bg-white shadow text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/[0.12]'
                }`
                            }
                        >
                            <ViewColumnsIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Cards</span>
                        </Tab> */}
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

            {/*  {viewMode === 'card' && (
                <div className="flex pb-10 overflow-x-auto">
                    <ul role="list" className="flex px-5 space-x-6 md:px-0 flex-nowrap">
                        {loadsList.map((load, index) => (
                            <li key={index} className="overflow-hidden border border-gray-200 rounded-xl w-80">
                                <Link href={`/loads/${load.id}`}>
                                    {load && load.routeEncoded && (
                                        <Image
                                            src={`https://api.mapbox.com/styles/v1/mapbox/light-v10/static/path-3+3b82f6-0.7(${encodeURIComponent(
                                                load.routeEncoded,
                                            )})/auto/900x300?padding=50,50,50,50&access_token=${
                                                process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
                                                'pk.eyJ1IjoiY2Fycmllcm5lc3RhcHAiLCJhIjoiY2xrM2prOWZvMDhyczNncG55a2I1aDhhOSJ9._mlA6WAuqHcbS-U_f5KK5w'
                                            }`}
                                            width={900}
                                            height={300}
                                            alt="Load Route"
                                            loading="lazy"
                                            className="w-full h-auto mb-1"
                                        ></Image>
                                    )}
                                    {!(load && load.routeEncoded) && (
                                        <div className="flex items-center p-6 border-b gap-x-4 border-gray-900/5 bg-gray-50"></div>
                                    )}
                                    <dl className="px-3 text-sm leading-6 divide-y divide-gray-100">
                                        <div className="flex justify-between py-2 gap-x-4">
                                            <dt className="text-gray-500">
                                                <div className="text-xs">{load.refNum}</div>
                                                <div className="font-medium text-sm text-gray-900 uppercase">
                                                    {load.customer.name}
                                                </div>
                                            </dt>
                                            <dd className="text-gray-700">
                                                <LoadStatusBadge load={load} />
                                            </dd>
                                        </div>
                                        <div className="flex justify-between py-3 gap-x-4">
                                            <ul role="list" className="flex-1">
                                                <li>
                                                    <div className="relative z-auto pb-3">
                                                        <span
                                                            className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                                                            aria-hidden="true"
                                                        />
                                                        <div className="relative flex items-center space-x-3">
                                                            <div className="relative px-1">
                                                                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full ring-8 ring-white">
                                                                    <TruckIcon
                                                                        className="w-5 h-5 text-green-800"
                                                                        aria-hidden="true"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs text-gray-500">
                                                                    <span className="text-sm font-medium text-gray-900">
                                                                        {formatDate(load.shipper.date.toString())}
                                                                    </span>{' '}
                                                                    @ {load.shipper.time}
                                                                    <div>{load.shipper.name}</div>
                                                                    <div>
                                                                        {load.shipper.city}, {load.shipper.state}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                {load.stops.length > 0 && (
                                                    <li>
                                                        <div className="relative pb-3">
                                                            <span
                                                                className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                                                                aria-hidden="true"
                                                            />
                                                            <div className="relative flex items-center space-x-3">
                                                                <div className="relative px-1">
                                                                    <div className="flex items-center justify-center w-8 h-8 ">
                                                                        <div className="w-4 h-4 bg-gray-100 rounded-full ring-8 ring-white"></div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs text-gray-500">
                                                                        <div>
                                                                            {load.stops.length} stop
                                                                            {load.stops.length > 1 && 's'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                )}
                                                <li>
                                                    <div className="relative pb-2">
                                                        <div className="relative flex items-center space-x-3">
                                                            <div className="relative px-1">
                                                                <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full ring-8 ring-white">
                                                                    <MapPinIcon
                                                                        className="w-5 h-5 text-red-800"
                                                                        aria-hidden="true"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs text-gray-500">
                                                                    <span className="text-sm font-medium text-gray-900">
                                                                        {formatDate(load.receiver.date.toString())}
                                                                    </span>{' '}
                                                                    @ {load.receiver.time}
                                                                    <div>{load.receiver.name}</div>
                                                                    <div>
                                                                        {load.receiver.city}, {load.receiver.state}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                    </dl>
                                </Link>
                                <dl className="px-3 text-sm leading-6 divide-y divide-gray-100">
                                    <div></div>
                                    <div className="flex justify-between py-3">
                                        <dt className="">
                                            <div className="text-xs text-gray-500">Driver details</div>
                                            <div>
                                                {load.driverAssignments?.length > 0 ? (
                                                    Array.from(
                                                        new Map(
                                                            load.driverAssignments.map((assignment) => [
                                                                assignment.driver.id,
                                                                assignment,
                                                            ]),
                                                        ).values(),
                                                    ).map((assignment, index, uniqueAssignments) => (
                                                        <span key={`${assignment.driver.id}-${index}`}>
                                                            <Link
                                                                href={`/drivers/${assignment.driver.id}`}
                                                                className="font-medium"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                }}
                                                            >
                                                                {assignment.driver?.name}
                                                            </Link>
                                                            {index < uniqueAssignments.length - 1 ? ', ' : ''}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <div className="text-gray-400">No driver assigned</div>
                                                )}
                                            </div>
                                        </dt>
                                        <dd className=""></dd>
                                    </div>
                                </dl>
                            </li>
                        ))}
                    </ul>
                </div>
            )} */}

            {viewMode === 'table' &&
                (loadsList.length === 0 ? (
                    <LoadingLoadViewTableSkeleton />
                ) : (
                    <div className=" mx-0 md:mx-0 md:px-0 overflow-x-auto pb-0 border border-gray-200 rounded-lg shadow-sm">
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
                                            className="px-3 py-3.5 text-left text-xs font-semibold  uppercase"
                                        >
                                            Status
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-xs font-semibold   uppercase "
                                        >
                                            Pickup
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-xs font-semibold   uppercase"
                                        >
                                            Delivery
                                        </th>

                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-xs font-semibold     uppercase"
                                        >
                                            Distance
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-xs font-semibold   uppercase"
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

                                        return (
                                            <tr
                                                key={index}
                                                className={`hover:bg-gray-50 cursor-pointer ${
                                                    load.driverAssignments?.length === 0 && !allDatesInPast
                                                        ? 'bg-red-50'
                                                        : ''
                                                } ${allDatesInPast ? 'bg-red-100 animate-none' : ''}`}
                                                onClick={() => (window.location.href = `/loads/${load.id}`)}
                                            >
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                                    <div className="flex flex-col">
                                                        <div className="text-xs text-gray-500">
                                                            Order# {load.refNum}
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
                                                            <div className="text-gray-500">{load.receiver.time}</div>
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
                                                            {Math.round((Number(load.routeDurationHours) % 1) * 60)}m
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
                                                                    {index < uniqueAssignments.length - 1 ? ', ' : ''}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">No driver assigned</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

            {viewMode === 'map' &&
                (loadsList.length === 0 ? (
                    <LoadingLoadMapViewSkeleton />
                ) : (
                    <div className="px-0 pb-0 relative ">
                        <div
                            ref={mapContainer}
                            className="w-full h-[50vh] md:h-[80vh] rounded-lg border border-gray-200 overflow-hidden relative z-10"
                            style={{ background: '#f8f8f8' }}
                        />

                        {/* Compact load cards overlay */}
                        <div className="relative md:absolute bottom-0 top-0 left-0 z-20 px-0 pb-0 overflow-x-auto md:overflow-y-auto hide-scrollbar">
                            <div className="relative  ">
                                {/* Prev button */}
                                {/*  <button
                                onClick={() => scrollBy(-300)}
                                className="absolute top-2  z-30 p-1 bg-white rounded-full shadow-lg font-bold hover:bg-gray-100 transform -translate-y-1/2"
                            >
                                <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                            </button> */}

                                {/* Scroll container */}
                                <div
                                    ref={carouselRef}
                                    className="             flex flex-row md:flex-col md:overflow-y-auto md:overflow-x-hidden
                  overflow-x-auto   hide-scrollbar
                  px-0 md:px-2
                  my-4
                "
                                >
                                    {loadsList.map((load, i) => {
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
                       } ${allDatesInPast ? '!bg-red-100 !hover:bg-red-200' : ' '} rounded-lg
                      border
                      ${selectedLoadId === load.id ? 'border-blue-800 ring-2 ring-blue-700' : 'border-gray-200'}
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
                                                        loadsList.forEach((l) => {
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
                                                            loadsList.forEach((l) => {
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
                                                            <div className="text-xs text-gray-500">{load.refNum}</div>
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
                                                                    onClick={(e) => e.stopPropagation()}
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

                                {/* Next button */}
                                {/* <button
                                onClick={() => scrollBy(300)}
                                className="absolute bottom-6 z-30 p-1 bg-white rounded-full shadow hover:bg-gray-100 transform -translate-y-1/2"
                            >
                                <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                            </button> */}
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
        <div className="px-5 md:px-0 overflow-x-auto pb-0 border border-gray-200 rounded-lg shadow-sm">
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
        <div className="px-5 md:px-0 pb-0 relative">
            {/* Map loading skeleton */}
            <div className="w-full h-[80vh] rounded-lg border border-gray-200 overflow-hidden relative z-10 bg-gray-100">
                {/* Map placeholder with shimmer effect */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <MapIcon className="w-16 h-16 text-gray-300" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            </div>

            {/* Loads list skeleton overlay */}
            <div className="absolute bottom-0 top-0 left-0 z-20 px-0 pb-0 overflow-y-auto hide-scrollbar">
                <div className="relative">
                    {/* Scroll container */}
                    <div className="flex flex-col overflow-y-auto hide-scrollbar px-2 my-4">
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
