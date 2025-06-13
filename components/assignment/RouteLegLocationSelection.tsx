'use client';

import { ArrowLeftIcon, BuildingOffice2Icon, StopCircleIcon, Bars3Icon } from '@heroicons/react/24/outline';
import type { LoadStop, Location } from '@prisma/client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLoadContext } from '../context/LoadContext';
import { LoadingOverlay } from '../LoadingOverlay';
import Spinner from '../Spinner';
import { useRouteLegDataContext } from 'components/context/RouteLegDataContext';
import type { ExpandedRouteLegLocation } from 'interfaces/models';
import { getAllLocations } from 'lib/rest/locations';

interface ListItem {
    legLocation: ExpandedRouteLegLocation;
    selected: boolean;
}

interface DragState {
    isDragging: boolean;
    draggedIndex: number | null;
    hoverIndex: number | null;
    dragDirection: 'up' | 'down' | null;
    dragOffset: { x: number; y: number };
}

interface LocationItemProps {
    locationItem: ListItem;
    index: number;
    onToggleSelection: (index: number) => void;
    onReorder: (fromIndex: number, toIndex: number) => void;
    dragState: DragState;
    onDragStateChange: (state: Partial<DragState>) => void;
}

const LocationItem: React.FC<LocationItemProps> = ({
    locationItem,
    index,
    onToggleSelection,
    onReorder,
    dragState,
    onDragStateChange,
}) => {
    const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const itemRef = useRef<HTMLDivElement>(null);

    const isLoadStop = !!locationItem.legLocation.loadStop;
    const item = isLoadStop ? locationItem.legLocation.loadStop : locationItem.legLocation.location;

    const isDragging = dragState.isDragging && dragState.draggedIndex === index;
    const isHovered = dragState.hoverIndex === index && dragState.draggedIndex !== index;
    const shouldSlideUp = isHovered && dragState.dragDirection === 'up';
    const shouldSlideDown = isHovered && dragState.dragDirection === 'down';

    // Calculate transform for sliding effect
    const getTransform = () => {
        if (isDragging) {
            return `translate(${dragState.dragOffset.x}px, ${dragState.dragOffset.y}px) scale(1.02) rotate(1deg)`;
        }
        if (shouldSlideUp) {
            return 'translateY(-8px)';
        }
        if (shouldSlideDown) {
            return 'translateY(8px)';
        }
        return 'translateY(0px)';
    };

    // Desktop drag handlers
    const handleDragStart = (e: React.DragEvent) => {
        onDragStateChange({
            isDragging: true,
            draggedIndex: index,
            dragOffset: { x: 0, y: 0 },
        });

        // Hide default drag image
        const emptyImg = new Image();
        emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
        e.dataTransfer.setDragImage(emptyImg, 0, 0);
        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        onDragStateChange({
            isDragging: false,
            draggedIndex: null,
            hoverIndex: null,
            dragDirection: null,
            dragOffset: { x: 0, y: 0 },
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (dragState.draggedIndex !== null && dragState.draggedIndex !== index) {
            const rect = itemRef.current?.getBoundingClientRect();
            if (rect) {
                const mouseY = e.clientY;
                const itemCenterY = rect.top + rect.height / 2;
                const direction = mouseY < itemCenterY ? 'up' : 'down';

                onDragStateChange({
                    hoverIndex: index,
                    dragDirection: direction,
                });
            }
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        if (dragState.draggedIndex !== null && dragState.draggedIndex !== index) {
            onDragStateChange({ hoverIndex: index });
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        const rect = itemRef.current?.getBoundingClientRect();
        if (rect) {
            const { clientX, clientY } = e;
            if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
                onDragStateChange({ hoverIndex: null, dragDirection: null });
            }
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const fromIndex = Number.parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = index;

        if (fromIndex !== toIndex) {
            onReorder(fromIndex, toIndex);
        }

        onDragStateChange({
            isDragging: false,
            draggedIndex: null,
            hoverIndex: null,
            dragDirection: null,
            dragOffset: { x: 0, y: 0 },
        });
    };

    // Track mouse movement during drag
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging && itemRef.current) {
                const rect = itemRef.current.getBoundingClientRect();
                const offsetX = e.clientX - rect.left - rect.width / 2;
                const offsetY = e.clientY - rect.top - rect.height / 2;

                onDragStateChange({
                    dragOffset: { x: offsetX * 0.3, y: offsetY * 0.3 },
                });
            }
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            return () => document.removeEventListener('mousemove', handleMouseMove);
        }
    }, [isDragging, onDragStateChange]);

    // Mobile touch handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setTouchStartPos({ x: touch.clientX, y: touch.clientY });

        const timer = setTimeout(() => {
            onDragStateChange({
                isDragging: true,
                draggedIndex: index,
                dragOffset: { x: 0, y: 0 },
            });

            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500);

        setLongPressTimer(timer);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartPos) return;

        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);

        if ((deltaX > 10 || deltaY > 10) && longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }

        if (isDragging) {
            e.preventDefault();

            const offsetX = (touch.clientX - touchStartPos.x) * 0.3;
            const offsetY = (touch.clientY - touchStartPos.y) * 0.3;

            onDragStateChange({
                dragOffset: { x: offsetX, y: offsetY },
            });

            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const dropTarget = elementBelow?.closest('[data-drop-target]');

            if (dropTarget && dropTarget !== itemRef.current) {
                const targetIndex = Number.parseInt(dropTarget.getAttribute('data-index') || '0');
                const rect = dropTarget.getBoundingClientRect();
                const touchY = touch.clientY;
                const itemCenterY = rect.top + rect.height / 2;
                const direction = touchY < itemCenterY ? 'up' : 'down';

                onDragStateChange({
                    hoverIndex: targetIndex,
                    dragDirection: direction,
                });
            }
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }

        if (isDragging && dragState.hoverIndex !== null && dragState.hoverIndex !== index) {
            onReorder(index, dragState.hoverIndex);
        }

        setTouchStartPos(null);
        onDragStateChange({
            isDragging: false,
            draggedIndex: null,
            hoverIndex: null,
            dragDirection: null,
            dragOffset: { x: 0, y: 0 },
        });
    };

    return (
        <div
            ref={itemRef}
            draggable
            data-drop-target
            data-index={index}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`
        relative bg-white rounded-xl border transition-all duration-300 ease-out
        ${
            isDragging
                ? 'opacity-90 shadow-xl z-50 border-blue-400 ring-2 ring-blue-200 ring-opacity-50'
                : 'opacity-100 shadow-sm border-gray-200'
        }
        ${isHovered && !isDragging ? 'border-blue-300 shadow-md bg-blue-50' : ''}
        ${locationItem.selected ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white'}
        ${!isDragging ? 'hover:shadow-md hover:border-gray-300' : ''}
        cursor-grab active:cursor-grabbing
      `}
            style={{
                transform: getTransform(),
                zIndex: isDragging ? 1000 : 'auto',
                transition: isDragging
                    ? 'box-shadow 0.2s ease-out, border-color 0.2s ease-out'
                    : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            {/* Drag indicator overlay */}
            {isDragging && <div className="absolute inset-0 bg-blue-500 bg-opacity-5 rounded-xl pointer-events-none" />}

            {/* Drop zone indicators */}
            {isHovered && !isDragging && (
                <>
                    {shouldSlideUp && <div className="absolute -top-1 left-4 right-4 h-0.5 bg-blue-400 rounded-full" />}
                    {shouldSlideDown && (
                        <div className="absolute -bottom-1 left-4 right-4 h-0.5 bg-blue-400 rounded-full" />
                    )}
                </>
            )}

            <div className="flex items-start space-x-3 p-4 relative z-10">
                <div className="flex-shrink-0 flex flex-col items-center space-y-2">
                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                        <Bars3Icon
                            className={`w-4 h-4 transition-colors duration-200 ${
                                isDragging ? 'text-blue-600' : 'text-gray-500'
                            }`}
                        />
                    </div>
                    {isLoadStop ? (
                        <BuildingOffice2Icon
                            className={`w-6 h-6 transition-colors duration-200 ${
                                isDragging ? 'text-blue-600' : 'text-gray-500'
                            }`}
                        />
                    ) : (
                        <StopCircleIcon
                            className={`w-6 h-6 transition-colors duration-200 ${
                                isDragging ? 'text-blue-600' : 'text-gray-500'
                            }`}
                        />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p
                        className={`text-base font-semibold capitalize truncate mb-1 transition-colors duration-200 ${
                            isDragging ? 'text-blue-900' : 'text-gray-900'
                        }`}
                    >
                        {item.name.toLowerCase()}
                    </p>
                    {isLoadStop && (
                        <p
                            className={`text-sm font-medium mb-1 transition-colors duration-200 ${
                                isDragging ? 'text-blue-700' : 'text-blue-600'
                            }`}
                        >
                            {new Date((item as LoadStop).date).toLocaleDateString()} @ {(item as LoadStop).time}
                        </p>
                    )}
                    <p
                        className={`text-sm truncate mb-1 capitalize transition-colors duration-200 ${
                            isDragging ? 'text-blue-700' : 'text-gray-600'
                        }`}
                    >
                        {item.street.toLowerCase()}
                    </p>
                    <p
                        className={`text-sm capitalize transition-colors duration-200 ${
                            isDragging ? 'text-blue-600' : 'text-gray-500'
                        }`}
                    >
                        {item.city.toLowerCase()}, {item.state.toUpperCase()}, {item.zip}
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <div
                        className={`w-6 h-6 bg-gray-50 rounded flex items-center justify-center border transition-all duration-200 ${
                            isDragging ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={locationItem.selected}
                            onChange={() => onToggleSelection(index)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

type Props = {
    title?: string;
    onLegLocationsSelectionSave: (legLocations: ExpandedRouteLegLocation[]) => void;
    onGoBack: () => void;
};

const RouteLegLocationSelection: React.FC<Props> = ({ title, onLegLocationsSelectionSave, onGoBack }: Props) => {
    const [load] = useLoadContext();
    const [routeLegData] = useRouteLegDataContext();
    const [allListItems, setAllListItems] = React.useState<ListItem[]>([]);
    const [locationOptions, setLocationOptions] = React.useState<Location[]>([]);
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        draggedIndex: null,
        hoverIndex: null,
        dragDirection: null,
        dragOffset: { x: 0, y: 0 },
    });

    const [loadingInit, setLoadingInit] = React.useState<boolean>(true);
    const [saveLoading, setSaveLoading] = React.useState<boolean>(false);

    const handleDragStateChange = useCallback((newState: Partial<DragState>) => {
        setDragState((prev) => ({ ...prev, ...newState }));
    }, []);

    useEffect(() => {
        if (!load || !routeLegData) return;
        initView();
    }, [load, routeLegData]);

    const initView = async () => {
        const response = await getAllLocations({
            limit: 100,
            offset: 0,
            sort: { key: 'createdAt', order: 'desc' },
        });
        const locations = response.locations;
        setLocationOptions(locations);

        const legLocationsFromLoad = [load.shipper, ...load.stops, load.receiver].map((stop) => ({
            legLocation: { loadStop: stop, location: null },
            selected: false,
        }));

        const existingLegLocations = routeLegData.locations.map((loc) => ({
            legLocation: loc,
            selected: true,
        }));

        const availableFromLoad = legLocationsFromLoad.filter(
            (loc) =>
                !existingLegLocations.some(
                    (existingLoc) => existingLoc.legLocation.loadStop?.id === loc.legLocation.loadStop.id,
                ),
        );

        const allListItems = [...existingLegLocations];
        availableFromLoad.forEach((loc) => {
            const index = legLocationsFromLoad.findIndex(
                (item) => item.legLocation.loadStop.id === loc.legLocation.loadStop.id,
            );
            allListItems.splice(index, 0, loc as ListItem);
        });

        setAllListItems(allListItems);
        setLoadingInit(false);
    };

    const toggleItemSelection = (index: number) => {
        setAllListItems((prevItems) =>
            prevItems.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)),
        );
    };

    const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
        setAllListItems((prevItems) => {
            const newItems = [...prevItems];
            const [movedItem] = newItems.splice(fromIndex, 1);
            newItems.splice(toIndex, 0, movedItem);
            return newItems;
        });
    }, []);

    const addLocationToSelected = (location: Location) => {
        const item: ListItem = { legLocation: { location }, selected: true };
        setAllListItems([...allListItems, item]);
    };

    const saveSelectedItems = async () => {
        setSaveLoading(true);
        const selectedLegLocations = allListItems.filter((item) => item.selected).map((item) => item.legLocation);
        onLegLocationsSelectionSave(selectedLegLocations);
        onGoBack();
        setSaveLoading(false);
    };

    const selectedCount = allListItems.filter((item) => item.selected).length;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {saveLoading && <LoadingOverlay />}

            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
                <div className="flex items-center px-6 py-6">
                    <button
                        type="button"
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors mr-3"
                        onClick={onGoBack}
                    >
                        <ArrowLeftIcon className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-gray-900">{title || 'Select Locations'}</h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {dragState.isDragging
                                ? 'Drop to reorder • Release to place'
                                : 'Long press and drag to reorder • Tap to select'}
                        </p>
                    </div>
                </div>
            </div>

            {loadingInit ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center space-x-3 text-gray-500">
                        <Spinner />
                        <span className="text-base">Loading locations...</span>
                    </div>
                </div>
            ) : (
                <>
                    {/* Scrollable Content with proper padding at bottom */}
                    <div className="flex-1 overflow-y-auto pb-safe">
                        {/* Route Locations */}
                        <div className="p-6 space-y-3">
                            {allListItems.map((locationItem, index) => (
                                <LocationItem
                                    key={`location-${index}`}
                                    locationItem={locationItem}
                                    index={index}
                                    onToggleSelection={toggleItemSelection}
                                    onReorder={handleReorder}
                                    dragState={dragState}
                                    onDragStateChange={handleDragStateChange}
                                />
                            ))}
                        </div>

                        {/* Available Locations Section */}
                        {locationOptions.length > 0 && (
                            <div className="border-t-4 border-gray-200 bg-transparent">
                                <div className="p-6">
                                    <h2 className="text-base font-bold text-gray-900 mb-1">Available Locations</h2>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Tap + to add custom location to your route
                                    </p>
                                    <div className="space-y-3">
                                        {locationOptions.map((location, index) => (
                                            <div
                                                key={`available-location-${index}`}
                                                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                                            >
                                                <div className="flex items-center space-x-3 p-4">
                                                    <StopCircleIcon className="w-6 h-6 text-gray-500 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-base font-semibold text-gray-900 capitalize truncate">
                                                            {location.name.toLowerCase()}
                                                        </p>
                                                        <p className="text-sm text-gray-600 capitalize truncate">
                                                            {location.street.toLowerCase()}
                                                        </p>
                                                        <p className="text-sm text-gray-500 capitalize">
                                                            {location.city.toLowerCase()},{' '}
                                                            {location.state.toUpperCase()}, {location.zip}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full text-white font-bold transition-colors shadow-sm"
                                                        onClick={() => addLocationToSelected(location)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {locationOptions.length === 0 && (
                            <div className="border-t-4 border-gray-200 bg-white p-8">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <StopCircleIcon className="w-12 h-12 text-gray-300 mb-3" />
                                    <p className="text-base font-medium text-gray-500 mb-2">No available locations</p>
                                    <a
                                        href="/locations"
                                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Add new locations →
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Bottom Padding for Fixed Actions */}
                        {selectedCount >= 2 && <div className="h-24" />}
                    </div>

                    {/* Bottom Actions - Sticky instead of fixed/absolute */}
                    {selectedCount >= 2 && (
                        <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-md">
                            <div className="p-6">
                                <div className="flex items-center space-x-3">
                                    <button
                                        type="button"
                                        onClick={saveSelectedItems}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm"
                                    >
                                        Select {selectedCount} Location{selectedCount !== 1 ? 's' : ''}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onGoBack}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setAllListItems(allListItems.map((item) => ({ ...item, selected: false })))
                                    }
                                    className="w-full mt-2 text-blue-600 hover:text-blue-700 font-medium py-2 transition-colors text-sm"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RouteLegLocationSelection;
