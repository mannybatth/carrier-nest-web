'use client';
import {
    ArrowDownIcon,
    ArrowUpIcon,
    ChartBarIcon,
    CurrencyDollarIcon,
    MapIcon,
    TruckIcon,
    UserIcon,
} from '@heroicons/react/24/outline';
import { ExpandedLoad } from 'interfaces/models';
import { formatCurrency } from 'lib/helpers/calculateDriverPay';
import React, { useState } from 'react';

import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

interface CustomerStat {
    id: string;
    name: string;
    totalLoads: number;
    totalRevenue: number;
}

interface Stats {
    totalLoads: number;
    totalRevenue: number;
    avgRate: number;
    totalDistance: number;
    avgDistance: number;
    customerStats: CustomerStat[];
    highestPerMile: number;
    lowestPerMile: number;
}

function calculateStats(loads: ExpandedLoad[] = []): Stats {
    // Handle empty array or undefined
    if (!loads || loads.length === 0) {
        return {
            totalLoads: 0,
            totalRevenue: 0,
            avgRate: 0,
            totalDistance: 0,
            avgDistance: 0,
            customerStats: [],
            highestPerMile: 0,
            lowestPerMile: 0,
        };
    }

    const totalLoads = loads.length;
    const totalRevenue = loads.reduce((sum, load) => sum + (Number(load.rate) || 0), 0);
    const avgRate = totalLoads > 0 ? Math.round(totalRevenue / totalLoads) : 0;

    const totalDistance = loads.reduce((sum, load) => sum + (Number(load.routeDistanceMiles) || 0), 0);
    const avgDistance = totalLoads > 0 ? Math.round(totalDistance / totalLoads) : 0;

    // Calculate rates per mile safely
    const ratesPerMile = loads.map((load) => {
        const rate = Number(load.rate) || 0;
        const distance = Number(load.routeDistanceMiles) || 0;
        return distance > 0 ? rate / distance : 0;
    });

    // Handle edge cases for highest/lowest calculations
    const highestPerMile = ratesPerMile.length > 0 ? Math.max(...ratesPerMile) : 0;
    const lowestPerMile =
        ratesPerMile.length > 0 && Math.min(...ratesPerMile) !== 0
            ? Math.min(...ratesPerMile.filter((rate) => rate > 0))
            : 0;

    // Calculate customer stats
    const customerMap = new Map<string, CustomerStat>();

    loads.forEach((load) => {
        // Safely access customer properties
        if (!load.customerId || !load.customer?.name) return;

        const customerId = load.customerId;
        const customerName = load.customer?.name || 'No Customer Assigned';

        if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
                id: customerId,
                name: customerName,
                totalLoads: 0,
                totalRevenue: 0,
            });
        }

        const customerStat = customerMap.get(customerId)!;
        customerStat.totalLoads += 1;
        customerStat.totalRevenue += Number(load.rate) || 0;
    });

    const customerStats = Array.from(customerMap.values());

    return {
        totalLoads,
        totalRevenue,
        avgRate,
        totalDistance,
        avgDistance,
        customerStats,
        highestPerMile,
        lowestPerMile,
    };
}

interface DashboardStatsProps {
    data?: ExpandedLoad[];
    loading?: boolean;
}

export default function DashboardStatsDigest({ data: loadsList = [], loading = false }: DashboardStatsProps) {
    // Ensure loadsList is always an array
    const safeLoadsList = Array.isArray(loadsList) ? loadsList : [];
    const stats = calculateStats(safeLoadsList);

    const [activeCustomer, setActiveCustomer] = useState<string | null>(null);

    // Prepare data for customer revenue pie chart - safely
    const customerRevenueData = stats.customerStats.map((customer) => ({
        name: customer.name || 'Unknown',
        value: customer.totalRevenue,
    }));

    const COLORS = ['#FF9F0A', '#30D158', '#0A84FF', '#5E5CE6', '#FF375F'];

    // Safely map data for charts
    const distanceData = safeLoadsList.map((load) => ({
        id: load.refNum || 'Unknown',
        distance: Math.round(Number(load.routeDistanceMiles) || 0),
        rate: Number(load.rate) || 0,
    }));

    const ratePerMileData = safeLoadsList.map((load) => {
        const distance = Number(load.routeDistanceMiles) || 1; // Prevent division by zero
        const rate = Number(load.rate) || 0;
        return {
            id: load.refNum || 'Unknown',
            ratePerMile: Math.round((rate / distance) * 100) / 100,
        };
    });

    const handleLegendClick = (customerName: string) => {
        if (activeCustomer === customerName) {
            setActiveCustomer(null); // unselect if clicking again
        } else {
            setActiveCustomer(customerName);
        }
    };

    // Show loading skeleton if loading prop is true
    if (loading) {
        return loadingSkeleton();
    }

    // Show empty div if no data after safety checks
    if (safeLoadsList.length === 0) {
        return <div className="bg-white rounded-lg p-4 text-center text-gray-500">No load data available.</div>;
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-white rounded-lg mb-8 overflow-clip">
            <main className="flex-1 py-6">
                <div className="mx-auto space-y-6">
                    <div className="flex flex-col justify-between gap-0 sm:items-start">
                        <h2 className="text-3xl font-bold tracking-tight text-[#1D1D1F]">Analytics Overview</h2>
                        <p className="text-sm text-[#86868B]">
                            Insights into today&apos;s loads and leading performers
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="overflow-hidden rounded-xl border-2 border-green-600 bg-white shadow-md">
                            <div className="bg-[#F5F5F7] p-4 pb-2">
                                <div className="flex items-center text-sm text-[#86868B]">
                                    <CurrencyDollarIcon className="mr-1 h-4 w-4" />
                                    Average Milage Rate
                                </div>
                                <h3 className="text-2xl font-semibold text-[#169318]">
                                    {formatCurrency(
                                        stats.totalDistance > 0 ? stats.totalRevenue / stats.totalDistance : 0,
                                    )}
                                </h3>
                            </div>
                            <div className="p-4 pt-4">
                                <div className="text-xs text-[#86868B]">
                                    <div className="flex items-center gap-1 text-[#169318] font-semibold">
                                        <ArrowUpIcon className="h-3 w-3" />
                                        <span>
                                            High {formatCurrency(stats.highestPerMile)} / Low{' '}
                                            {formatCurrency(stats.lowestPerMile)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Stat Card 1 - Total Loads */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="bg-[#F5F5F7] p-4 pb-2">
                                <div className="flex items-center text-sm text-[#86868B]">
                                    <TruckIcon className="mr-1 h-4 w-4" />
                                    Total Loads
                                </div>
                                <h3 className="text-2xl font-semibold text-[#1D1D1F]">{stats.totalLoads}</h3>
                            </div>
                            <div className="p-4 pt-4">
                                <div className="text-xs text-[#86868B]">
                                    {stats.totalLoads > 0 ? (
                                        <div className="flex items-center gap-1 text-[#169318]">
                                            <ArrowUpIcon className="h-3 w-3" />
                                            <span>{stats.totalLoads} active loads</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-[#FF3B30]">
                                            <ArrowDownIcon className="h-3 w-3" />
                                            <span>No active loads</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stat Card 2 - Total Revenue */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="bg-[#F5F5F7] p-4 pb-2">
                                <div className="flex items-center text-sm text-[#86868B]">
                                    <CurrencyDollarIcon className="mr-1 h-4 w-4" />
                                    Total Revenue
                                </div>
                                <h3 className="text-2xl font-semibold text-[#1D1D1F]">
                                    ${stats.totalRevenue.toLocaleString()}
                                </h3>
                            </div>
                            <div className="p-4 pt-4">
                                <div className="text-xs text-[#86868B]">
                                    <div className="flex items-center gap-1 text-[#169318]">
                                        <ArrowUpIcon className="h-3 w-3" />
                                        <span>Avg ${stats.avgRate.toLocaleString()} per load</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stat Card 3 - Total Distance */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="bg-[#F5F5F7] p-4 pb-2">
                                <div className="flex items-center text-sm text-[#86868B]">
                                    <MapIcon className="mr-1 h-4 w-4" />
                                    Total Distance
                                </div>
                                <h3 className="text-2xl font-semibold text-[#1D1D1F]">
                                    {Math.round(stats.totalDistance).toLocaleString()} mi
                                </h3>
                            </div>
                            <div className="p-4 pt-4">
                                <div className="text-xs text-[#86868B]">
                                    <div className="flex items-center gap-1 text-[#169318]">
                                        <ArrowUpIcon className="h-3 w-3" />
                                        <span>Avg {Math.round(stats.avgDistance).toLocaleString()} miles per load</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stat Card 4 - Customers */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="bg-[#F5F5F7] p-4 pb-2">
                                <div className="flex items-center text-sm text-[#86868B]">
                                    <UserIcon className="mr-1 h-4 w-4" />
                                    Customers
                                </div>
                                <h3 className="text-2xl font-semibold text-[#1D1D1F]">{stats.customerStats.length}</h3>
                            </div>
                            <div className="p-4 pt-4">
                                <div className="text-xs text-[#86868B]">
                                    <div className="flex items-center gap-1 text-[#169318]">
                                        <ArrowUpIcon className="h-3 w-3" />
                                        <span>
                                            Avg $
                                            {stats.customerStats.length > 0
                                                ? Math.round(
                                                      stats.totalRevenue / stats.customerStats.length,
                                                  ).toLocaleString()
                                                : 0}{' '}
                                            per customer
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-6">
                        {/* Rate per Mile Chart */}
                        <div className="col-span-1 overflow-hidden rounded-xl bg-white border border-gray-200">
                            {/* Card Header */}
                            <div className="flex flex-row items-center justify-between bg-[#F5F5F7] p-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-[#1D1D1F]">Rate per Mile</h3>
                                    <p className="text-sm text-[#86868B]">Efficiency of each load</p>
                                </div>
                                <ChartBarIcon className="h-4 w-4 text-[#86868B]" />
                            </div>

                            {/* Chart */}
                            <div className="p-6">
                                <div className="h-[300px]">
                                    {ratePerMileData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart
                                                data={ratePerMileData}
                                                margin={{
                                                    top: 20,
                                                    right: 20,
                                                    left: 10,
                                                    bottom: 20,
                                                }}
                                            >
                                                {/* Grid */}
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="#E5E5EA"
                                                    vertical={false}
                                                />

                                                {/* Axes */}
                                                <XAxis
                                                    dataKey="id"
                                                    stroke="#86868B"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    stroke="#86868B"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />

                                                {/* Tooltip */}
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#FFFFFF',
                                                        border: '1px solid #E5E5EA',
                                                        borderRadius: '10px',
                                                        padding: '10px',
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                                                    }}
                                                    formatter={(value: number) => [
                                                        `$${value.toFixed(2)}`,
                                                        'Rate per Mile',
                                                    ]}
                                                    wrapperStyle={{ outline: 'none' }}
                                                />

                                                {/* Line */}
                                                <Line
                                                    type="monotone"
                                                    dataKey="ratePerMile"
                                                    name="Rate per Mile ($)"
                                                    stroke="#FF9F0A"
                                                    strokeWidth={2}
                                                    dot={{ r: 3 }}
                                                    activeDot={{ r: 6 }}
                                                    isAnimationActive={true}
                                                    animationDuration={1000}
                                                />

                                                {/* Legend */}
                                                <Legend
                                                    verticalAlign="bottom"
                                                    height={36}
                                                    iconType="circle"
                                                    wrapperStyle={{
                                                        fontSize: '12px',
                                                        color: '#999',
                                                    }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <p className="text-gray-500">No data available for rate per mile chart</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
                        {/* Distance vs Rate Chart */}
                        <div
                            className={`col-span-4 overflow-hidden rounded-xl border border-gray-200 bg-white ${
                                safeLoadsList.length >= 8 ? 'lg:col-span-4' : 'lg:col-span-2'
                            }`}
                        >
                            {/* Card Header */}
                            <div className="flex flex-row items-center justify-between bg-[#F5F5F7] p-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-[#1D1D1F]">Distance vs Rate</h3>
                                    <p className="text-sm text-[#86868B]">Correlation between distance and rate</p>
                                </div>
                                <ChartBarIcon className="h-4 w-4 text-[#86868B]" />
                            </div>

                            {/* Chart */}
                            <div className="p-6">
                                <div className="h-[300px]">
                                    {distanceData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={distanceData}
                                                margin={{
                                                    top: 20,
                                                    right: 20,
                                                    left: 10,
                                                    bottom: 20,
                                                }}
                                                barGap={8} // consistent gap between bars
                                            >
                                                {/* Grid */}
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="#E5E5EA"
                                                    vertical={false}
                                                />

                                                {/* Axes */}
                                                <XAxis
                                                    dataKey="id"
                                                    stroke="#86868B"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    stroke="#86868B"
                                                    tick={{ fontSize: 12 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />

                                                {/* Tooltip */}
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#FFFFFF',
                                                        border: '1px solid #E5E5EA',
                                                        borderRadius: '10px',
                                                        padding: '10px',
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                                                    }}
                                                    formatter={(value: number, name: string) => {
                                                        if (name === 'Distance (miles)')
                                                            return [`${value.toLocaleString()} mi`, 'Distance'];
                                                        if (name === 'Rate ($)') {
                                                            const n = Number(value);
                                                            // if it still isn't a number, fall back to raw
                                                            return isNaN(n)
                                                                ? [value, name]
                                                                : [`$${n.toFixed(2)}`, 'Rate'];
                                                        }
                                                        return [value, name];
                                                    }}
                                                    wrapperStyle={{ outline: 'none' }}
                                                />

                                                {/* Bars */}
                                                <Bar
                                                    dataKey="distance"
                                                    name="Distance (miles)"
                                                    fill="#0A84FF"
                                                    radius={[4, 4, 0, 0]}
                                                />
                                                <Bar
                                                    dataKey="rate"
                                                    name="Rate ($)"
                                                    fill="#30D158"
                                                    radius={[4, 4, 0, 0]}
                                                />

                                                {/* Legend */}
                                                <Legend
                                                    verticalAlign="bottom"
                                                    height={36}
                                                    iconType="circle"
                                                    wrapperStyle={{
                                                        fontSize: '12px',
                                                        color: '#666',
                                                    }}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <p className="text-gray-500">
                                                No data available for distance vs rate chart
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Revenue by Customer Pie Chart */}
                        <div
                            className={`overflow-hidden rounded-xl bg-white border border-gray-200 col-span-4 ${
                                safeLoadsList.length >= 8 ? 'lg:col-span-4 ' : 'lg:col-span-2'
                            }`}
                        >
                            <div className="flex flex-row items-center justify-between bg-[#F5F5F7] p-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-[#1D1D1F]">Revenue by Customer</h3>
                                    <p className="text-sm text-[#86868B]">Distribution of revenue by customer</p>
                                </div>
                                <UserIcon className="h-4 w-4 text-[#86868B]" />
                            </div>
                            <div className="p-6 relative">
                                <div className="flex h-[300px]">
                                    {/* Pie Chart */}
                                    <div className="flex-1">
                                        {customerRevenueData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={customerRevenueData}
                                                        cx="50%"
                                                        cy="50%"
                                                        labelLine={false}
                                                        outerRadius={125}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                    >
                                                        {customerRevenueData.map((entry, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={COLORS[index % COLORS.length]}
                                                                fillOpacity={
                                                                    !activeCustomer || activeCustomer === entry.name
                                                                        ? 0.95
                                                                        : 0.1
                                                                }
                                                            />
                                                        ))}
                                                    </Pie>

                                                    {/* Tooltip */}
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload;
                                                                return (
                                                                    <div className="rounded-xl bg-white p-3 shadow-lg border border-gray-200">
                                                                        <p className="text-sm font-semibold text-gray-900">
                                                                            {data.name.toUpperCase()}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">
                                                                            ${data.value.toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                        wrapperStyle={{ outline: 'none' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <p className="text-gray-500">No customer revenue data available</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Scrollable Legend */}
                                    {customerRevenueData.length > 0 && (
                                        <div className="absolute left-0 bottom-0 px-4 overflow-y-auto w-full pr-2 bg-slate-50/50">
                                            <ul className="flex flex-row space-x-4 p-1">
                                                {customerRevenueData.map((entry, index) => (
                                                    <li
                                                        key={index}
                                                        className={`flex items-center cursor-pointer p-1 px-2 ${
                                                            activeCustomer === entry.name
                                                                ? 'font-semibold rounded-full bg-slate-200 text-black'
                                                                : 'bg-transparent text-gray-200'
                                                        }`}
                                                        onClick={() => handleLegendClick(entry.name)}
                                                    >
                                                        <div
                                                            className="h-3 w-3 rounded-full mr-3 shrink-0"
                                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                        />
                                                        <span className="text-sm text-gray-800 truncate">
                                                            {entry.name.toUpperCase()}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

const loadingSkeleton = () => {
    return (
        <div className="flex min-h-screen w-full flex-col bg-white rounded-lg mb-8 overflow-clip animate-pulse">
            <main className="flex-1 py-6">
                <div className="mx-auto space-y-6">
                    {/* Page Header Skeleton */}
                    <div className="flex flex-col justify-between gap-2 sm:items-start">
                        <div className="h-6 w-48 bg-gray-200 rounded-md" />
                        <div className="h-4 w-64 bg-gray-100 rounded-md mt-2" />
                    </div>

                    {/* Stat Cards Skeleton */}
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div
                                key={index}
                                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md p-4 space-y-4"
                            >
                                <div className="h-4 w-32 bg-gray-200 rounded" />
                                <div className="h-8 w-24 bg-gray-300 rounded" />
                                <div className="h-4 w-20 bg-gray-100 rounded mt-4" />
                            </div>
                        ))}
                    </div>

                    {/* Rate per Mile Chart Skeleton */}
                    <div className="grid gap-6">
                        <div className="col-span-1 overflow-hidden rounded-xl bg-white border border-gray-200 p-4 space-y-6">
                            <div className="h-4 w-40 bg-gray-200 rounded" />
                            <div className="h-4 w-56 bg-gray-100 rounded" />
                            <div className="h-[250px] bg-gray-100 rounded-lg mt-6" />
                        </div>
                    </div>

                    {/* Distance vs Rate and Revenue by Customer Skeleton */}
                    <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
                        <div
                            className={`col-span-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 space-y-6 ${
                                8 >= 8 ? 'lg:col-span-4' : 'lg:col-span-2'
                            }`}
                        >
                            <div className="h-4 w-40 bg-gray-200 rounded" />
                            <div className="h-4 w-56 bg-gray-100 rounded" />
                            <div className="h-[300px] bg-gray-100 rounded-lg mt-6" />
                        </div>

                        <div
                            className={`overflow-hidden rounded-xl border border-gray-200 bg-white col-span-4 p-4 space-y-6 ${
                                8 >= 8 ? 'lg:col-span-4' : 'lg:col-span-2'
                            }`}
                        >
                            <div className="h-4 w-48 bg-gray-200 rounded" />
                            <div className="h-4 w-64 bg-gray-100 rounded" />
                            <div className="flex flex-row space-x-6 mt-6">
                                <div className="flex-1 h-[250px] bg-gray-100 rounded-lg" />
                                <div className="flex flex-col space-y-2 w-48">
                                    {Array.from({ length: 6 }).map((_, index) => (
                                        <div key={index} className="h-4 w-full bg-gray-200 rounded" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
