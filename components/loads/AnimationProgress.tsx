import React, { useState, useEffect } from 'react';

interface AnimatedProgressProps {
    progress: number;
    label: string;
    labelColor: string;
    bgColor: string;
}

const AnimatedProgress: React.FC<AnimatedProgressProps> = ({ progress, label, labelColor, bgColor }) => {
    const [displayProgress, setDisplayProgress] = useState<number>(0);

    useEffect(() => {
        if (displayProgress < progress) {
            // Set up an interval to increment displayProgress
            const intervalId = setInterval(() => {
                setDisplayProgress((prevDisplayProgress) => {
                    // Increment until we reach the new progress value
                    if (prevDisplayProgress < progress) {
                        return prevDisplayProgress + 1;
                    } else {
                        clearInterval(intervalId); // Clear interval once we reach the progress
                        return progress;
                    }
                });
            }, 35); // Increment every 35 milliseconds for a smoother animation

            // Clear the interval when the component unmounts or if progress changes
            return () => clearInterval(intervalId);
        } else {
            // If the progress hasn't changed, just set the displayProgress to the progress
            setDisplayProgress(progress);
        }
    }, [progress, displayProgress]);

    return (
        <div className="relative px-5 sm:px-6 md:px-8">
            {displayProgress > 0 && (
                <>
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <span
                                className={`inline-block px-2 py-1 text-xs font-semibold ${labelColor} uppercase ${bgColor} rounded-full`}
                            >
                                {label}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="inline-block text-xs font-semibold text-blue-600">
                                {displayProgress.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                    <div className="w-full h-2 mb-4 bg-blue-200 rounded">
                        <div
                            style={{ width: `${displayProgress}%` }}
                            className="h-2 duration-500 ease-out bg-blue-500 rounded transition-width"
                        ></div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AnimatedProgress;
