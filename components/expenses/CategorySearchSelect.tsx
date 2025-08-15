import React, { useState, useEffect, useRef } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { MagnifyingGlassIcon, CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';

interface ExpenseCategory {
    id: string;
    name: string;
    group: string;
}

interface CategorySearchSelectProps {
    categories: ExpenseCategory[];
    selectedCategoryId: string;
    onCategoryChange: (categoryId: string, groupName: string) => void;
    loading?: boolean;
    disabled?: boolean;
    placeholder?: string;
}

const CategorySearchSelect: React.FC<CategorySearchSelectProps> = ({
    categories,
    selectedCategoryId,
    onCategoryChange,
    loading = false,
    disabled = false,
    placeholder = 'Search and select category...',
}) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Find selected category
    const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);

    // Filter categories based on search query
    const filteredCategories =
        query === ''
            ? categories
            : categories.filter((category) => {
                  const searchText = `${category.name} ${category.group}`.toLowerCase();
                  return searchText.includes(query.toLowerCase());
              });

    // Group filtered categories by group for better organization
    const groupedCategories = filteredCategories.reduce((acc, category) => {
        if (!acc[category.group]) {
            acc[category.group] = [];
        }
        acc[category.group].push(category);
        return acc;
    }, {} as Record<string, ExpenseCategory[]>);

    // Reset query when selection changes
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
        }
    }, [isOpen]);

    const handleCategorySelect = (category: ExpenseCategory) => {
        onCategoryChange(category.id, category.group);
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <Combobox value={selectedCategory} onChange={handleCategorySelect} disabled={loading || disabled}>
                <div className="relative">
                    <Combobox.Button
                        as="div"
                        className={classNames(
                            'relative w-full cursor-pointer',
                            loading || disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text',
                        )}
                        onClick={() => {
                            if (!loading && !disabled) {
                                setIsOpen(true);
                                setTimeout(() => inputRef.current?.focus(), 0);
                            }
                        }}
                    >
                        <div
                            className={classNames(
                                'relative w-full border-0 rounded-lg px-3 py-2.5 text-left transition-all duration-200',
                                loading || disabled
                                    ? 'bg-gray-100 opacity-60 cursor-not-allowed'
                                    : 'bg-gray-50 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500 hover:bg-white cursor-text',
                            )}
                        >
                            <div className="flex items-center">
                                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    {isOpen ? (
                                        <Combobox.Input
                                            ref={inputRef}
                                            className="w-full border-0 bg-transparent text-gray-900 font-medium placeholder-gray-500 focus:ring-0 focus:outline-none text-sm"
                                            placeholder={placeholder}
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onBlur={() => {
                                                // Delay closing to allow selection
                                                setTimeout(() => setIsOpen(false), 150);
                                            }}
                                        />
                                    ) : (
                                        <span className="block truncate text-gray-900 font-medium text-sm">
                                            {loading
                                                ? 'Loading categories...'
                                                : selectedCategory
                                                ? `${selectedCategory.name} (${selectedCategory.group})`
                                                : placeholder}
                                        </span>
                                    )}
                                </div>
                                <span className="flex items-center pr-1 pointer-events-none">
                                    {loading ? (
                                        <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                                    ) : (
                                        <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                                    )}
                                </span>
                            </div>
                        </div>
                    </Combobox.Button>

                    <Transition
                        show={isOpen && !loading && !disabled}
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-150"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                    >
                        <Combobox.Options className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto py-1">
                            {Object.keys(groupedCategories).length === 0 ? (
                                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                                    {query ? 'No categories found matching your search.' : 'No categories available.'}
                                </div>
                            ) : (
                                Object.entries(groupedCategories).map(([groupName, groupCategories]) => (
                                    <div key={groupName}>
                                        {/* Group Header */}
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                                            {groupName}
                                        </div>

                                        {/* Categories in this group */}
                                        {groupCategories.map((category) => (
                                            <Combobox.Option
                                                key={category.id}
                                                value={category}
                                                className={({ active, selected }) =>
                                                    classNames(
                                                        'relative cursor-pointer select-none py-2.5 pl-3 pr-10 mx-1 rounded-md transition-colors',
                                                        active && !selected ? 'bg-gray-50 text-gray-900' : '',
                                                        active && selected ? 'bg-blue-50 text-blue-900' : '',
                                                        selected && !active ? 'bg-blue-50/50 text-blue-900' : '',
                                                        !active && !selected ? 'text-gray-900' : '',
                                                    )
                                                }
                                            >
                                                {({ selected, active }) => (
                                                    <>
                                                        <div className="flex items-center">
                                                            <span
                                                                className={classNames(
                                                                    'block truncate text-sm',
                                                                    selected ? 'font-medium' : 'font-normal',
                                                                )}
                                                            >
                                                                {category.name}
                                                            </span>
                                                        </div>
                                                        {selected && (
                                                            <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                                <CheckIcon className="h-4 w-4 text-blue-600" />
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </Combobox.Option>
                                        ))}
                                    </div>
                                ))
                            )}
                        </Combobox.Options>
                    </Transition>
                </div>
            </Combobox>
        </div>
    );
};

export default CategorySearchSelect;
