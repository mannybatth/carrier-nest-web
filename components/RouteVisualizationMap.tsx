import React, { useEffect, useRef, useState } from 'react';
import { ExpandedDriverAssignment } from '../interfaces/models';

interface RouteVisualizationMapProps {
    assignments: ExpandedDriverAssignment[];
}

interface MapLocation {
    lat: number;
    lng: number;
    name: string;
    type: 'pickup' | 'delivery' | 'empty_start';
    assignmentId?: string;
}

interface RouteSegment {
    start: MapLocation;
    end: MapLocation;
    distance: number;
    type: 'assignment' | 'empty';
    assignmentId?: string;
}

const RouteVisualizationMap: React.FC<RouteVisualizationMapProps> = ({ assignments }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
    const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 39.8283, lng: -98.5795 }); // USA center
    const [mapZoom, setMapZoom] = useState<number>(4);

    // Helper function to calculate distance between two points using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

    useEffect(() => {
        if (!assignments.length) return;

        // Extract locations and create route segments
        const locations: MapLocation[] = [];
        const segments: RouteSegment[] = [];

        // Sort assignments by date
        const sortedAssignments = assignments.sort((a, b) => {
            const dateA = new Date(a.routeLeg.startedAt || a.routeLeg.createdAt);
            const dateB = new Date(b.routeLeg.startedAt || b.routeLeg.createdAt);
            return dateA.getTime() - dateB.getTime();
        });

        sortedAssignments.forEach((assignment, index) => {
            const routeLocations = assignment.routeLeg.locations;
            const startLocation = routeLocations[0];
            const endLocation = routeLocations[routeLocations.length - 1];

            // Get coordinates
            const startLat = startLocation.loadStop?.latitude || startLocation.location?.latitude;
            const startLng = startLocation.loadStop?.longitude || startLocation.location?.longitude;
            const endLat = endLocation.loadStop?.latitude || endLocation.location?.latitude;
            const endLng = endLocation.loadStop?.longitude || endLocation.location?.longitude;

            if (startLat && startLng && endLat && endLng) {
                // Add pickup location
                const pickupLocation: MapLocation = {
                    lat: startLat,
                    lng: startLng,
                    name: `${startLocation.loadStop?.name || startLocation.location?.name} (${
                        startLocation.loadStop?.city || startLocation.location?.city
                    }, ${startLocation.loadStop?.state || startLocation.location?.state})`,
                    type: 'pickup',
                    assignmentId: assignment.id,
                };

                // Add delivery location
                const deliveryLocation: MapLocation = {
                    lat: endLat,
                    lng: endLng,
                    name: `${endLocation.loadStop?.name || endLocation.location?.name} (${
                        endLocation.loadStop?.city || endLocation.location?.city
                    }, ${endLocation.loadStop?.state || endLocation.location?.state})`,
                    type: 'delivery',
                    assignmentId: assignment.id,
                };

                locations.push(pickupLocation, deliveryLocation);

                // Add assignment route segment
                const assignmentDistance = Number(assignment.billedDistanceMiles || assignment.routeLeg.distanceMiles);
                segments.push({
                    start: pickupLocation,
                    end: deliveryLocation,
                    distance: assignmentDistance,
                    type: 'assignment',
                    assignmentId: assignment.id,
                });

                // Calculate empty miles to next assignment
                if (index < sortedAssignments.length - 1) {
                    const nextAssignment = sortedAssignments[index + 1];
                    const nextStartLocation = nextAssignment.routeLeg.locations[0];
                    const nextStartLat = nextStartLocation.loadStop?.latitude || nextStartLocation.location?.latitude;
                    const nextStartLng = nextStartLocation.loadStop?.longitude || nextStartLocation.location?.longitude;

                    if (nextStartLat && nextStartLng) {
                        const emptyDistance = calculateDistance(endLat, endLng, nextStartLat, nextStartLng);

                        // Add empty miles segment
                        const nextPickupLocation: MapLocation = {
                            lat: nextStartLat,
                            lng: nextStartLng,
                            name: `${nextStartLocation.loadStop?.name || nextStartLocation.location?.name} (${
                                nextStartLocation.loadStop?.city || nextStartLocation.location?.city
                            }, ${nextStartLocation.loadStop?.state || nextStartLocation.location?.state})`,
                            type: 'empty_start',
                            assignmentId: nextAssignment.id,
                        };

                        segments.push({
                            start: deliveryLocation,
                            end: nextPickupLocation,
                            distance: emptyDistance,
                            type: 'empty',
                        });
                    }
                }
            }
        });

        setMapLocations(locations);
        setRouteSegments(segments);

        // Calculate map center and zoom
        if (locations.length > 0) {
            const lats = locations.map((loc) => loc.lat);
            const lngs = locations.map((loc) => loc.lng);
            const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
            const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;

            setMapCenter({ lat: centerLat, lng: centerLng });

            // Calculate appropriate zoom level
            const latSpan = Math.max(...lats) - Math.min(...lats);
            const lngSpan = Math.max(...lngs) - Math.min(...lngs);
            const maxSpan = Math.max(latSpan, lngSpan);

            let zoom = 10;
            if (maxSpan > 10) zoom = 6;
            else if (maxSpan > 5) zoom = 7;
            else if (maxSpan > 2) zoom = 8;
            else if (maxSpan > 1) zoom = 9;

            setMapZoom(zoom);
        }
    }, [assignments]);

    // SVG Map Visualization (simplified map for visualization)
    const renderSVGMap = () => {
        if (!mapLocations.length) return null;

        const padding = 40;
        const width = 400;
        const height = 300;

        // Calculate bounds
        const lats = mapLocations.map((loc) => loc.lat);
        const lngs = mapLocations.map((loc) => loc.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const latRange = maxLat - minLat || 1;
        const lngRange = maxLng - minLng || 1;

        // Convert lat/lng to SVG coordinates
        const toSVG = (lat: number, lng: number) => ({
            x: padding + ((lng - minLng) / lngRange) * (width - 2 * padding),
            y: height - (padding + ((lat - minLat) / latRange) * (height - 2 * padding)),
        });

        return (
            <svg width={width} height={height} className="border border-gray-300 rounded-lg bg-blue-50">
                {/* Background */}
                <rect width={width} height={height} fill="#f0f9ff" />

                {/* Route segments */}
                {routeSegments.map((segment, index) => {
                    const start = toSVG(segment.start.lat, segment.start.lng);
                    const end = toSVG(segment.end.lat, segment.end.lng);

                    return (
                        <g key={index}>
                            <line
                                x1={start.x}
                                y1={start.y}
                                x2={end.x}
                                y2={end.y}
                                stroke={segment.type === 'assignment' ? '#3b82f6' : '#eab308'}
                                strokeWidth={segment.type === 'assignment' ? 3 : 2}
                                strokeDasharray={segment.type === 'empty' ? '5,5' : 'none'}
                            />
                            {/* Distance label */}
                            <text
                                x={(start.x + end.x) / 2}
                                y={(start.y + end.y) / 2 - 5}
                                fill={segment.type === 'assignment' ? '#1e40af' : '#a16207'}
                                fontSize="10"
                                textAnchor="middle"
                                className="font-semibold"
                            >
                                {segment.distance.toFixed(1)}mi
                            </text>
                        </g>
                    );
                })}

                {/* Location markers */}
                {mapLocations.map((location, index) => {
                    const point = toSVG(location.lat, location.lng);
                    const color = location.type === 'pickup' || location.type === 'empty_start' ? '#22c55e' : '#ef4444';

                    // Find the assignment index for numbering
                    const assignmentIndex = assignments.findIndex((a) => a.id === location.assignmentId);

                    return (
                        <g key={`${location.assignmentId}-${index}`}>
                            <circle cx={point.x} cy={point.y} r={8} fill={color} stroke="white" strokeWidth={2} />
                            {/* Assignment number for pickup locations */}
                            {(location.type === 'pickup' || location.type === 'empty_start') &&
                                assignmentIndex >= 0 && (
                                    <text
                                        x={point.x}
                                        y={point.y + 3}
                                        fill="white"
                                        fontSize="10"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                    >
                                        {assignmentIndex + 1}
                                    </text>
                                )}
                            {/* Location name tooltip */}
                            <title>{location.name}</title>
                        </g>
                    );
                })}
            </svg>
        );
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 flex items-center justify-center">
                {assignments.length === 0 ? (
                    <div className="text-gray-500 text-center">
                        <p>No mile-based assignments to display</p>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center">
                        {renderSVGMap()}
                        <div className="mt-4 text-sm text-gray-600 text-center max-w-md">
                            <p>
                                Interactive route map showing assignment locations and empty miles calculation between
                                assignments.
                            </p>
                            <p className="mt-1">Hover over points to see location details.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Route Summary */}
            {routeSegments.length > 0 && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-3">Route Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <span className="text-blue-600 font-medium">Assignment Routes: </span>
                            <div className="text-lg font-bold text-blue-800">
                                {routeSegments.filter((s) => s.type === 'assignment').length} routes
                            </div>
                            <div className="text-blue-600">
                                {routeSegments
                                    .filter((s) => s.type === 'assignment')
                                    .reduce((total, s) => total + s.distance, 0)
                                    .toFixed(1)}
                                mi total
                            </div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg">
                            <span className="text-yellow-600 font-medium">Empty Miles: </span>
                            <div className="text-lg font-bold text-yellow-800">
                                {routeSegments.filter((s) => s.type === 'empty').length} segments
                            </div>
                            <div className="text-yellow-600">
                                {routeSegments
                                    .filter((s) => s.type === 'empty')
                                    .reduce((total, s) => total + s.distance, 0)
                                    .toFixed(1)}
                                mi total
                            </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                            <span className="text-green-600 font-medium">Overall Journey: </span>
                            <div className="text-lg font-bold text-green-800">{routeSegments.length} segments</div>
                            <div className="text-green-600">
                                {routeSegments.reduce((total, s) => total + s.distance, 0).toFixed(1)}mi total
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 p-2 bg-gray-100 rounded text-xs text-gray-600">
                        <p>
                            <strong>Green circles (numbered):</strong> Pickup locations for each assignment
                        </p>
                        <p>
                            <strong>Red circles:</strong> Delivery locations
                        </p>
                        <p>
                            <strong>Blue solid lines:</strong> Assignment routes (paid miles)
                        </p>
                        <p>
                            <strong>Yellow dashed lines:</strong> Empty miles between assignments
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RouteVisualizationMap;
