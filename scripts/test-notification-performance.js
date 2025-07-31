#!/usr/bin/env node

/**
 * Performance test script for notification API
 * Run this to measure API response times and identify bottlenecks
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const API_ENDPOINT = '/api/notifications';

// Test configuration
const TESTS = [
    { name: 'Small Load (10 notifications)', limit: 10 },
    { name: 'Medium Load (50 notifications)', limit: 50 },
    { name: 'Large Load (100 notifications)', limit: 100 },
];

async function measurePerformance(testName, url) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        const req = protocol.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const endTime = Date.now();
                const duration = endTime - startTime;

                try {
                    const response = JSON.parse(data);
                    resolve({
                        testName,
                        duration,
                        statusCode: res.statusCode,
                        notificationCount: response.data?.notifications?.length || 0,
                        totalCount: response.data?.total || 0,
                        unreadCount: response.data?.unreadCount || 0,
                    });
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function runPerformanceTests() {
    console.log('🚀 Starting Notification API Performance Tests\n');
    console.log(`Testing endpoint: ${BASE_URL}${API_ENDPOINT}\n`);

    // Note: This script requires authentication to work properly
    console.log('⚠️  Note: This script requires valid authentication cookies to work.');
    console.log('   Run this after logging into the application in your browser.\n');

    const results = [];

    for (const test of TESTS) {
        console.log(`📊 Running test: ${test.name}`);

        try {
            const url = `${BASE_URL}${API_ENDPOINT}?limit=${test.limit}&offset=0`;
            const result = await measurePerformance(test.name, url);

            results.push(result);

            console.log(`   ✅ Duration: ${result.duration}ms`);
            console.log(`   📝 Notifications: ${result.notificationCount}/${result.totalCount}`);
            console.log(`   🔔 Unread: ${result.unreadCount}`);
            console.log();
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            console.log();
        }

        // Wait between tests to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Print summary
    console.log('📈 Performance Summary:');
    console.log('=' * 50);

    results.forEach((result) => {
        const performanceRating =
            result.duration < 500
                ? '🟢 Excellent'
                : result.duration < 1000
                ? '🟡 Good'
                : result.duration < 2000
                ? '🟠 Fair'
                : '🔴 Poor';

        console.log(`${result.testName}: ${result.duration}ms ${performanceRating}`);
    });

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    console.log(`\nAverage response time: ${avgDuration.toFixed(2)}ms`);

    if (avgDuration < 500) {
        console.log('🎉 Overall performance: Excellent!');
    } else if (avgDuration < 1000) {
        console.log('👍 Overall performance: Good');
    } else if (avgDuration < 2000) {
        console.log('⚠️  Overall performance: Needs improvement');
    } else {
        console.log('🚨 Overall performance: Poor - requires optimization');
    }
}

// Instructions for manual testing
console.log('📋 Manual Testing Instructions:');
console.log('1. Open browser dev tools (F12)');
console.log('2. Navigate to your notifications page');
console.log('3. Look at the Network tab for API call timing');
console.log('4. Look at the Console tab for performance logs');
console.log('5. Check for logs starting with "[API Performance]" and "[Performance]"');
console.log('\nPress Ctrl+C to exit, or wait for automated tests...\n');

// Wait for 5 seconds before starting automated tests
setTimeout(() => {
    runPerformanceTests().catch(console.error);
}, 5000);
