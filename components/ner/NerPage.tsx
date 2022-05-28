import React, { useEffect, useRef, useState } from 'react';
import { OcrDataItem } from '../../interfaces/ner';

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
            console.log('NerPage: useEffect: data', data);
            console.log('ocrDataItem', ocrDataItem);

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
        <div>
            <canvas ref={canvasRef} width={ocrDataItem.width * scale} height={ocrDataItem.height * scale} />
        </div>
    );
};

export default NerPage;
