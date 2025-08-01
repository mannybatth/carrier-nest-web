import React, { useEffect } from 'react';
import { useGlobalNotifications } from '../contexts/GlobalNotificationContext';
import ToastContainer from './ToastContainer';

const NotificationToastManager: React.FC = () => {
    const { toastNotifications, dismissToast, markToastAsRead } = useGlobalNotifications();

    return (
        <ToastContainer
            notifications={toastNotifications}
            onDismiss={dismissToast}
            onMarkAsRead={markToastAsRead}
            position="top-right"
        />
    );
};

export default NotificationToastManager;
