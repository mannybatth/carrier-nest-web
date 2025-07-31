import { useGlobalNotifications } from '../contexts/GlobalNotificationContext';

/**
 * Utility hook that can switch between global and local notification systems
 * Set USE_GLOBAL_NOTIFICATIONS to true to use the new global system
 */
const USE_GLOBAL_NOTIFICATIONS = true; // Switched to global notifications

export const useNotificationManager = () => {
    const globalNotifications = useGlobalNotifications();

    // Return the global notification system
    return {
        ...globalNotifications,
        // Add migration helpers
        migrationInfo: {
            isGlobal: true,
            isMainTab: globalNotifications.isMainTab,
        },
    };
};

export default useNotificationManager;
