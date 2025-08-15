import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronDownIcon,
    CheckIcon,
    CurrencyDollarIcon,
    CalendarIcon,
    BuildingOfficeIcon,
    UserIcon,
    TruckIcon,
    MapPinIcon,
    DocumentTextIcon,
    MagnifyingGlassIcon,
    ChevronUpDownIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition, Listbox, Combobox } from '@headlessui/react';
import { Fragment } from 'react';
import classNames from 'classnames';
import Spinner from '../Spinner';
import SelectedItemDisplay from '../SelectedItemDisplay';
import { getCachedExpenseCategories, invalidateExpenseCategories } from '../../lib/cache';
import CategorySearchSelect from './CategorySearchSelect';

interface ExpenseCategory {
    id: string;
    name: string;
    group: string;
}

interface Driver {
    id: string;
    name: string;
}

interface Load {
    id: string;
    refNum: string;
    loadNum: string;
    customer?: {
        id: string;
        name: string;
    };
    shipper?: {
        id: string;
        name: string;
        city: string;
        state: string;
    };
    receiver?: {
        id: string;
        name: string;
        city: string;
        state: string;
    };
}

interface Equipment {
    id: string;
    equipmentNumber?: string;
    make: string;
    model?: string;
    drivers?: Driver[];
}

interface ExpenseFormData {
    groupName: string;
    categoryId: string;
    amount: string;
    currencyCode: string;
    paidBy: 'COMPANY' | 'DRIVER';
    description: string;
    vendorName: string;
    receiptDate: string;
    loadId?: string;
    driverId?: string;
    equipmentId?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

interface Props {
    initialData?: any;
    onSubmit: (data: any) => void;
    loading: boolean;
    submitButtonText: string;
    hideSubmitButton?: boolean;
    onValidationChange?: (isValid: boolean) => void;
}

const ExpenseForm: React.FC<Props> = ({
    initialData,
    onSubmit,
    loading,
    submitButtonText,
    hideSubmitButton = false,
    onValidationChange,
}) => {
    const [formData, setFormData] = useState<ExpenseFormData>({
        groupName: '',
        categoryId: '',
        amount: '',
        currencyCode: 'USD',
        paidBy: 'COMPANY',
        description: '',
        vendorName: '',
        receiptDate: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
    });

    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loads, setLoads] = useState<Load[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [driversLoaded, setDriversLoaded] = useState(false);
    const [equipmentLoaded, setEquipmentLoaded] = useState(false);
    const [showLocationFields, setShowLocationFields] = useState(false);
    const [driverSearchQuery, setDriverSearchQuery] = useState('');
    const [searchedDrivers, setSearchedDrivers] = useState<Driver[]>([]);
    const [searchingDrivers, setSearchingDrivers] = useState(false);
    const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
    const [selectedDriverData, setSelectedDriverData] = useState<Driver | null>(null);

    // Equipment search state
    const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
    const [searchedEquipment, setSearchedEquipment] = useState<Equipment[]>([]);
    const [searchingEquipment, setSearchingEquipment] = useState(false);
    const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState(false);
    const [selectedEquipmentData, setSelectedEquipmentData] = useState<Equipment | null>(null);

    // Load search state
    const [loadSearchQuery, setLoadSearchQuery] = useState('');
    const [searchedLoads, setSearchedLoads] = useState<Load[]>([]);
    const [searchingLoads, setSearchingLoads] = useState(false);
    const [isLoadDropdownOpen, setIsLoadDropdownOpen] = useState(false);
    const [selectedLoadData, setSelectedLoadData] = useState<Load | null>(null);

    // Track if user has manually changed paidBy to prevent resetting it
    const userChangedPaidBy = useRef(false);

    // Ref for driver search input
    const driverSearchInputRef = useRef<HTMLInputElement>(null);
    // Ref for equipment search input
    const equipmentSearchInputRef = useRef<HTMLInputElement>(null);
    // Ref for load search input
    const loadSearchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Debounced driver search effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (driverSearchQuery.length > 0) {
                searchDrivers(driverSearchQuery);
            } else {
                setSearchedDrivers([]);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [driverSearchQuery]);

    // Debounced equipment search effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (equipmentSearchQuery.length > 0) {
                searchEquipment(equipmentSearchQuery);
            } else {
                setSearchedEquipment([]);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [equipmentSearchQuery]);

    // Debounced load search effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (loadSearchQuery.length > 0) {
                searchLoads(loadSearchQuery);
            } else {
                setSearchedLoads([]);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [loadSearchQuery, selectedDriverData?.id]); // Include selectedDriverData?.id so search updates when driver changes

    // Effect to sync selectedDriverData with formData.driverId
    useEffect(() => {
        if (formData.driverId) {
            // If driverId is set but we don't have selectedDriverData, try to find it
            if (!selectedDriverData || selectedDriverData.id !== formData.driverId) {
                const driver =
                    drivers.find((d) => d.id === formData.driverId) ||
                    searchedDrivers.find((d) => d.id === formData.driverId);
                if (driver) {
                    setSelectedDriverData(driver);
                }
            }
        } else {
            // If driverId is cleared, clear selectedDriverData
            setSelectedDriverData(null);
        }
    }, [formData.driverId, drivers, searchedDrivers, selectedDriverData]);

    // Effect to sync selectedEquipmentData with formData.equipmentId
    useEffect(() => {
        if (formData.equipmentId) {
            // If equipmentId is set but we don't have selectedEquipmentData, try to find it
            if (!selectedEquipmentData || selectedEquipmentData.id !== formData.equipmentId) {
                const eq =
                    equipment.find((e) => e.id === formData.equipmentId) ||
                    searchedEquipment.find((e) => e.id === formData.equipmentId);
                if (eq) {
                    setSelectedEquipmentData(eq);
                }
            }
        } else {
            // If equipmentId is cleared, clear selectedEquipmentData
            setSelectedEquipmentData(null);
        }
    }, [formData.equipmentId, equipment, searchedEquipment, selectedEquipmentData]);

    // Effect to sync selectedLoadData with formData.loadId
    useEffect(() => {
        if (formData.loadId) {
            // If loadId is set but we don't have selectedLoadData, try to find it
            if (!selectedLoadData || selectedLoadData.id !== formData.loadId) {
                const load =
                    loads.find((l) => l.id === formData.loadId) || searchedLoads.find((l) => l.id === formData.loadId);
                if (load) {
                    setSelectedLoadData(load);
                }
            }
        } else {
            // If loadId is cleared, clear selectedLoadData
            setSelectedLoadData(null);
        }
    }, [formData.loadId, loads, searchedLoads, selectedLoadData]);

    useEffect(() => {
        if (initialData && categories.length > 0) {
            let categoryId = '';
            let groupName = '';

            // Handle AI extraction with categoryName
            if (initialData.categoryName && !initialData.categoryId && !initialData.categoryIds) {
                // AI provided a category name, find the matching category
                const matchingCategory = categories.find(
                    (cat) => cat.name.toLowerCase() === initialData.categoryName.toLowerCase(),
                );

                if (matchingCategory) {
                    categoryId = matchingCategory.id;
                    groupName = matchingCategory.group;
                }
            }
            // Handle backwards compatibility with old categoryId
            else if (initialData.categoryId && !initialData.categoryIds) {
                const category = categories.find((c) => c.id === initialData.categoryId);
                if (category) {
                    categoryId = initialData.categoryId;
                    groupName = category.group;
                }
            }
            // Handle old structure with categoryIds (take first one)
            else if (initialData.categoryIds && initialData.categoryIds.length > 0) {
                const firstCategoryId = initialData.categoryIds[0];
                const category = categories.find((c) => c.id === firstCategoryId);
                if (category) {
                    categoryId = firstCategoryId;
                    groupName = category.group;
                }
            }

            setFormData((prev) => ({
                ...prev,
                ...initialData,
                amount: initialData.amount?.toString() || '',
                receiptDate: initialData.receiptDate || '',
                categoryId,
                groupName,
                // Preserve user changes to paidBy if user has manually changed it
                paidBy: userChangedPaidBy.current ? prev.paidBy : initialData.paidBy,
            }));

            // If we have a driver object from initialData, set it up
            if (initialData.driver) {
                setSelectedDriverData(initialData.driver);
                // Only fetch drivers list if user will need to search/change drivers
                // In edit mode with existing driver, we can skip the initial fetch
                // fetchDrivers will be called on demand when user focuses on the search field

                // Don't fetch loads by driver in edit mode - we already have the selected load
                // The loads API is for search functionality, not for fetching all loads by driver
            }

            // If we have a load object from initialData, set it up
            if (initialData.load) {
                setSelectedLoadData(initialData.load);
            }

            // If we have an equipment object from initialData, set it up
            if (initialData.equipment) {
                setSelectedEquipmentData(initialData.equipment);
                // Only fetch equipment list if user will need to search/change equipment
                // In edit mode with existing equipment, we can skip the initial fetch
                // fetchEquipment will be called on demand when user focuses on the search field
            }

            // If we have driverId but no driver object, and drivers are loaded, find the driver
            if (initialData.driverId && !initialData.driver && driversLoaded) {
                const driver = drivers.find((d) => d.id === initialData.driverId);
                if (driver) {
                    setSelectedDriverData(driver);
                }
            }

            // If we have equipmentId but no equipment object, and equipment is loaded, find the equipment
            if (initialData.equipmentId && !initialData.equipment && equipmentLoaded) {
                const foundEquipment = equipment.find((e) => e.id === initialData.equipmentId);
                if (foundEquipment) {
                    setSelectedEquipmentData(foundEquipment);
                }
            }

            // Only fetch lists if we have IDs but no objects (fallback scenario)
            if (initialData.driverId && !initialData.driver && !driversLoaded) {
                fetchDrivers();
            }
            if (initialData.equipmentId && !initialData.equipment && !equipmentLoaded) {
                fetchEquipment();
            }
        }
    }, [initialData, categories, driversLoaded, equipmentLoaded, drivers, equipment]);

    const fetchInitialData = async () => {
        setLoadingData(true);
        try {
            // Only fetch categories initially - drivers and equipment will be loaded on demand
            const categoriesData = await getCachedExpenseCategories();
            setCategories(categoriesData?.categories || []);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const fetchDrivers = async () => {
        if (driversLoaded) return; // Don't fetch if already loaded

        try {
            const response = await fetch('/api/drivers?active=true');
            const data = await response.json();
            setDrivers(data.drivers || []);
            setDriversLoaded(true);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    const fetchEquipment = async () => {
        if (equipmentLoaded) return; // Don't fetch if already loaded

        try {
            const response = await fetch('/api/equipments');
            const data = await response.json();
            setEquipment(data.data?.equipments || []);
            setEquipmentLoaded(true);
        } catch (error) {
            console.error('Error fetching equipment:', error);
        }
    };

    const refreshCategories = async () => {
        try {
            invalidateExpenseCategories(); // Clear cache first
            const categoriesData = await getCachedExpenseCategories();
            setCategories(categoriesData?.categories || []);
        } catch (error) {
            console.error('Error refreshing categories:', error);
        }
    };

    const fetchLoadsByDriver = async (driverId: string) => {
        try {
            // Use the new expense-specific load lookup API
            const response = await fetch(`/api/expenses/loads/lookup?driverId=${driverId}`);
            const data = await response.json();

            if (data.success) {
                setLoads(data.data.loads || []);
            } else {
                console.error('Error from load lookup API:', data.message);
                setLoads([]);
            }
        } catch (error) {
            console.error('Error fetching loads by driver:', error);
            setLoads([]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = {
            ...formData,
            amount: parseFloat(formData.amount),
        };

        onSubmit(submitData);
    };

    // Get selected category
    const selectedCategory = categories.find((cat) => cat.id === formData.categoryId);

    // Get filtered drivers based on search query
    const filteredDrivers = driverSearchQuery.length > 0 ? searchedDrivers : drivers.slice(0, 10); // Show first 10 when no search

    // Get filtered equipment based on search query
    const filteredEquipment = equipmentSearchQuery.length > 0 ? searchedEquipment : equipment.slice(0, 10); // Show first 10 when no search

    // Get filtered loads based on search query
    const filteredLoads = loadSearchQuery.length > 0 ? searchedLoads : loads.slice(0, 7); // Show first 7 when no search

    const searchDrivers = async (query: string) => {
        if (!query.trim()) {
            setSearchedDrivers([]);
            return;
        }

        setSearchingDrivers(true);
        try {
            const response = await fetch(`/api/drivers/search?q=${encodeURIComponent(query)}&active=true`);
            if (response.ok) {
                const data = await response.json();
                // Handle both direct driver array and search result format
                const driversData = data.data?.drivers || data.drivers || [];
                setSearchedDrivers(driversData);
            }
        } catch (error) {
            console.error('Error searching drivers:', error);
        } finally {
            setSearchingDrivers(false);
        }
    };

    const searchEquipment = async (query: string) => {
        if (!query.trim()) {
            setSearchedEquipment([]);
            return;
        }

        setSearchingEquipment(true);
        try {
            // Filter equipment based on query from already loaded equipment
            const filtered = equipment.filter((eq) => {
                const searchText = query.toLowerCase();
                const equipmentNumber = eq.equipmentNumber?.toLowerCase() || '';
                const make = eq.make?.toLowerCase() || '';
                const model = eq.model?.toLowerCase() || '';

                return equipmentNumber.includes(searchText) || make.includes(searchText) || model.includes(searchText);
            });
            setSearchedEquipment(filtered);
        } catch (error) {
            console.error('Error searching equipment:', error);
        } finally {
            setSearchingEquipment(false);
        }
    };

    const searchLoads = async (query: string) => {
        if (!query.trim()) {
            setSearchedLoads([]);
            return;
        }

        setSearchingLoads(true);
        try {
            // Use the new expense-specific load lookup API
            let apiUrl = `/api/expenses/loads/lookup?refNum=${encodeURIComponent(query)}`;

            // If a specific driver is selected, include it in the search
            if (selectedDriverData?.id) {
                apiUrl += `&driverId=${selectedDriverData.id}`;
            }

            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    setSearchedLoads(data.data.loads || []);
                } else {
                    console.error('Load lookup API error:', data.message);
                    setSearchedLoads([]);
                }
            } else {
                console.error('Load lookup API request failed:', response.status);
                setSearchedLoads([]);
            }
        } catch (error) {
            console.error('Error searching loads:', error);
            setSearchedLoads([]);
        } finally {
            setSearchingLoads(false);
        }
    };

    const handleInputChange = (field: keyof ExpenseFormData, value: string | string[]) => {
        // Validate amount field to prevent negative numbers
        if (field === 'amount' && typeof value === 'string') {
            const numericValue = parseFloat(value);
            if (value !== '' && (isNaN(numericValue) || numericValue < 0)) {
                return; // Don't update if negative or invalid
            }
        }

        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Auto-assign equipment when driver is selected
    useEffect(() => {
        if (formData.driverId && drivers.length > 0 && equipment.length > 0) {
            const selectedDriver = drivers.find((driver) => driver.id === formData.driverId);
            if (selectedDriver) {
                // Find equipment assigned to this driver
                const driverEquipment = equipment.filter(
                    (eq) => eq.drivers && eq.drivers.some((d) => d.id === selectedDriver.id),
                );

                // Auto-assign the first equipment if available and no equipment is already selected
                if (driverEquipment.length > 0 && !formData.equipmentId) {
                    setFormData((prev) => ({
                        ...prev,
                        equipmentId: driverEquipment[0].id,
                    }));
                }
            }
        }
    }, [formData.driverId, drivers, equipment, formData.equipmentId]);

    // Validation helper
    const isFormValid = () => {
        return formData.categoryId && formData.amount && !(formData.paidBy === 'DRIVER' && !formData.driverId);
    };

    // Effect to notify parent about validation state changes
    useEffect(() => {
        if (onValidationChange) {
            onValidationChange(isFormValid());
        }
    }, [formData.categoryId, formData.amount, formData.paidBy, formData.driverId, onValidationChange]);

    // Handle paid by change - simply update the field and set driver requirement
    const handlePaidByChange = (paidBy: 'COMPANY' | 'DRIVER') => {
        userChangedPaidBy.current = true; // Mark that user has manually changed paidBy
        setFormData((prev) => ({
            ...prev,
            paidBy,
        }));
    };

    // Handle category change from the new search-select component
    const handleCategoryChange = (categoryId: string, groupName: string) => {
        setFormData((prev) => ({
            ...prev,
            categoryId,
            groupName,
        }));
    };

    // Find selected driver from multiple sources
    const selectedDriver =
        drivers.find((driver) => driver.id === formData.driverId) ||
        searchedDrivers.find((driver) => driver.id === formData.driverId) ||
        (selectedDriverData?.id === formData.driverId ? selectedDriverData : null);

    // Find selected load from multiple sources
    const selectedLoad =
        loads.find((load) => load.id === formData.loadId) ||
        searchedLoads.find((load) => load.id === formData.loadId) ||
        (selectedLoadData?.id === formData.loadId ? selectedLoadData : null);

    // Find selected equipment from multiple sources
    const selectedEquipment =
        equipment.find((eq) => eq.id === formData.equipmentId) ||
        searchedEquipment.find((eq) => eq.id === formData.equipmentId) ||
        (selectedEquipmentData?.id === formData.equipmentId ? selectedEquipmentData : null);

    // Helper function to get currency symbol
    const getCurrencySymbol = (currencyCode: string) => {
        const symbols: { [key: string]: string } = {
            USD: '$',
            CAD: 'C$',
        };
        return symbols[currencyCode] || '$';
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {loadingData ? (
                /* Skeleton Loading State */
                <div className="space-y-6 animate-pulse">
                    {/* Expense Classification Row skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Expense Type skeleton */}
                        <div>
                            <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                            <div className="relative w-full bg-slate-200 rounded-lg h-10"></div>
                        </div>
                        {/* Categories skeleton */}
                        <div>
                            <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                            <div className="relative w-full bg-slate-200 rounded-lg h-10"></div>
                        </div>
                    </div>

                    {/* Basic Information Row skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <div className="h-4 bg-slate-200 rounded w-16 mb-2"></div>
                            <div className="relative w-full bg-slate-200 rounded-lg h-10"></div>
                        </div>
                        <div>
                            <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                            <div className="relative w-full bg-slate-200 rounded-lg h-10"></div>
                        </div>
                        <div>
                            <div className="h-4 bg-slate-200 rounded w-16 mb-2"></div>
                            <div className="relative w-full bg-slate-200 rounded-lg h-10"></div>
                        </div>
                    </div>

                    {/* Description skeleton */}
                    <div>
                        <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                        <div className="w-full bg-slate-200 rounded-lg h-24"></div>
                    </div>

                    {/* Additional Details skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                            <div className="relative w-full bg-slate-200 rounded-lg h-10"></div>
                        </div>
                        <div>
                            <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                            <div className="relative w-full bg-slate-200 rounded-lg h-10"></div>
                        </div>
                    </div>

                    {/* Submit button skeleton */}
                    {!hideSubmitButton && (
                        <div className="flex justify-end">
                            <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
                        </div>
                    )}
                </div>
            ) : (
                /* Actual Form Content */
                <>
                    {/* Category Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                            Category
                            {selectedCategory && (
                                <span className="ml-1 text-xs text-gray-500">({selectedCategory.group})</span>
                            )}
                        </label>
                        <CategorySearchSelect
                            categories={categories}
                            selectedCategoryId={formData.categoryId}
                            onCategoryChange={handleCategoryChange}
                            loading={loadingData}
                            placeholder="Search and select expense category..."
                        />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200"></div>

                    {/* Vendor Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Vendor/Merchant</label>
                        <input
                            type="text"
                            value={formData.vendorName}
                            onChange={(e) => handleInputChange('vendorName', e.target.value)}
                            className="w-full bg-gray-50 border-0 rounded-lg px-3 py-2.5 text-gray-900 font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                            placeholder="Enter vendor or merchant name..."
                        />
                    </div>

                    {/* Location Section */}
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => setShowLocationFields(!showLocationFields)}
                            className="flex items-center justify-between w-full text-left focus:outline-none"
                        >
                            <label className="block text-sm font-medium text-gray-600">Location (Optional)</label>
                            <ChevronDownIcon
                                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                                    showLocationFields ? 'transform rotate-180' : ''
                                }`}
                            />
                        </button>

                        {showLocationFields && (
                            <div className="space-y-3 bg-gray-50/50 rounded-lg p-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Street Address"
                                        value={formData.street}
                                        onChange={(e) => handleInputChange('street', e.target.value)}
                                        className="w-full bg-white border-0 rounded-lg px-3 py-2.5 text-gray-900 font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                                    />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <input
                                        type="text"
                                        placeholder="City"
                                        value={formData.city}
                                        onChange={(e) => handleInputChange('city', e.target.value)}
                                        className="w-full bg-white border-0 rounded-lg px-3 py-2.5 text-gray-900 font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                                    />
                                    <input
                                        type="text"
                                        placeholder="State"
                                        value={formData.state}
                                        onChange={(e) => handleInputChange('state', e.target.value)}
                                        className="w-full bg-white border-0 rounded-lg px-3 py-2.5 text-gray-900 font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                                    />
                                    <input
                                        type="text"
                                        placeholder="ZIP Code"
                                        value={formData.postalCode}
                                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                                        className="w-full bg-white border-0 rounded-lg px-3 py-2.5 text-gray-900 font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                                    />
                                    <select
                                        value={formData.country}
                                        onChange={(e) => handleInputChange('country', e.target.value)}
                                        className="w-full bg-white border-0 rounded-lg px-3 py-2.5 text-gray-900 font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                                    >
                                        <option value="US">United States</option>
                                        <option value="CA">Canada</option>
                                        <option value="MX">Mexico</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description - Moved below vendor/location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            rows={3}
                            className="w-full bg-gray-50 border-0 rounded-lg px-3 py-2.5 text-gray-900 font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all duration-200 resize-none"
                            placeholder="Describe the expense..."
                        />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200"></div>

                    {/* Amount and Date Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Amount with Currency */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Amount</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 font-medium">
                                        {getCurrencySymbol(formData.currencyCode)}
                                    </span>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => handleInputChange('amount', e.target.value)}
                                    className="w-full bg-gray-50 border-0 rounded-lg pl-8 pr-24 py-2.5 text-gray-900 font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                                    placeholder="0.00"
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <div className="relative">
                                        <select
                                            value={formData.currencyCode}
                                            onChange={(e) => handleInputChange('currencyCode', e.target.value)}
                                            className="appearance-none bg-transparent border-0 py-0 pl-2 pr-6 text-gray-500 font-medium focus:ring-0 focus:outline-none text-sm cursor-pointer"
                                            style={{
                                                backgroundImage: 'none',
                                                WebkitAppearance: 'none',
                                                MozAppearance: 'none',
                                            }}
                                        >
                                            <option value="USD">USD</option>
                                            <option value="CAD">CAD</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none">
                                            <svg
                                                className="h-4 w-4 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Receipt Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Receipt Date</label>
                            <input
                                type="date"
                                value={formData.receiptDate}
                                onChange={(e) => handleInputChange('receiptDate', e.target.value)}
                                className="w-full bg-gray-50 border-0 rounded-lg px-3 py-2.5 text-gray-900 font-medium focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200"></div>

                    {/* Associations Section - Now includes Paid By */}
                    <div className="relative isolate space-y-4">
                        {/* Paid By - Radio Button Design */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-3">Paid By</label>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Company Radio Option */}
                                <label className="relative flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paidBy"
                                        value="COMPANY"
                                        checked={formData.paidBy === 'COMPANY'}
                                        onChange={(e) => handlePaidByChange(e.target.value as 'COMPANY' | 'DRIVER')}
                                        className="sr-only"
                                    />
                                    <div
                                        className={classNames(
                                            'flex-1 p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3',
                                            formData.paidBy === 'COMPANY'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                                        )}
                                    >
                                        <div
                                            className={classNames(
                                                'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                                                formData.paidBy === 'COMPANY'
                                                    ? 'border-blue-500 bg-blue-500'
                                                    : 'border-gray-300 bg-white',
                                            )}
                                        >
                                            {formData.paidBy === 'COMPANY' && (
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            )}
                                        </div>
                                        <BuildingOfficeIcon
                                            className={classNames(
                                                'w-5 h-5',
                                                formData.paidBy === 'COMPANY' ? 'text-blue-600' : 'text-gray-400',
                                            )}
                                        />
                                        <div className="flex-1">
                                            <div
                                                className={classNames(
                                                    'font-medium text-sm',
                                                    formData.paidBy === 'COMPANY' ? 'text-blue-700' : 'text-gray-700',
                                                )}
                                            >
                                                Company
                                            </div>
                                            <div
                                                className={classNames(
                                                    'text-xs',
                                                    formData.paidBy === 'COMPANY' ? 'text-blue-600' : 'text-gray-500',
                                                )}
                                            >
                                                Company paid expense
                                            </div>
                                        </div>
                                    </div>
                                </label>

                                {/* Driver Radio Option */}
                                <label className="relative flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paidBy"
                                        value="DRIVER"
                                        checked={formData.paidBy === 'DRIVER'}
                                        onChange={(e) => handlePaidByChange(e.target.value as 'COMPANY' | 'DRIVER')}
                                        className="sr-only"
                                    />
                                    <div
                                        className={classNames(
                                            'flex-1 p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3',
                                            formData.paidBy === 'DRIVER'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                                        )}
                                    >
                                        <div
                                            className={classNames(
                                                'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                                                formData.paidBy === 'DRIVER'
                                                    ? 'border-blue-500 bg-blue-500'
                                                    : 'border-gray-300 bg-white',
                                            )}
                                        >
                                            {formData.paidBy === 'DRIVER' && (
                                                <div className="w-2 h-2 bg-white rounded-full"></div>
                                            )}
                                        </div>
                                        <UserIcon
                                            className={classNames(
                                                'w-5 h-5',
                                                formData.paidBy === 'DRIVER' ? 'text-blue-600' : 'text-gray-400',
                                            )}
                                        />
                                        <div className="flex-1">
                                            <div
                                                className={classNames(
                                                    'font-medium text-sm',
                                                    formData.paidBy === 'DRIVER' ? 'text-blue-700' : 'text-gray-700',
                                                )}
                                            >
                                                Driver
                                            </div>
                                            <div
                                                className={classNames(
                                                    'text-xs',
                                                    formData.paidBy === 'DRIVER' ? 'text-blue-600' : 'text-gray-500',
                                                )}
                                            >
                                                Driver paid expense
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Driver with Search */}
                        <div className="relative z-[1000]">
                            <label className="block text-sm font-medium text-gray-600 mb-2">
                                Driver {formData.paidBy === 'DRIVER' && <span className="text-red-500">*</span>}
                            </label>

                            {/* Selected Driver Display */}
                            {selectedDriver && (
                                <SelectedItemDisplay
                                    displayText={selectedDriver.name}
                                    onRemove={() => {
                                        handleInputChange('driverId', '');
                                        setSelectedDriverData(null);
                                        setDriverSearchQuery('');
                                        setSearchedDrivers([]);

                                        // Only clear load selection when expense is paid by driver
                                        if (formData.paidBy === 'DRIVER') {
                                            handleInputChange('loadId', '');
                                            setSelectedLoadData(null);
                                            setLoadSearchQuery('');
                                            setSearchedLoads([]);
                                        }

                                        // Clear loads since new API requires driver or search
                                        setLoads([]);
                                    }}
                                />
                            )}

                            {/* Driver Search Field - Only show when no driver is selected */}
                            <div
                                className={`relative isolate transition-all duration-300 ease-in-out ${
                                    selectedDriver
                                        ? 'max-h-0 opacity-0 transform scale-y-0 origin-top overflow-hidden'
                                        : 'max-h-32 opacity-100 transform scale-y-100 overflow-visible z-[10000]'
                                }`}
                            >
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <Combobox
                                        as="div"
                                        className="relative"
                                        value={selectedDriver || ''}
                                        onChange={(selectedDriver: Driver) => {
                                            handleInputChange('driverId', selectedDriver?.id || '');
                                            setSelectedDriverData(selectedDriver);
                                            setDriverSearchQuery('');
                                            setSearchedDrivers([]);

                                            // Only clear load selection when driver changes and expense is paid by driver
                                            if (formData.paidBy === 'DRIVER') {
                                                handleInputChange('loadId', '');
                                                setSelectedLoadData(null);
                                                setLoadSearchQuery('');
                                                setSearchedLoads([]);
                                            }

                                            // Fetch loads filtered by driver using new API
                                            if (selectedDriver?.id) {
                                                fetchLoadsByDriver(selectedDriver.id);
                                            } else {
                                                // If no driver selected, clear loads since new API requires driver or search
                                                setLoads([]);
                                            }
                                        }}
                                        disabled={loadingData}
                                    >
                                        <Combobox.Input
                                            ref={driverSearchInputRef}
                                            autoComplete="off"
                                            name="driverName"
                                            className={`w-full pl-10 pr-10 px-4 py-3 bg-gray-50 text-gray-900 font-semibold placeholder-gray-400 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all ${
                                                loadingData ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'
                                            }`}
                                            onFocus={() => {
                                                // Lazy load drivers when dropdown is accessed
                                                fetchDrivers();
                                            }}
                                            onChange={(e) => {
                                                if (e.target.value.length > 0) {
                                                    setSearchingDrivers(true);
                                                }
                                                setDriverSearchQuery(e.target.value);
                                            }}
                                            displayValue={(driver: Driver) => driver?.name || ''}
                                            placeholder="Search drivers..."
                                        />
                                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-3">
                                            {searchingDrivers || loadingData ? (
                                                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
                                            ) : (
                                                <ChevronUpDownIcon className="w-5 h-5 text-gray-400" />
                                            )}
                                        </Combobox.Button>

                                        {(driverSearchQuery.length > 0 || !selectedDriverData) && (
                                            <Combobox.Options className="absolute z-[10001] w-full py-1 mt-1 overflow-auto bg-white shadow-2xl max-h-60 focus:outline-none border border-gray-200 rounded-lg ring-1 ring-black/10">
                                                {searchingDrivers ? (
                                                    <div className="px-4 py-3 flex items-center">
                                                        <Spinner className="text-gray-700 mr-2" />
                                                        <span className="text-gray-500 text-sm">
                                                            Searching drivers...
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Clear Selection Option */}
                                                        {formData.paidBy === 'COMPANY' && (
                                                            <Combobox.Option
                                                                value={null}
                                                                className={({ active }) =>
                                                                    classNames(
                                                                        'relative select-none py-3 pl-4 pr-9 cursor-pointer transition-colors duration-150',
                                                                        active
                                                                            ? 'bg-blue-50 text-blue-900'
                                                                            : 'text-gray-500 hover:bg-gray-50',
                                                                    )
                                                                }
                                                            >
                                                                {({ active, selected }) => (
                                                                    <>
                                                                        <span
                                                                            className={classNames(
                                                                                'block truncate font-medium',
                                                                                selected && 'font-bold',
                                                                            )}
                                                                        >
                                                                            None
                                                                        </span>
                                                                        {selected && (
                                                                            <span
                                                                                className={classNames(
                                                                                    'absolute inset-y-0 right-0 flex items-center pr-4',
                                                                                    active
                                                                                        ? 'text-blue-600'
                                                                                        : 'text-blue-500',
                                                                                )}
                                                                            >
                                                                                <CheckIcon className="w-5 h-5" />
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </Combobox.Option>
                                                        )}

                                                        {/* Driver Options */}
                                                        {filteredDrivers.length > 0 ? (
                                                            filteredDrivers.map((driver) => (
                                                                <Combobox.Option
                                                                    key={driver.id}
                                                                    value={driver}
                                                                    className={({ active }) =>
                                                                        classNames(
                                                                            'relative select-none py-3 pl-4 pr-9 cursor-pointer transition-colors duration-150',
                                                                            active
                                                                                ? 'bg-blue-50 text-blue-900'
                                                                                : 'text-gray-900 hover:bg-gray-50',
                                                                        )
                                                                    }
                                                                >
                                                                    {({ active, selected }) => (
                                                                        <>
                                                                            <span
                                                                                className={classNames(
                                                                                    'block truncate font-medium',
                                                                                    selected && 'font-bold',
                                                                                )}
                                                                            >
                                                                                {driver.name}
                                                                            </span>
                                                                            {selected && (
                                                                                <span
                                                                                    className={classNames(
                                                                                        'absolute inset-y-0 right-0 flex items-center pr-4',
                                                                                        active
                                                                                            ? 'text-blue-600'
                                                                                            : 'text-blue-500',
                                                                                    )}
                                                                                >
                                                                                    <CheckIcon className="w-5 h-5" />
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </Combobox.Option>
                                                            ))
                                                        ) : driverSearchQuery ? (
                                                            <div className="px-4 py-3 text-gray-500 text-sm">
                                                                No drivers found matching &quot;{driverSearchQuery}
                                                                &quot;
                                                            </div>
                                                        ) : (
                                                            <div className="px-4 py-3 text-gray-500 text-sm">
                                                                Type to search for drivers...
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </Combobox.Options>
                                        )}
                                    </Combobox>
                                </div>
                            </div>

                            {formData.paidBy === 'DRIVER' && !formData.driverId && (
                                <p className="mt-1 text-sm text-red-500">Driver is required when paid by driver</p>
                            )}
                        </div>

                        {/* Equipment with Search */}
                        <div className="relative z-[999]">
                            <label className="block text-sm font-medium text-gray-600 mb-2">Equipment</label>

                            {/* Selected Equipment Display */}
                            {selectedEquipment && (
                                <SelectedItemDisplay
                                    displayText={
                                        selectedEquipment.equipmentNumber ||
                                        `${selectedEquipment.make} ${selectedEquipment.model || ''}`
                                    }
                                    onRemove={() => {
                                        handleInputChange('equipmentId', '');
                                        setSelectedEquipmentData(null);
                                        setEquipmentSearchQuery('');
                                        setSearchedEquipment([]);
                                    }}
                                />
                            )}

                            {/* Equipment Search Field - Only show when no equipment is selected */}
                            <div
                                className={`relative isolate transition-all duration-300 ease-in-out ${
                                    selectedEquipment
                                        ? 'max-h-0 opacity-0 transform scale-y-0 origin-top overflow-hidden'
                                        : 'max-h-32 opacity-100 transform scale-y-100 overflow-visible z-[9999]'
                                }`}
                            >
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <TruckIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <Combobox
                                        as="div"
                                        className="relative"
                                        value={selectedEquipment || ''}
                                        onChange={(selectedEquipment: Equipment) => {
                                            handleInputChange('equipmentId', selectedEquipment?.id || '');
                                            setSelectedEquipmentData(selectedEquipment);
                                            setEquipmentSearchQuery('');
                                            setSearchedEquipment([]);
                                        }}
                                        disabled={loadingData}
                                    >
                                        <Combobox.Input
                                            ref={equipmentSearchInputRef}
                                            autoComplete="off"
                                            name="equipmentName"
                                            className={`w-full pl-10 pr-10 px-4 py-3 bg-gray-50 text-gray-900 font-semibold placeholder-gray-400 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all ${
                                                loadingData ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'
                                            }`}
                                            onFocus={() => {
                                                // Lazy load equipment when dropdown is accessed
                                                fetchEquipment();
                                            }}
                                            onChange={(e) => {
                                                if (e.target.value.length > 0) {
                                                    setSearchingEquipment(true);
                                                }
                                                setEquipmentSearchQuery(e.target.value);
                                            }}
                                            displayValue={(equipment: Equipment) => {
                                                if (!equipment) return '';
                                                return (
                                                    equipment.equipmentNumber ||
                                                    `${equipment.make} ${equipment.model || ''}`
                                                );
                                            }}
                                            placeholder="Search equipment..."
                                        />
                                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-3">
                                            {searchingEquipment || loadingData ? (
                                                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
                                            ) : (
                                                <ChevronUpDownIcon className="w-5 h-5 text-gray-400" />
                                            )}
                                        </Combobox.Button>

                                        {(equipmentSearchQuery.length > 0 || !selectedEquipmentData) && (
                                            <Combobox.Options className="absolute z-[10000] w-full py-1 mt-1 overflow-auto bg-white shadow-2xl max-h-60 focus:outline-none border border-gray-200 rounded-lg ring-1 ring-black/10">
                                                {searchingEquipment ? (
                                                    <div className="px-4 py-3 flex items-center">
                                                        <Spinner className="text-gray-700 mr-2" />
                                                        <span className="text-gray-500 text-sm">
                                                            Searching equipment...
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Clear Selection Option */}
                                                        <Combobox.Option
                                                            value={null}
                                                            className={({ active }) =>
                                                                classNames(
                                                                    'relative select-none py-3 pl-4 pr-9 cursor-pointer transition-colors duration-150',
                                                                    active
                                                                        ? 'bg-gray-50 text-gray-900'
                                                                        : 'text-gray-500 hover:bg-gray-50',
                                                                )
                                                            }
                                                        >
                                                            {({ active, selected }) => (
                                                                <>
                                                                    <span
                                                                        className={classNames(
                                                                            'block truncate font-medium',
                                                                            selected && 'font-bold',
                                                                        )}
                                                                    >
                                                                        No equipment
                                                                    </span>
                                                                    {selected && (
                                                                        <span
                                                                            className={classNames(
                                                                                'absolute inset-y-0 right-0 flex items-center pr-4',
                                                                                active
                                                                                    ? 'text-gray-600'
                                                                                    : 'text-gray-500',
                                                                            )}
                                                                        >
                                                                            <CheckIcon className="w-5 h-5" />
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </Combobox.Option>

                                                        {/* Equipment Options */}
                                                        {filteredEquipment.length > 0 ? (
                                                            filteredEquipment.map((eq) => (
                                                                <Combobox.Option
                                                                    key={eq.id}
                                                                    value={eq}
                                                                    className={({ active }) =>
                                                                        classNames(
                                                                            'relative select-none py-3 pl-4 pr-9 cursor-pointer transition-colors duration-150',
                                                                            active
                                                                                ? 'bg-blue-50 text-blue-900'
                                                                                : 'text-gray-900 hover:bg-gray-50',
                                                                        )
                                                                    }
                                                                >
                                                                    {({ active, selected }) => (
                                                                        <>
                                                                            <span
                                                                                className={classNames(
                                                                                    'block truncate font-medium',
                                                                                    selected && 'font-bold',
                                                                                )}
                                                                            >
                                                                                {eq.equipmentNumber ||
                                                                                    `${eq.make} ${eq.model || ''}`}
                                                                            </span>
                                                                            {selected && (
                                                                                <span
                                                                                    className={classNames(
                                                                                        'absolute inset-y-0 right-0 flex items-center pr-4',
                                                                                        active
                                                                                            ? 'text-blue-600'
                                                                                            : 'text-blue-500',
                                                                                    )}
                                                                                >
                                                                                    <CheckIcon className="w-5 h-5" />
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </Combobox.Option>
                                                            ))
                                                        ) : equipmentSearchQuery ? (
                                                            <div className="px-4 py-3 text-gray-500 text-sm">
                                                                No equipment found matching &quot;{equipmentSearchQuery}
                                                                &quot;
                                                            </div>
                                                        ) : (
                                                            <div className="px-4 py-3 text-gray-500 text-sm">
                                                                Type to search for equipment...
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </Combobox.Options>
                                        )}
                                    </Combobox>
                                </div>
                            </div>
                        </div>

                        {/* Load with Search */}
                        <div className="relative z-[998]">
                            <label className="block text-sm font-medium text-gray-600 mb-2">Load</label>

                            {/* Selected Load Display */}
                            {selectedLoad && (
                                <SelectedItemDisplay
                                    displayText={`${selectedLoad.refNum} - ${
                                        selectedLoad.customer?.name || 'Unknown Customer'
                                    }`}
                                    subtitle={
                                        selectedLoad.shipper && selectedLoad.receiver
                                            ? `${selectedLoad.shipper.city}, ${selectedLoad.shipper.state} → ${selectedLoad.receiver.city}, ${selectedLoad.receiver.state}`
                                            : undefined
                                    }
                                    onRemove={() => {
                                        handleInputChange('loadId', '');
                                        setSelectedLoadData(null);
                                        setLoadSearchQuery('');
                                        setSearchedLoads([]);
                                    }}
                                />
                            )}

                            {/* Load Search Field - Only show when no load is selected */}
                            <div
                                className={`relative isolate transition-all duration-300 ease-in-out ${
                                    selectedLoad
                                        ? 'max-h-0 opacity-0 transform scale-y-0 origin-top overflow-hidden'
                                        : 'max-h-32 opacity-100 transform scale-y-100 overflow-visible z-[9998]'
                                }`}
                            >
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <Combobox
                                        as="div"
                                        className="relative"
                                        value={selectedLoad || ''}
                                        onChange={(selectedLoad: Load) => {
                                            handleInputChange('loadId', selectedLoad?.id || '');
                                            setSelectedLoadData(selectedLoad);
                                            setLoadSearchQuery('');
                                            setSearchedLoads([]);
                                        }}
                                        disabled={loadingData}
                                    >
                                        <Combobox.Input
                                            ref={loadSearchInputRef}
                                            autoComplete="off"
                                            name="loadName"
                                            className={`w-full pl-10 pr-10 px-4 py-3 bg-gray-50 text-gray-900 font-semibold placeholder-gray-400 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all ${
                                                loadingData ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'
                                            }`}
                                            onChange={(e) => {
                                                if (e.target.value.length > 0) {
                                                    setSearchingLoads(true);
                                                }
                                                setLoadSearchQuery(e.target.value);
                                            }}
                                            displayValue={(load: Load) => {
                                                if (!load) return '';
                                                return `${load.refNum} - ${load.customer?.name || 'Unknown Customer'}`;
                                            }}
                                            placeholder="Search by load reference number..."
                                        />
                                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-3">
                                            {searchingLoads || loadingData ? (
                                                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
                                            ) : (
                                                <ChevronUpDownIcon className="w-5 h-5 text-gray-400" />
                                            )}
                                        </Combobox.Button>

                                        {(loadSearchQuery.length > 0 || !selectedLoadData) && (
                                            <Combobox.Options className="absolute z-[9999] w-full py-1 mt-1 overflow-auto bg-white shadow-2xl max-h-60 focus:outline-none border border-gray-200 rounded-lg ring-1 ring-black/10">
                                                {searchingLoads ? (
                                                    <div className="px-4 py-3 flex items-center">
                                                        <Spinner className="text-gray-700 mr-2" />
                                                        <span className="text-gray-500 text-sm">
                                                            Searching loads...
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Clear Selection Option */}
                                                        <Combobox.Option
                                                            value={null}
                                                            className={({ active }) =>
                                                                classNames(
                                                                    'relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-500',
                                                                    active ? 'bg-blue-50 text-blue-900' : '',
                                                                )
                                                            }
                                                        >
                                                            {({ selected, active }) => (
                                                                <>
                                                                    <span
                                                                        className={classNames(
                                                                            'block truncate',
                                                                            selected ? 'font-semibold' : 'font-normal',
                                                                        )}
                                                                    >
                                                                        None
                                                                    </span>
                                                                    {selected && (
                                                                        <span
                                                                            className={classNames(
                                                                                'absolute inset-y-0 right-0 flex items-center pr-4',
                                                                                active
                                                                                    ? 'text-blue-900'
                                                                                    : 'text-blue-600',
                                                                            )}
                                                                        >
                                                                            <CheckIcon
                                                                                className="h-5 w-5"
                                                                                aria-hidden="true"
                                                                            />
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </Combobox.Option>

                                                        {filteredLoads.length > 0 ? (
                                                            filteredLoads.map((load) => (
                                                                <Combobox.Option
                                                                    key={load.id}
                                                                    value={load}
                                                                    className={({ active }) =>
                                                                        classNames(
                                                                            'relative cursor-pointer select-none py-3 pl-3 pr-9',
                                                                            active
                                                                                ? 'bg-blue-50 text-blue-900'
                                                                                : 'text-gray-900',
                                                                        )
                                                                    }
                                                                >
                                                                    {({ selected, active }) => (
                                                                        <>
                                                                            <div className="space-y-1">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="font-semibold text-sm text-blue-600">
                                                                                        {load.refNum}
                                                                                    </span>
                                                                                    <span className="text-xs text-gray-500">
                                                                                        LD# {load.loadNum}
                                                                                    </span>
                                                                                </div>
                                                                                {load.customer && (
                                                                                    <div className="text-xs text-gray-700 font-medium">
                                                                                        {load.customer.name}
                                                                                    </div>
                                                                                )}
                                                                                {load.shipper && load.receiver && (
                                                                                    <div className="text-xs text-gray-600 flex items-center space-x-2">
                                                                                        <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">
                                                                                            P
                                                                                        </span>
                                                                                        <span>
                                                                                            {load.shipper.city},{' '}
                                                                                            {load.shipper.state}
                                                                                        </span>
                                                                                        <span className="text-gray-400">
                                                                                            →
                                                                                        </span>
                                                                                        <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-medium">
                                                                                            D
                                                                                        </span>
                                                                                        <span>
                                                                                            {load.receiver.city},{' '}
                                                                                            {load.receiver.state}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {selected && (
                                                                                <span
                                                                                    className={classNames(
                                                                                        'absolute inset-y-0 right-0 flex items-center pr-4',
                                                                                        active
                                                                                            ? 'text-blue-900'
                                                                                            : 'text-blue-600',
                                                                                    )}
                                                                                >
                                                                                    <CheckIcon
                                                                                        className="h-5 w-5"
                                                                                        aria-hidden="true"
                                                                                    />
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </Combobox.Option>
                                                            ))
                                                        ) : loadSearchQuery.length > 0 ? (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                                <div className="text-gray-400 mb-1">No loads found</div>
                                                                <div className="text-xs">
                                                                    {selectedDriverData
                                                                        ? `No loads with refNum "${loadSearchQuery}" assigned to ${selectedDriverData.name}`
                                                                        : `Select a driver first to search loads by refNum`}
                                                                </div>
                                                            </div>
                                                        ) : selectedDriverData ? (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                                <div className="text-gray-400 mb-1">
                                                                    Start typing to search
                                                                </div>
                                                                <div className="text-xs">
                                                                    Search by refNum for loads assigned to{' '}
                                                                    {selectedDriverData.name}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                                <div className="text-gray-400 mb-1">
                                                                    Select a driver first
                                                                </div>
                                                                <div className="text-xs">
                                                                    Driver must be selected to search loads by refNum
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </Combobox.Options>
                                        )}
                                    </Combobox>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200"></div>

                    {/* Submit Button */}
                    {!hideSubmitButton && (
                        <div className="pt-4 space-y-3">
                            <button
                                type="submit"
                                disabled={loading || !isFormValid()}
                                className="w-full py-3 bg-blue-500 text-white text-base font-medium rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {loading ? 'Saving...' : submitButtonText}
                            </button>
                        </div>
                    )}
                </>
            )}
        </form>
    );
};

export default ExpenseForm;
