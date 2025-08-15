import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SelectedItemDisplayProps {
    /** The display text for the selected item */
    displayText: string;
    /** Callback function when remove button is clicked */
    onRemove: () => void;
    /** Optional additional content to display below the main text */
    subtitle?: string;
    /** Optional className for custom styling */
    className?: string;
}

/**
 * Reusable component for displaying selected items with a remove button
 * Used for driver, equipment, and load selections in forms
 */
const SelectedItemDisplay: React.FC<SelectedItemDisplayProps> = ({
    displayText,
    onRemove,
    subtitle,
    className = '',
}) => {
    return (
        <div className={`mt-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between ${className}`}>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-blue-900 truncate">{displayText}</p>
                {subtitle && <p className="text-xs text-blue-700 mt-1 truncate">{subtitle}</p>}
            </div>
            <button
                type="button"
                onClick={onRemove}
                className="ml-3 p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-md transition-colors flex-shrink-0"
                title="Remove selection"
            >
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

export default SelectedItemDisplay;
