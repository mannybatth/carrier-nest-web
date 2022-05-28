import React, { FC, useMemo, useRef } from 'react';
import { Entity, Point } from '../../interfaces/ner';

interface Props {
    mouseCoords: Point;
    entity?: Entity;
}

const OFFSET = 15;

const CursorText: FC<Props> = ({ entity, mouseCoords }) => {
    const ref = useRef(null);

    const style = useMemo(() => {
        if (!entity || !ref.current) {
            return {};
        }

        return {
            left: `${mouseCoords.x + OFFSET}px`,
            top: `${mouseCoords.y + OFFSET}px`,
            backgroundColor: entity.color,
        };
    }, [entity, mouseCoords]);

    if (!entity) {
        return null;
    }

    return (
        <span className="absolute z-10 px-2 py-1 overflow-hidden border-r-8 whitespace-nowrap" ref={ref} style={style}>
            {entity.name}
        </span>
    );
};

export default CursorText;
