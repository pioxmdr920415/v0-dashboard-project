import { showToast } from '../utils/api';

class PushNotificationManager {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.permission = null;
    this.vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    
    this.init();
  }

  async init() {
    if (!this.isSupported) {
      console.warn('[PushNotificationManager] Push notifications not supported');
      return;
    }

    this.permission = await this.getPermission();
    console.log('[PushNotificationManager] Initialized with permission:', this.permission);
  }

  async getPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return 'denied';
  }

  async registerServiceWorker() {
    if (!this.isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[PushNotificationManager] Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('[PushNotificationManager] Service Worker registration failed:', error);
      throw error;
    }
  }

  async getSubscription() {
    if (!this.isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription;
    } catch (error) {
      console.error('[PushNotificationManager] Failed to get subscription:', error);
      return null;
    }
  }

  async subscribeToPushNotifications() {
    if (!this.isSupported) {
      showToast('Push notifications not supported in this browser', 'error');
      return null;
    }

    if (this.permission !== 'granted') {
      showToast('Please enable notifications to receive updates', 'warning');
      return null;
    }

    try {
      const registration = await this.registerServiceWorker();
      if (!registration) return null;

      // Check if already subscribed
      let subscription = await this.getSubscription();
      if (subscription) {
        console.log('[PushNotificationManager] Already subscribed:', subscription.endpoint);
        return subscription;
      }

      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidKey)
      });

      console.log('[PushNotificationManager] Subscribed:', subscription);

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);

      showToast('Successfully subscribed to notifications', 'success');
      return subscription;
    } catch (error) {
      console.error('[PushNotificationManager] Subscription failed:', error);
      showToast('Failed to subscribe to notifications', 'error');
      throw error;
    }
  }

  async unsubscribeFromPushNotifications() {
    if (!this.isSupported) return false;

    try {
      const subscription = await this.getSubscription();
      if (!subscription) {
        showToast('Not subscribed to notifications', 'info');
        return false;
      }

      const successful = await subscription.unsubscribe();
      if (successful) {
        // Remove subscription from server
        await this.removeSubscriptionFromServer(subscription);
        showToast('Unsubscribed from notifications', 'success');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PushNotificationManager] Unsubscription failed:', error);
      showToast('Failed to unsubscribe from notifications', 'error');
      return false;
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription,
          userId: this.getUserId()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }

      console.log('[PushNotificationManager] Subscription sent to server');
    } catch (error) {
      console.error('[PushNotificationManager] Failed to send subscription to server:', error);
      throw error;
    }
  }

  async removeSubscriptionFromServer(subscription) {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription,
          userId: this.getUserId()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server');
      }

      console.log('[PushNotificationManager] Subscription removed from server');
    } catch (error) {
      console.error('[PushNotificationManager] Failed to remove subscription from server:', error);
      throw error;
    }
  }

  showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      // Fallback to toast notification
      showToast(title, 'info', options.body);
      return;
    }

    try {
      const defaultOptions = {
        body: options.body || '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: options.tag || 'default',
        data: options.data || {},
        actions: options.actions || [
          {
            action: 'open',
            title: 'Open App'
          },
          {
            action: 'close',
            title: 'Close'
          }
        ],
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        vibrate: options.vibrate || [200, 100, 200]
      };

      // Show notification
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, defaultOptions);
        });
      } else {
        // Fallback to in-page notification
        new Notification(title, defaultOptions);
      }
    } catch (error) {
      console.error('[PushNotificationManager] Failed to show notification:', error);
      // Fallback to toast
      showToast(title, 'info', options.body);
    }
  }

  // Handle notification clicks
  handleNotificationClick(event) {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
      // Open the app
      if ('clients' in self) {
        event.waitUntil(
          clients.openWindow('/')
        );
      }
    }
  }

  // Handle notification close
  handleNotificationClose(event) {
    console.log('[PushNotificationManager] Notification closed:', event.notification.tag);
  }

  // Handle notification show
  handleNotificationShow(event) {
    console.log('[PushNotificationManager] Notification shown:', event.notification.tag);
  }

  // Offline notification handling
  async handleOfflineNotification(notificationData) {
    // Store notification for when user comes online
    const offlineNotifications = JSON.parse(localStorage.getItem('offline-notifications') || '[]');
    offlineNotifications.push({
      ...notificationData,
      timestamp: new Date().toISOString(),
      delivered: false
    });
    
    localStorage.setItem('offline-notifications', JSON.stringify(offlineNotifications));
    
    // Show immediate feedback
    showToast('Notification queued for delivery', 'info');
  }

  // Process offline notifications when back online
  async processOfflineNotifications() {
    if (!this.isSupported || !navigator.onLine) return;

    const offlineNotifications = JSON.parse(localStorage.getItem('offline-notifications') || '[]');
    
    if (offlineNotifications.length === 0) return;

    for (const notification of offlineNotifications) {
      try {
        this.showNotification(notification.title, notification.options);
        notification.delivered = true;
      } catch (error) {
        console.error('[PushNotificationManager] Failed to deliver offline notification:', error);
      }
    }

    // Remove delivered notifications
    const remainingNotifications = offlineNotifications.filter(n => !n.delivered);
    localStorage.setItem('offline-notifications', JSON.stringify(remainingNotifications));
  }

  // Emergency notification handling
  async sendEmergencyNotification(message, priority = 'high') {
    const emergencyOptions = {
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'emergency',
      requireInteraction: true,
      silent: false,
      vibrate: [500, 200, 500, 200, 500],
      data: {
        type: 'emergency',
        priority: priority,
        timestamp: new Date().toISOString()
      }
    };

    this.showNotification('🚨 Emergency Alert', emergencyOptions);

    // Also send to server for persistent delivery
    try {
      await fetch('/api/notifications/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          priority,
          userId: this.getUserId()
        })
      });
    } catch (error) {
      console.error('[PushNotificationManager] Failed to send emergency notification to server:', error);
    }
  }

  // Scheduled notifications
  async scheduleNotification(title, options, scheduleTime) {
    const scheduledNotifications = JSON.parse(localStorage.getItem('scheduled-notifications') || '[]');
    
    const notification = {
      id: Date.now().toString(),
      title,
      options,
      scheduleTime: scheduleTime instanceof Date ? scheduleTime.toISOString() : scheduleTime,
      scheduled: true,
      delivered: false
    };

    scheduledNotifications.push(notification);
    localStorage.setItem('scheduled-notifications', JSON.stringify(scheduledNotifications));

    // Set up timer for scheduled delivery
    const delay = new Date(notification.scheduleTime).getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        this.showNotification(notification.title, notification.options);
        notification.delivered = true;
        this.updateScheduledNotification(notification);
      }, delay);
    }

    return notification.id;
  }

  async updateScheduledNotification(notification) {
    const scheduledNotifications = JSON.parse(localStorage.getItem('scheduled-notifications') || '[]');
    const index = scheduledNotifications.findIndex(n => n.id === notification.id);
    
    if (index !== -1) {
      scheduledNotifications[index] = notification;
      localStorage.setItem('scheduled-notifications', JSON.stringify(scheduledNotifications));
    }
  }

  async cancelScheduledNotification(id) {
    const scheduledNotifications = JSON.parse(localStorage.getItem('scheduled-notifications') || '[]');
    const updatedNotifications = scheduledNotifications.filter(n => n.id !== id);
    localStorage.setItem('scheduled-notifications', JSON.stringify(updatedNotifications));
  }

  // Utility methods
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  getUserId() {
    // Get user ID from context or localStorage
    return localStorage.getItem('userId') || 'anonymous';
  }

  async getNotificationStats() {
    const subscription = await this.getSubscription();
    const offlineNotifications = JSON.parse(localStorage.getItem('offline-notifications') || '[]');
    const scheduledNotifications = JSON.parse(localStorage.getItem('scheduled-notifications') || '[]');

    return {
      isSupported: this.isSupported,
      permission: this.permission,
      isSubscribed: !!subscription,
      endpoint: subscription ? subscription.endpoint : null,
      offlineCount: offlineNotifications.length,
      scheduledCount: scheduledNotifications.length,
      totalDelivered: localStorage.getItem('notification-delivery-count') || 0
    };
  }

  // Cleanup method
  async cleanup() {
    try {
      // Clear offline notifications older than 7 days
      const offlineNotifications = JSON.parse(localStorage.getItem('offline-notifications') || '[]');
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const recentNotifications = offlineNotifications.filter(n => 
        new Date(n.timestamp) > weekAgo
      );
      
      localStorage.setItem('offline-notifications', JSON.stringify(recentNotifications));

      // Clear scheduled notifications that are too old
      const scheduledNotifications = JSON.parse(localStorage.getItem('scheduled-notifications') || '[]');
      const futureNotifications = scheduledNotifications.filter(n => 
        new Date(n.scheduleTime) > new Date()
      );
      
      localStorage.setItem('scheduled-notifications', JSON.stringify(futureNotifications));

      console.log('[PushNotificationManager] Cleanup completed');
    } catch (error) {
      console.error('[PushNotificationManager] Cleanup failed:', error);
    }
  }
}

// Create singleton instance
const pushNotificationManager = new PushNotificationManager();

export default pushNotificationManager;
