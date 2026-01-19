/**
 * RealTimeValidationMonitor - Real-time monitoring and alerting system
 * Provides real-time validation monitoring with configurable alerts and notifications
 */

import { dataValidationService } from './DataValidationService';
import { validationConfigManager } from './ValidationConfigManager';

class RealTimeValidationMonitor {
  constructor() {
    this.alerts = new Map();
    this.monitoringIntervals = new Map();
    this.listeners = new Set();
    this.alertHistory = [];
    this.isMonitoring = false;
    
    // Default alert thresholds
    this.defaultThresholds = {
      qualityScore: {
        critical: 50,
        warning: 70
      },
      errorRate: {
        critical: 20,
        warning: 10
      },
      warningRate: {
        critical: 50,
        warning: 30
      },
      validationRate: {
        critical: 1, // validations per minute
        warning: 5
      }
    };

    this.loadAlertThresholds();
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.notifyListeners('monitoring_started');

    // Start monitoring all registered schemas
    const schemas = validationConfigManager.getAllSchemas();
    schemas.forEach(schema => {
      this.startSchemaMonitoring(schema.id);
    });

    // Start global monitoring
    this.startGlobalMonitoring();
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    // Stop all schema monitoring
    for (const [schemaId] of this.monitoringIntervals) {
      this.stopSchemaMonitoring(schemaId);
    }

    // Stop global monitoring
    if (this.globalMonitoringInterval) {
      clearInterval(this.globalMonitoringInterval);
      delete this.globalMonitoringInterval;
    }

    this.notifyListeners('monitoring_stopped');
  }

  /**
   * Start monitoring a specific schema
   * @param {string} schemaId - Schema identifier
   */
  startSchemaMonitoring(schemaId) {
    if (this.monitoringIntervals.has(schemaId)) return;

    const interval = setInterval(() => {
      this.checkSchemaAlerts(schemaId);
    }, 30000); // Check every 30 seconds

    this.monitoringIntervals.set(schemaId, interval);
    this.notifyListeners('schema_monitoring_started', { schemaId });
  }

  /**
   * Stop monitoring a specific schema
   * @param {string} schemaId - Schema identifier
   */
  stopSchemaMonitoring(schemaId) {
    const interval = this.monitoringIntervals.get(schemaId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(schemaId);
      this.notifyListeners('schema_monitoring_stopped', { schemaId });
    }
  }

  /**
   * Start global monitoring
   */
  startGlobalMonitoring() {
    if (this.globalMonitoringInterval) return;

    this.globalMonitoringInterval = setInterval(() => {
      this.checkGlobalAlerts();
    }, 60000); // Check every minute
  }

  /**
   * Check alerts for a specific schema
   * @param {string} schemaId - Schema identifier
   */
  checkSchemaAlerts(schemaId) {
    try {
      const metrics = dataValidationService.getQualityMetrics(schemaId);
      const thresholds = this.getAlertThresholds(schemaId);

      // Quality score alert
      if (metrics.qualityScore < thresholds.qualityScore.critical) {
        this.triggerAlert({
          type: 'quality_score_critical',
          schemaId,
          severity: 'critical',
          message: `Critical: Quality score for ${schemaId} is ${metrics.qualityScore}%`,
          data: { qualityScore: metrics.qualityScore }
        });
      } else if (metrics.qualityScore < thresholds.qualityScore.warning) {
        this.triggerAlert({
          type: 'quality_score_warning',
          schemaId,
          severity: 'warning',
          message: `Warning: Quality score for ${schemaId} is ${metrics.qualityScore}%`,
          data: { qualityScore: metrics.qualityScore }
        });
      }

      // Error rate alert
      const errorRate = this.calculateErrorRate(schemaId);
      if (errorRate > thresholds.errorRate.critical) {
        this.triggerAlert({
          type: 'error_rate_critical',
          schemaId,
          severity: 'critical',
          message: `Critical: Error rate for ${schemaId} is ${errorRate.toFixed(1)}%`,
          data: { errorRate }
        });
      } else if (errorRate > thresholds.errorRate.warning) {
        this.triggerAlert({
          type: 'error_rate_warning',
          schemaId,
          severity: 'warning',
          message: `Warning: Error rate for ${schemaId} is ${errorRate.toFixed(1)}%`,
          data: { errorRate }
        });
      }

      // Warning rate alert
      const warningRate = this.calculateWarningRate(schemaId);
      if (warningRate > thresholds.warningRate.critical) {
        this.triggerAlert({
          type: 'warning_rate_critical',
          schemaId,
          severity: 'critical',
          message: `Critical: Warning rate for ${schemaId} is ${warningRate.toFixed(1)}%`,
          data: { warningRate }
        });
      } else if (warningRate > thresholds.warningRate.warning) {
        this.triggerAlert({
          type: 'warning_rate_warning',
          schemaId,
          severity: 'warning',
          message: `Warning: Warning rate for ${schemaId} is ${warningRate.toFixed(1)}%`,
          data: { warningRate }
        });
      }

    } catch (error) {
      console.error(`Error checking alerts for schema ${schemaId}:`, error);
    }
  }

  /**
   * Check global alerts
   */
  checkGlobalAlerts() {
    try {
      const schemas = validationConfigManager.getAllSchemas();
      let criticalAlerts = 0;
      let warningAlerts = 0;

      schemas.forEach(schema => {
        const metrics = dataValidationService.getQualityMetrics(schema.id);
        if (metrics.qualityScore < this.defaultThresholds.qualityScore.critical) {
          criticalAlerts++;
        } else if (metrics.qualityScore < this.defaultThresholds.qualityScore.warning) {
          warningAlerts++;
        }
      });

      // Global critical alert
      if (criticalAlerts > 0) {
        this.triggerAlert({
          type: 'global_critical',
          severity: 'critical',
          message: `${criticalAlerts} schema(s) have critical quality issues`,
          data: { criticalAlerts, warningAlerts }
        });
      }

      // Global warning alert
      if (warningAlerts > 0) {
        this.triggerAlert({
          type: 'global_warning',
          severity: 'warning',
          message: `${warningAlerts} schema(s) have quality warnings`,
          data: { criticalAlerts, warningAlerts }
        });
      }

    } catch (error) {
      console.error('Error checking global alerts:', error);
    }
  }

  /**
   * Trigger an alert
   * @param {Object} alert - Alert configuration
   */
  triggerAlert(alert) {
    const alertId = `${alert.type}_${alert.schemaId || 'global'}_${Date.now()}`;
    
    const alertData = {
      ...alert,
      id: alertId,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    // Store alert
    this.alerts.set(alertId, alertData);
    this.alertHistory.push(alertData);

    // Notify listeners
    this.notifyListeners('alert_triggered', alertData);

    // Send notification if configured
    this.sendNotification(alertData);

    // Auto-acknowledge critical alerts after 5 minutes
    if (alert.severity === 'critical') {
      setTimeout(() => {
        this.acknowledgeAlert(alertId);
      }, 300000);
    }
  }

  /**
   * Acknowledge an alert
   * @param {string} alertId - Alert identifier
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      this.notifyListeners('alert_acknowledged', alert);
    }
  }

  /**
   * Get active alerts
   * @param {string} schemaId - Optional schema identifier
   * @returns {Array} Array of active alerts
   */
  getActiveAlerts(schemaId = null) {
    const alerts = Array.from(this.alerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (schemaId) {
      return alerts.filter(alert => alert.schemaId === schemaId);
    }

    return alerts;
  }

  /**
   * Get alert history
   * @param {number} limit - Maximum number of alerts to return
   * @returns {Array} Array of alert history
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Set alert thresholds for a schema
   * @param {string} schemaId - Schema identifier
   * @param {Object} thresholds - Threshold configuration
   */
  setAlertThresholds(schemaId, thresholds) {
    const currentThresholds = this.getAlertThresholds(schemaId);
    const newThresholds = { ...currentThresholds, ...thresholds };
    
    localStorage.setItem(`alert_thresholds_${schemaId}`, JSON.stringify(newThresholds));
    this.notifyListeners('thresholds_updated', { schemaId, thresholds: newThresholds });
  }

  /**
   * Get alert thresholds for a schema
   * @param {string} schemaId - Schema identifier
   * @returns {Object} Threshold configuration
   */
  getAlertThresholds(schemaId) {
    const stored = localStorage.getItem(`alert_thresholds_${schemaId}`);
    if (stored) {
      return JSON.parse(stored);
    }
    return this.defaultThresholds;
  }

  /**
   * Calculate error rate for a schema
   * @param {string} schemaId - Schema identifier
   * @returns {number} Error rate percentage
   */
  calculateErrorRate(schemaId) {
    const results = dataValidationService.getValidationResults(schemaId);
    if (results.length === 0) return 0;

    const invalidCount = results.filter(r => r.status === 'invalid').length;
    return (invalidCount / results.length) * 100;
  }

  /**
   * Calculate warning rate for a schema
   * @param {string} schemaId - Schema identifier
   * @returns {number} Warning rate percentage
   */
  calculateWarningRate(schemaId) {
    const results = dataValidationService.getValidationResults(schemaId);
    if (results.length === 0) return 0;

    const warningCount = results.filter(r => r.status === 'warnings').length;
    return (warningCount / results.length) * 100;
  }

  /**
   * Send notification for an alert
   * @param {Object} alert - Alert data
   */
  sendNotification(alert) {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Data Validation Alert: ${alert.severity.toUpperCase()}`, {
        body: alert.message,
        icon: '/favicon.ico',
        tag: alert.type
      });
    }

    // Console notification
    const consoleMethod = alert.severity === 'critical' ? 'error' : 'warn';
    console[consoleMethod](`[${alert.timestamp}] ${alert.message}`);

    // Custom notification callback
    if (this.notificationCallback) {
      this.notificationCallback(alert);
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  /**
   * Set notification callback
   * @param {Function} callback - Notification callback function
   */
  setNotificationCallback(callback) {
    this.notificationCallback = callback;
  }

  /**
   * Add listener for monitoring events
   * @param {Function} callback - Event listener callback
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove listener for monitoring events
   * @param {Function} callback - Event listener callback
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify listeners of events
   * @param {string} event - Event type
   * @param {any} data - Event data
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in monitoring listener:', error);
      }
    });
  }

  /**
   * Get monitoring status
   * @returns {Object} Monitoring status
   */
  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      activeSchemas: Array.from(this.monitoringIntervals.keys()),
      activeAlerts: this.getActiveAlerts().length,
      totalAlerts: this.alertHistory.length
    };
  }

  /**
   * Reset alert history
   */
  resetAlertHistory() {
    this.alertHistory = [];
    this.alerts.clear();
    this.notifyListeners('alert_history_reset');
  }

  /**
   * Load alert thresholds from storage
   */
  loadAlertThresholds() {
    try {
      const stored = localStorage.getItem('alert_thresholds_global');
      if (stored) {
        this.defaultThresholds = { ...this.defaultThresholds, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading alert thresholds:', error);
    }
  }

  /**
   * Save alert thresholds to storage
   * @param {Object} thresholds - Threshold configuration
   */
  saveAlertThresholds(thresholds) {
    this.defaultThresholds = { ...this.defaultThresholds, ...thresholds };
    localStorage.setItem('alert_thresholds_global', JSON.stringify(this.defaultThresholds));
  }
}

// Singleton instance
export const realTimeValidationMonitor = new RealTimeValidationMonitor();
export default realTimeValidationMonitor;
