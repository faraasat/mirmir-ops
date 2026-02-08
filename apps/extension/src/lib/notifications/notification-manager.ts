// Notification Manager - Centralized notification handling

import browser from 'webextension-polyfill';

/**
 * Notification type
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Notification priority
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * In-app notification
 */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  timestamp: number;
  read: boolean;
  dismissed: boolean;
  action?: {
    label: string;
    callback: string; // Action identifier
    data?: unknown;
  };
  autoHide?: number; // Auto-dismiss after ms
  persistent?: boolean; // Survive restarts
  groupId?: string; // For grouping similar notifications
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean; // Browser notifications
  inApp: boolean;
  priorities: {
    low: boolean;
    normal: boolean;
    high: boolean;
    urgent: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
  };
  maxStored: number;
}

// Storage keys
const NOTIFICATIONS_KEY = 'app_notifications';
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

// Default settings
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  sound: true,
  desktop: true,
  inApp: true,
  priorities: {
    low: false,
    normal: true,
    high: true,
    urgent: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  maxStored: 100,
};

// In-memory notification queue for UI
let notificationQueue: AppNotification[] = [];
let listeners: Set<(notification: AppNotification) => void> = new Set();

/**
 * Initialize notification manager
 */
export async function initializeNotificationManager(): Promise<void> {
  await loadNotifications();
  console.log('[NotificationManager] Initialized');
}

/**
 * Load stored notifications
 */
async function loadNotifications(): Promise<void> {
  const result = await browser.storage.local.get(NOTIFICATIONS_KEY);
  notificationQueue = (result[NOTIFICATIONS_KEY] || []).filter(
    (n: AppNotification) => n.persistent && !n.dismissed
  );
}

/**
 * Save notifications to storage
 */
async function saveNotifications(): Promise<void> {
  const settings = await getNotificationSettings();
  const toSave = notificationQueue
    .filter(n => n.persistent && !n.dismissed)
    .slice(0, settings.maxStored);
  
  await browser.storage.local.set({ [NOTIFICATIONS_KEY]: toSave });
}

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const result = await browser.storage.local.get(NOTIFICATION_SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...result[NOTIFICATION_SETTINGS_KEY] };
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(
  updates: Partial<NotificationSettings>
): Promise<void> {
  const current = await getNotificationSettings();
  const updated = { ...current, ...updates };
  await browser.storage.local.set({ [NOTIFICATION_SETTINGS_KEY]: updated });
}

/**
 * Check if notifications are enabled for priority
 */
async function shouldNotify(priority: NotificationPriority): Promise<boolean> {
  const settings = await getNotificationSettings();
  
  if (!settings.enabled) return false;
  if (!settings.priorities[priority]) return false;
  
  // Check quiet hours
  if (settings.quietHours.enabled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = settings.quietHours;
    
    // Handle overnight quiet hours
    if (start > end) {
      if (currentTime >= start || currentTime <= end) {
        return priority === 'urgent'; // Only urgent during quiet hours
      }
    } else {
      if (currentTime >= start && currentTime <= end) {
        return priority === 'urgent';
      }
    }
  }
  
  return true;
}

/**
 * Create and show a notification
 */
export async function notify(
  title: string,
  message: string,
  options: {
    type?: NotificationType;
    priority?: NotificationPriority;
    action?: AppNotification['action'];
    autoHide?: number;
    persistent?: boolean;
    groupId?: string;
  } = {}
): Promise<AppNotification | null> {
  const {
    type = 'info',
    priority = 'normal',
    action,
    autoHide = priority === 'low' ? 5000 : priority === 'normal' ? 8000 : undefined,
    persistent = false,
    groupId,
  } = options;
  
  // Check if should notify
  if (!await shouldNotify(priority)) {
    return null;
  }
  
  const notification: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    message,
    priority,
    timestamp: Date.now(),
    read: false,
    dismissed: false,
    action,
    autoHide,
    persistent,
    groupId,
  };
  
  // Add to queue
  notificationQueue.unshift(notification);
  
  // Limit queue size
  const settings = await getNotificationSettings();
  if (notificationQueue.length > settings.maxStored) {
    notificationQueue = notificationQueue.slice(0, settings.maxStored);
  }
  
  // Save if persistent
  if (persistent) {
    await saveNotifications();
  }
  
  // Show desktop notification if enabled
  if (settings.desktop && (priority === 'high' || priority === 'urgent')) {
    await showDesktopNotification(notification);
  }
  
  // Play sound if enabled
  if (settings.sound && priority !== 'low') {
    playNotificationSound(type);
  }
  
  // Notify listeners
  for (const listener of listeners) {
    listener(notification);
  }
  
  return notification;
}

/**
 * Show desktop notification
 */
async function showDesktopNotification(notification: AppNotification): Promise<void> {
  try {
    const iconPath = notification.type === 'error' 
      ? 'icons/icon-error.png'
      : notification.type === 'warning'
      ? 'icons/icon-warning.png'
      : notification.type === 'success'
      ? 'icons/icon-success.png'
      : 'icons/icon-128.png';
    
    await browser.notifications.create(notification.id, {
      type: 'basic',
      iconUrl: iconPath,
      title: notification.title,
      message: notification.message,
      priority: notification.priority === 'urgent' ? 2 : notification.priority === 'high' ? 1 : 0,
    });
  } catch (error) {
    console.error('[NotificationManager] Failed to show desktop notification:', error);
  }
}

/**
 * Play notification sound
 */
function playNotificationSound(type: NotificationType): void {
  // In a real implementation, this would play different sounds
  // For now, we'll just log it since audio in extensions requires more setup
  console.log(`[NotificationManager] Sound: ${type}`);
}

/**
 * Get all notifications
 */
export function getNotifications(): AppNotification[] {
  return notificationQueue.filter(n => !n.dismissed);
}

/**
 * Get unread count
 */
export function getUnreadCount(): number {
  return notificationQueue.filter(n => !n.read && !n.dismissed).length;
}

/**
 * Mark notification as read
 */
export async function markAsRead(id: string): Promise<void> {
  const notification = notificationQueue.find(n => n.id === id);
  if (notification) {
    notification.read = true;
    if (notification.persistent) {
      await saveNotifications();
    }
  }
}

/**
 * Mark all as read
 */
export async function markAllAsRead(): Promise<void> {
  for (const notification of notificationQueue) {
    notification.read = true;
  }
  await saveNotifications();
}

/**
 * Dismiss notification
 */
export async function dismissNotification(id: string): Promise<void> {
  const notification = notificationQueue.find(n => n.id === id);
  if (notification) {
    notification.dismissed = true;
    
    // Remove desktop notification if exists
    try {
      await browser.notifications.clear(id);
    } catch {
      // Ignore if not found
    }
    
    if (notification.persistent) {
      await saveNotifications();
    }
  }
}

/**
 * Dismiss all notifications
 */
export async function dismissAll(): Promise<void> {
  for (const notification of notificationQueue) {
    notification.dismissed = true;
    try {
      await browser.notifications.clear(notification.id);
    } catch {
      // Ignore
    }
  }
  await saveNotifications();
}

/**
 * Clear old notifications
 */
export async function clearOldNotifications(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  const cutoff = Date.now() - maxAge;
  const before = notificationQueue.length;
  
  notificationQueue = notificationQueue.filter(n => 
    n.timestamp > cutoff || (n.persistent && !n.dismissed)
  );
  
  await saveNotifications();
  return before - notificationQueue.length;
}

/**
 * Subscribe to new notifications
 */
export function subscribe(callback: (notification: AppNotification) => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Handle notification click from desktop notification
 */
export function setupDesktopNotificationListeners(): void {
  browser.notifications.onClicked.addListener((notificationId) => {
    const notification = notificationQueue.find(n => n.id === notificationId);
    if (notification?.action) {
      // Dispatch action - in a real implementation, this would trigger the action
      console.log('[NotificationManager] Action clicked:', notification.action.callback);
      browser.runtime.sendMessage({
        type: notification.action.callback,
        payload: notification.action.data,
        timestamp: Date.now(),
      });
    }
    
    // Mark as read
    markAsRead(notificationId);
  });
  
  browser.notifications.onClosed.addListener((notificationId) => {
    dismissNotification(notificationId);
  });
}

// Convenience notification functions
export async function notifyInfo(title: string, message: string, options?: Parameters<typeof notify>[2]) {
  return notify(title, message, { ...options, type: 'info' });
}

export async function notifySuccess(title: string, message: string, options?: Parameters<typeof notify>[2]) {
  return notify(title, message, { ...options, type: 'success' });
}

export async function notifyWarning(title: string, message: string, options?: Parameters<typeof notify>[2]) {
  return notify(title, message, { ...options, type: 'warning', priority: options?.priority || 'high' });
}

export async function notifyError(title: string, message: string, options?: Parameters<typeof notify>[2]) {
  return notify(title, message, { ...options, type: 'error', priority: options?.priority || 'high' });
}
