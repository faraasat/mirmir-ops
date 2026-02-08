import React, { useState, useEffect } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  dismissNotification,
  dismissAll,
  subscribe,
  type AppNotification,
} from '@/lib/notifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (isOpen) {
      setNotifications(getNotifications());
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = subscribe((notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });
    return unsubscribe;
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(getNotifications());
  };

  const handleDismiss = async (id: string) => {
    await dismissNotification(id);
    setNotifications(getNotifications());
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications(getNotifications());
  };

  const handleDismissAll = async () => {
    await dismissAll();
    setNotifications(getNotifications());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Notifications
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Mark all read
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <BellIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No notifications yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => handleMarkAsRead(notification.id)}
                onDismiss={() => handleDismiss(notification.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleDismissAll}
            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

// Notification item
const NotificationItem: React.FC<{
  notification: AppNotification;
  onMarkRead: () => void;
  onDismiss: () => void;
}> = ({ notification, onMarkRead, onDismiss }) => {
  const typeColors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div
      className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
        !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
      onClick={() => !notification.read && onMarkRead()}
    >
      <div className="flex gap-3">
        {/* Type indicator */}
        <div
          className={`w-2 h-2 rounded-full mt-2 ${typeColors[notification.type]}`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm font-medium ${
                notification.read
                  ? 'text-gray-600 dark:text-gray-400'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {notification.title}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatTime(notification.timestamp)}
            </span>
            {notification.action && (
              <button className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400">
                {notification.action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Notification bell button with badge
export const NotificationBell: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(getUnreadCount());

    const unsubscribe = subscribe(() => {
      setUnreadCount(getUnreadCount());
    });

    return unsubscribe;
  }, []);

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    >
      <BellIcon className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

// Toast notification component
export const Toast: React.FC<{
  notification: AppNotification;
  onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
  useEffect(() => {
    if (notification.autoHide) {
      const timer = setTimeout(onDismiss, notification.autoHide);
      return () => clearTimeout(timer);
    }
  }, [notification.autoHide, onDismiss]);

  const typeStyles = {
    info: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
  };

  const typeIcons = {
    info: InfoIcon,
    success: CheckIcon,
    warning: WarningIcon,
    error: ErrorIcon,
  };

  const Icon = typeIcons[notification.type];

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg shadow-lg text-white ${
        typeStyles[notification.type]
      } animate-slide-in`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{notification.title}</p>
        <p className="text-sm opacity-90 mt-0.5">{notification.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 hover:bg-white/20 rounded"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

// Toast container
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe((notification) => {
      // Only show toasts for in-app notifications
      setToasts((prev) => [...prev, notification]);
    });

    return unsubscribe;
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    dismissNotification(id);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.slice(0, 5).map((toast) => (
        <Toast
          key={toast.id}
          notification={toast}
          onDismiss={() => handleDismiss(toast.id)}
        />
      ))}
    </div>
  );
};

// Icons
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WarningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default NotificationCenter;
