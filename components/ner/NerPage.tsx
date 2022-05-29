import React, { useEffect, useRef, useState } from 'react';
import { entities, Entity, PageOcrData, Rectangle } from '../../interfaces/ner';
import Selection from './Selection';

type Props = {
    data: Blob;
    pageOcrData: PageOcrData;
    setPageOcrData?(ocrData: PageOcrData): void;
};

const NerPage: React.FC<Props> = ({ data, pageOcrData, setPageOcrData }) => {
    const scale = 1;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

    const [pageData, setPageData] = useState<PageOcrData>();

    const [originalCanvasImage, setOriginalCanvasImage] = useState<ImageData>(null);

    useEffect(() => {
        if (canvasRef) {
            setContext(canvasRef.current.getContext('2d'));
        }
    }, [canvasRef]);

    useEffect(() => {
        setPageData({
            ...pageOcrData,
            words: [
                ...pageOcrData.words.map((word) => ({
                    ...word,
                    tagId: word.tagId || 0,
                })),
            ],
        });
    }, [pageOcrData]);

    useEffect(() => {
        if (canvasRef && context && data) {
            // Clear canvas
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Render blob to canvas
            const img = new Image();
            img.onload = () => {
                context.drawImage(img, 0, 0, img.width * scale, img.height * scale);

                // Draw words boxes on canvas
                const { words } = pageOcrData;

                words.forEach((word) => {
                    const { left: x, top: y, width, height } = word;

                    context.strokeStyle = 'gray';
                    context.lineWidth = 1;

                    context.strokeRect(x * scale, y * scale, width * scale, height * scale);
                });

                // Save the state of the canvas
                const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
                setOriginalCanvasImage(imageData);
            };
            img.src = URL.createObjectURL(data);
        }
    }, [data, canvasRef, context]);

    useEffect(() => {
        if (canvasRef && context && originalCanvasImage) {
            // Clear canvas
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            // Restore the state of the canvas
            context.putImageData(originalCanvasImage, 0, 0);

            const words = pageData?.words;
            if (words && words.length > 0) {
                // Draw annotated words on canvas
                words.forEach((word) => {
                    if (word.tagId === 0) {
                        return;
                    }

                    const { left: x, top: y, width, height } = word;

                    const entity = entities[word.tagId - 1];

                    // Draw fill over word
                    context.fillStyle = entity.color;
                    context.globalAlpha = 0.4;
                    context.fillRect(x * scale, y * scale, width * scale, height * scale);
                    context.globalAlpha = 1.0;

                    // Draw entity id on top of word
                    context.fillStyle = entity.color;
                    context.fillRect(x * scale, y * scale - 12, String(entity.id).length * 12 * scale, 12 * scale);
                    context.fillStyle = 'white';
                    context.font = '12px Arial';
                    context.fillText(String(' ' + entity.id), x * scale, y * scale);
                });
            }
        }
    }, [pageData, canvasRef, context, originalCanvasImage]);

    const processSelection = ({ selectionCoords, entity }: { selectionCoords: Rectangle; entity: Entity }) => {
        const { left, top, width, height } = selectionCoords;
        const { words } = pageData;

        const selectedWords = words.filter((word) => {
            const { left: wordLeft, top: wordTop, width: wordWidth, height: wordHeight } = word;

            // Check if selection overlaps with word
            return (
                left * scale <= wordLeft * scale + wordWidth * scale &&
                left * scale + width * scale >= wordLeft * scale &&
                top * scale <= wordTop * scale + wordHeight * scale &&
                top * scale + height * scale >= wordTop * scale
            );
        });

        const atLeastOneUntaggedWord = selectedWords.some((word) => !word.tagId);
        if (atLeastOneUntaggedWord) {
            // Add entity tag to selected words
            selectedWords.forEach((word) => {
                word.tagId = entity.id;
            });
        } else {
            // Remove entity tag from selected words
            selectedWords.forEach((word) => {
                word.tagId = 0;
            });
        }

        const newOcrData = {
            ...pageData,
            words: [...words],
        };
        setPageData(newOcrData);
        setPageOcrData(newOcrData);
    };

    return (
        <div className="relative">
            <canvas ref={canvasRef} width={pageOcrData.width * scale} height={pageOcrData.height * scale} />
            <Selection
                className="absolute top-0 bottom-0 left-0 right-0 overflow-hidden leading-tight"
                onSelectionChange={(selection) => {
                    processSelection(selection);
                }}
                style={{ width: `${pageOcrData.width * scale}px`, height: `${pageOcrData.height * scale}px` }}
            >
                <div></div>
            </Selection>
        </div>
    );
};

export default NerPage;
