import React, { useMemo } from 'react';
import { Rectangle } from '../../interfaces/ner';

interface Props {
    isDragging: boolean;
    coordinates: Rectangle;
}

const SelectionRectangle = ({ isDragging, coordinates }: Props) => {
    const visibility = useMemo(() => (isDragging ? 'visible' : 'hidden'), [isDragging]);

    return (
        <span
            data-ignore={true}
            className="absolute border-2 border-red-400 border-dashed opacity-30"
            style={{
                visibility,
                left: `${coordinates.left}px`,
                top: `${coordinates.top}px`,
                width: `${coordinates.width}px`,
                height: `${coordinates.height}px`,
            }}
        />
    );
};

export default SelectionRectangle;
