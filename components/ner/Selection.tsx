import React, { useState, useMemo, useRef, useEffect, useCallback, useContext } from 'react';
import useMouse from '@react-hook/mouse-position';
import CursorText from './CursorText';
import { Entity, Point, Rectangle } from '../../interfaces/ner';
import SelectionRectangle from './SelectionRectangle';
import EntityContext from '../../lib/ner/entityContext';

export const isCoordsEmpty = (coordinates: Rectangle): boolean => {
    return coordinates.width * coordinates.height <= 25;
};

export const calculateSelectionRectangle = (startPoint: Point, endPoint: Point): Rectangle => {
    const x3 = Math.min(startPoint.x, endPoint.x);
    const x4 = Math.max(startPoint.x, endPoint.x);
    const y3 = Math.min(startPoint.y, endPoint.y);
    const y4 = Math.max(startPoint.y, endPoint.y);

    return { left: x3, top: y3, width: x4 - x3, height: y4 - y3 };
};

interface Props {
    children: React.ReactNode;
    className?: string;
    style?: { [key: string]: string };
    onSelectionChange?: ({ selectionCoords, entity }: { selectionCoords: Rectangle; entity: Entity }) => void;
}

const initialCoords: Rectangle = { left: 0, top: 0, width: 0, height: 0 };

const Selection = ({ children, className, style, onSelectionChange }: Props) => {
    const selectionRef = useRef(null);
    const mouse = useMouse(selectionRef);

    const [isDragging, setIsDragging] = useState(false);
    const [mouseCoords, setMouseCoords] = useState<Point>({ x: 0, y: 0 });
    const [coords, setCoords] = useState(initialCoords);

    const { entity } = useContext(EntityContext);

    const mode = useMemo(() => {
        if (entity && isDragging) {
            // annotating mode
            return 'select-none cursor-crosshair';
        }

        // normal mode
        return 'cursor-default';
    }, [entity, isDragging]);

    const handleKeyEvent = useCallback(
        (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'escape' && isDragging) {
                setIsDragging(false);
                setMouseCoords({ x: 0, y: 0 });
                setCoords(initialCoords);
            }
        },
        [isDragging],
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyEvent, false);
        return () => {
            document.removeEventListener('keydown', handleKeyEvent, false);
        };
    }, [handleKeyEvent]);

    const handleMouseDown = useCallback(() => {
        if (entity) {
            const { x, y } = mouse;
            setMouseCoords({ x, y });
            setIsDragging(true);
        }
    }, [entity, mouse]);

    const handleMouseUp = useCallback(() => {
        if (selectionRef && entity) {
            let coordsToUse = coords;
            if (isCoordsEmpty(coords)) {
                const { x, y } = mouse;
                coordsToUse = { left: x, top: y, width: 1, height: 1 };
            }
            onSelectionChange && onSelectionChange({ entity, selectionCoords: coordsToUse });
        }

        setIsDragging(false);
        setMouseCoords({ x: 0, y: 0 });
        setCoords(initialCoords);
    }, [entity, coords, mouse]);

    const handleMouseMove = useCallback(() => {
        if (isDragging && entity) {
            const { x, y } = mouse;
            setCoords(calculateSelectionRectangle(mouseCoords, { x, y }));
        }
    }, [isDragging, entity, mouse, mouseCoords]);

    return (
        <div
            role="document"
            ref={selectionRef}
            className={`${className} ${mode}`}
            style={style}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
        >
            <CursorText entity={entity} mouseCoords={{ x: mouse?.x, y: mouse?.y }} />
            <SelectionRectangle isDragging={isDragging} coordinates={coords} />
            {children}
        </div>
    );
};

export default Selection;
