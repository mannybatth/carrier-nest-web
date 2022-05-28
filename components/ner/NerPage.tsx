import React, { useEffect, useRef, useState } from 'react';
import { OcrDataItem } from '../../interfaces/ner';
import Selection from './Selection';

type Props = {
    data: Blob;
    ocrDataItem: OcrDataItem;
};

const NerPage: React.FC<Props> = ({ data, ocrDataItem }) => {
    const scale = 1;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

    useEffect(() => {
        if (canvasRef) {
            setContext(canvasRef.current.getContext('2d'));
        }
    }, [canvasRef]);

    useEffect(() => {
        if (canvasRef && context && data) {
            // Render blob to canvas
            const img = new Image();
            img.onload = () => {
                context.drawImage(img, 0, 0, img.width * scale, img.height * scale);

                // Draw words boxes on canvas
                const { words } = ocrDataItem;

                words.forEach((word) => {
                    const { left: x, top: y, width, height } = word;

                    context.strokeStyle = 'red';
                    context.lineWidth = 1;

                    context.strokeRect(x * scale, y * scale, width * scale, height * scale);
                });
            };
            img.src = URL.createObjectURL(data);
        }
    }, [data, canvasRef, context]);

    return (
        <div className="relative">
            <canvas ref={canvasRef} width={ocrDataItem.width * scale} height={ocrDataItem.height * scale} />
            <Selection
                className="absolute top-0 bottom-0 left-0 right-0 overflow-hidden leading-tight"
                style={{ width: `${ocrDataItem.width * scale}px`, height: `${ocrDataItem.height * scale}px` }}
            >
                <div></div>
            </Selection>
        </div>
    );
};

export default NerPage;
