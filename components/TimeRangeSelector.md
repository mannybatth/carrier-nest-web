# TimeRangeSelector Component

A reusable React component for selecting specific times or time ranges with an intuitive drag interface. Built with Tailwind CSS and Headless UI.

## Features

-   ✅ **Dual Input Mode**: Type times directly in HH:MM format or use visual slider
-   ✅ **Interactive Slider**: Drag handles to adjust time ranges visually
-   ✅ **Auto-Range Detection**: Automatically switches to range mode when different start/end times are entered
-   ✅ **Format Toggle**: Support for both 12-hour and 24-hour time formats
-   ✅ **Preset Options**: Quick selection buttons for common time ranges
-   ✅ **Duration Display**: Shows calculated duration for time ranges
-   ✅ **Compact Popup**: Clean popup interface that appears above the input field
-   ✅ **Form Integration**: Works seamlessly with React Hook Form
-   ✅ **Validation Support**: Built-in error display and time format validation
-   ✅ **Empty State Handling**: Starts empty and builds time selection progressively
-   ✅ **Accessibility**: Keyboard and screen reader friendly

## Installation

The component is already included in the project. Import it from:

```tsx
import TimeRangeSelector from 'components/TimeRangeSelector';
import { type TimeRangeValue } from 'lib/helpers/time-range-utils';
```

## Basic Usage

```tsx
import React, { useState } from 'react';
import TimeRangeSelector from 'components/TimeRangeSelector';
import { type TimeRangeValue } from 'lib/helpers/time-range-utils';

function MyComponent() {
    const [timeValue, setTimeValue] = useState<TimeRangeValue>({
        startTime: '09:00',
        endTime: '17:00',
        isRange: false,
    });

    return (
        <TimeRangeSelector value={timeValue} onChange={setTimeValue} label="Pickup Time" placeholder="Select time" />
    );
}
```

## Integration with React Hook Form

```tsx
import { Controller } from 'react-hook-form';

<Controller
    name="pickupTime"
    control={control}
    rules={{ required: 'Time is required' }}
    render={({ field, fieldState: { error } }) => (
        <TimeRangeSelector
            value={field.value || { startTime: '09:00', endTime: '17:00', isRange: false }}
            onChange={field.onChange}
            label="Pickup Time"
            error={error?.message}
        />
    )}
/>;
```

## Props

| Prop             | Type                                | Default                                                    | Description                           |
| ---------------- | ----------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| `value`          | `TimeRangeValue`                    | `{ startTime: '09:00', endTime: '17:00', isRange: false }` | Current time value                    |
| `onChange`       | `(value: TimeRangeValue) => void`   | -                                                          | Callback when time changes            |
| `label`          | `string`                            | `'Time'`                                                   | Label for the input field             |
| `placeholder`    | `string`                            | `'Select time'`                                            | Placeholder text                      |
| `is24Hour`       | `boolean`                           | `true`                                                     | Whether to use 24-hour format         |
| `onToggleFormat` | `(is24Hour: boolean) => void`       | -                                                          | Callback for format toggle (optional) |
| `className`      | `string`                            | `''`                                                       | Additional CSS classes                |
| `error`          | `string`                            | -                                                          | Error message to display              |
| `onMouseEnter`   | `(event: React.MouseEvent) => void` | -                                                          | Mouse enter handler                   |
| `onMouseLeave`   | `(event: React.MouseEvent) => void` | -                                                          | Mouse leave handler                   |

## TimeRangeValue Interface

```tsx
interface TimeRangeValue {
    startTime: string; // HH:MM format (e.g., "09:00")
    endTime: string; // HH:MM format (e.g., "17:00")
    isRange: boolean; // true for range, false for specific time
}
```

## Utility Functions

The component comes with utility functions in `lib/helpers/time-range-utils.ts`:

```tsx
import {
    timeRangeToString, // Convert TimeRangeValue to string
    stringToTimeRange, // Parse string to TimeRangeValue
    formatDisplayTime, // Format time for display
    calculateDuration, // Calculate duration between times
    swapTimeRanges, // Swap pickup and dropoff times
    getTimePresets, // Get predefined time options
} from 'lib/helpers/time-range-utils';
```

### Example: Swapping Pickup and Dropoff Times

```tsx
const swapTimes = () => {
    const { pickup, dropoff } = swapTimeRanges(pickupTime, dropoffTime);
    setPickupTime(pickup);
    setDropoffTime(dropoff);
};
```

## Load Form Integration

The component has been integrated into the LoadFormStop component to replace the simple time input. It automatically:

-   Stores simple time strings for backward compatibility
-   Stores TimeRangeValue objects for range selections
-   Maintains form validation
-   Preserves existing styling and layout

## Examples

### Specific Time Selection

```tsx
<TimeRangeSelector
    value={{ startTime: '14:00', endTime: '14:00', isRange: false }}
    onChange={setValue}
    label="Delivery Time"
/>
```

### Time Range Selection

```tsx
<TimeRangeSelector
    value={{ startTime: '09:00', endTime: '17:00', isRange: true }}
    onChange={setValue}
    label="Available Window"
/>
```

### With Format Toggle

```tsx
<TimeRangeSelector
    value={timeValue}
    onChange={setTimeValue}
    is24Hour={is24Hour}
    onToggleFormat={setIs24Hour}
    label="Time"
/>
```

## Demo Page

A complete demo is available at `/examples/time-range-selector` showing all features and use cases.

## Styling

The component uses Tailwind CSS classes and follows the existing design system. Key classes:

-   `bg-gray-50` - Input background
-   `focus:ring-blue-500` - Focus state
-   `text-gray-900` - Text color
-   `shadow-lg` - Popup shadow

## Accessibility

-   Keyboard navigation support
-   Screen reader compatible
-   Focus management
-   ARIA labels and roles
-   High contrast support

## Browser Support

Compatible with all modern browsers that support:

-   CSS Grid
-   Flexbox
-   ES6+ JavaScript features
-   React 18+

## Dependencies

-   React 18+
-   Headless UI
-   Heroicons
-   Tailwind CSS
-   date-fns (inherited from project)
