import React, { useEffect, useRef, useState } from 'react';
import { entities, Entity, PageOcrData, PageOcrDataWord, Rectangle } from '../../interfaces/ner';
import Selection from './Selection';

type Props = {
    data: Blob;
    pageOcrData: PageOcrData;
};

const NerPage: React.FC<Props> = ({ data, pageOcrData }) => {
    const scale = 1;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

    const [annotatedWords, setAnnotatedWords] = useState<PageOcrDataWord[]>([]);

    const [originalCanvasImage, setOriginalCanvasImage] = useState<ImageData>(null);

    useEffect(() => {
        if (canvasRef) {
            setContext(canvasRef.current.getContext('2d'));
        }
    }, [canvasRef]);

    useEffect(() => {
        if (canvasRef && context && data) {
            console.log('INITIAL RENDER CANVAS');

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

            if (annotatedWords && annotatedWords.length > 0) {
                // Draw annotated words on canvas
                annotatedWords.forEach((word) => {
                    const { left: x, top: y, width, height } = word;

                    const entity = entities[word.tagId - 1];

                    // Draw fill over word
                    context.fillStyle = entity.color;
                    context.globalAlpha = 0.4;
                    context.fillRect(x * scale, y * scale, width * scale, height * scale);
                    context.globalAlpha = 1.0;

                    // context.strokeStyle = entity.color;
                    // context.lineWidth = 3;

                    // context.strokeRect(x * scale, y * scale, width * scale, height * scale);

                    // Draw entity id on top of word
                    context.fillStyle = entity.color;
                    context.fillRect(x * scale, y * scale - 12, String(entity.id).length * 12 * scale, 12 * scale);
                    context.fillStyle = 'white';
                    context.font = '12px Arial';
                    context.fillText(String(' ' + entity.id), x * scale, y * scale);
                });
            }
        }
    }, [annotatedWords, canvasRef, context]);

    const processSelection = ({ selectionCoords, entity }: { selectionCoords: Rectangle; entity: Entity }) => {
        const { left, top, width, height } = selectionCoords;
        const { words } = pageOcrData;

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

        console.log('selectedWords', selectedWords);

        const atLeastOneUntaggedWord = selectedWords.some((word) => !word.tagId);

        console.log('atLeastOneUntaggedWord', atLeastOneUntaggedWord);

        if (atLeastOneUntaggedWord) {
            // Add entity tag to selected words
            selectedWords.forEach((word) => {
                word.tagId = entity.id;
            });
        } else {
            // Remove entity tag from selected words
            selectedWords.forEach((word) => {
                word.tagId = undefined;
            });
        }

        const annotatedWords = words.filter((word) => word.tagId);
        setAnnotatedWords([...annotatedWords]);

        console.log('annotatedWords', annotatedWords);
    };

    return (
        <div className="relative">
            <canvas ref={canvasRef} width={pageOcrData.width * scale} height={pageOcrData.height * scale} />
            <Selection
                className="absolute top-0 bottom-0 left-0 right-0 overflow-hidden leading-tight"
                onSelectionChange={(selection) => {
                    console.log(selection);
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
