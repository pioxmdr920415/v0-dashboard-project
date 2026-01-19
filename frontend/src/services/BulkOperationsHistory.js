/**
 * BulkOperationsHistory - Audit and history tracking for bulk operations
 * Provides comprehensive logging, audit trails, and historical analysis
 */

import { bulkOperationsManager } from './BulkOperationsManager';

class BulkOperationsHistory {
  constructor() {
    this.history = [];
    this.auditLogs = [];
    this.metrics = new Map();
    this.listeners = new Set();
    this.maxHistorySize = 10000;
    this.maxAuditLogSize = 50000;
  }

  /**
   * Log an operation event
   * @param {string} operationId - Operation ID
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @param {Object} metadata - Additional metadata
   */
  logEvent(operationId, eventType, eventData = {}, metadata = {}) {
    const logEntry = {
      id: this._generateLogId(),
      operationId,
      eventType,
      timestamp: new Date().toISOString(),
      eventData,
      metadata,
      userId: metadata.userId || 'system',
      sessionId: metadata.sessionId || null
    };

    this.auditLogs.push(logEntry);
    this._cleanupAuditLogs();

    this.notifyListeners('event_logged', logEntry);

    // Update metrics
    this._updateMetrics(operationId, eventType, eventData);

    return logEntry;
  }

  /**
   * Record operation completion
   * @param {Object} operation - Completed operation
   */
  recordCompletion(operation) {
    const historyEntry = {
      id: this._generateHistoryId(),
      operationId: operation.id,
      type: operation.type,
      status: operation.status,
      startTime: operation.startTime,
      endTime: operation.endTime,
      duration: operation.duration,
      totalItems: operation.totalItems,
      processedItems: operation.processedItems,
      successItems: operation.successItems,
      failedItems: operation.failedItems,
      errors: operation.errors,
      warnings: operation.warnings,
      config: operation.config,
      metadata: {
        ...operation.metadata,
        completedAt: new Date().toISOString(),
        createdBy: operation.metadata?.createdBy || 'system'
      }
    };

    this.history.push(historyEntry);
    this._cleanupHistory();

    this.notifyListeners('operation_completed', historyEntry);

    return historyEntry;
  }

  /**
   * Get operation history
   * @param {Object} filters - Filter options
   * @returns {Array} Filtered history
   */
  getHistory(filters = {}) {
    let filtered = [...this.history];

    // Apply filters
    if (filters.operationId) {
      filtered = filtered.filter(entry => entry.operationId === filters.operationId);
    }

    if (filters.type) {
      filtered = filtered.filter(entry => entry.type === filters.type);
    }

    if (filters.status) {
      filtered = filtered.filter(entry => entry.status === filters.status);
    }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      filtered = filtered.filter(entry => new Date(entry.startTime) >= from);
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      filtered = filtered.filter(entry => new Date(entry.endTime || entry.startTime) <= to);
    }

    if (filters.userId) {
      filtered = filtered.filter(entry => entry.metadata.createdBy === filters.userId);
    }

    // Sort by completion time
    filtered.sort((a, b) => new Date(b.endTime || b.startTime) - new Date(a.endTime || a.startTime));

    return filtered;
  }

  /**
   * Get audit logs for an operation
   * @param {string} operationId - Operation ID
   * @param {Object} filters - Filter options
   * @returns {Array} Audit logs
   */
  getAuditLogs(operationId, filters = {}) {
    let filtered = this.auditLogs.filter(log => log.operationId === operationId);

    if (filters.eventType) {
      filtered = filtered.filter(log => log.eventType === filters.eventType);
    }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      filtered = filtered.filter(log => new Date(log.timestamp) >= from);
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      filtered = filtered.filter(log => new Date(log.timestamp) <= to);
    }

    // Sort by timestamp
    filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return filtered;
  }

  /**
   * Get operation metrics
   * @param {string} operationId - Operation ID
   * @returns {Object} Operation metrics
   */
  getMetrics(operationId) {
    return this.metrics.get(operationId) || this._calculateDefaultMetrics();
  }

  /**
   * Get historical statistics
   * @param {Object} options - Statistics options
   * @returns {Object} Historical statistics
   */
  getStatistics(options = {}) {
    const history = this.getHistory(options.filters);
    
    const stats = {
      totalOperations: history.length,
      operationsByType: {},
      operationsByStatus: {},
      successRate: 0,
      averageDuration: 0,
      throughput: 0,
      errorRate: 0,
      topErrors: [],
      timeRange: {
        firstOperation: history.length > 0 ? history[history.length - 1].startTime : null,
        lastOperation: history.length > 0 ? history[0].startTime : null
      }
    };

    if (history.length === 0) {
      return stats;
    }

    // Calculate statistics
    let totalDuration = 0;
    let totalErrors = 0;
    let totalItems = 0;
    let successfulOperations = 0;

    history.forEach(entry => {
      // Count by type
      stats.operationsByType[entry.type] = (stats.operationsByType[entry.type] || 0) + 1;
      
      // Count by status
      stats.operationsByStatus[entry.status] = (stats.operationsByStatus[entry.status] || 0) + 1;

      // Calculate totals
      if (entry.status === 'completed') {
        successfulOperations++;
      }

      if (entry.duration) {
        totalDuration += entry.duration;
      }

      totalItems += entry.totalItems || 0;
      totalErrors += entry.errors.length;
    });

    // Calculate rates
    stats.successRate = Math.round((successfulOperations / history.length) * 100);
    stats.averageDuration = history.length > 0 ? Math.round(totalDuration / history.length) : 0;
    stats.errorRate = totalItems > 0 ? Math.round((totalErrors / totalItems) * 100) : 0;

    // Calculate throughput (operations per hour)
    if (stats.timeRange.firstOperation && stats.timeRange.lastOperation) {
      const timeDiff = new Date(stats.timeRange.lastOperation) - new Date(stats.timeRange.firstOperation);
      const hours = timeDiff / (1000 * 60 * 60);
      stats.throughput = hours > 0 ? Math.round(history.length / hours) : 0;
    }

    // Get top errors
    const errorCounts = new Map();
    history.forEach(entry => {
      entry.errors.forEach(error => {
        const key = error.message || error.code || 'Unknown Error';
        errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
      });
    });

    stats.topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));

    return stats;
  }

  /**
   * Export history data
   * @param {Object} options - Export options
   * @returns {Object} Exported data
   */
  exportData(options = {}) {
    const history = this.getHistory(options.filters);
    const auditLogs = options.includeAuditLogs ? this.auditLogs : [];

    return {
      exportDate: new Date().toISOString(),
      options,
      history,
      auditLogs,
      statistics: this.getStatistics({ filters: options.filters })
    };
  }

  /**
   * Clear history older than specified date
   * @param {Date} cutoffDate - Cutoff date
   * @returns {number} Number of entries removed
   */
  clearOldHistory(cutoffDate) {
    const cutoff = cutoffDate.toISOString();
    const initialLength = this.history.length;
    
    this.history = this.history.filter(entry => entry.startTime >= cutoff);
    
    const removedCount = initialLength - this.history.length;
    
    if (removedCount > 0) {
      this.notifyListeners('history_cleared', { removedCount, cutoffDate: cutoff });
    }

    return removedCount;
  }

  /**
   * Clear audit logs older than specified date
   * @param {Date} cutoffDate - Cutoff date
   * @returns {number} Number of entries removed
   */
  clearOldAuditLogs(cutoffDate) {
    const cutoff = cutoffDate.toISOString();
    const initialLength = this.auditLogs.length;
    
    this.auditLogs = this.auditLogs.filter(log => log.timestamp >= cutoff);
    
    const removedCount = initialLength - this.auditLogs.length;
    
    if (removedCount > 0) {
      this.notifyListeners('audit_logs_cleared', { removedCount, cutoffDate: cutoff });
    }

    return removedCount;
  }

  /**
   * Get operation timeline
   * @param {string} operationId - Operation ID
   * @returns {Array} Timeline of events
   */
  getOperationTimeline(operationId) {
    const historyEntry = this.history.find(entry => entry.operationId === operationId);
    const auditLogs = this.getAuditLogs(operationId);
    
    if (!historyEntry) {
      return [];
    }

    const timeline = [
      {
        timestamp: historyEntry.startTime,
        eventType: 'operation_created',
        description: 'Operation created',
        data: { operationType: historyEntry.type }
      },
      ...auditLogs.map(log => ({
        timestamp: log.timestamp,
        eventType: log.eventType,
        description: this._getEventDescription(log.eventType),
        data: log.eventData
      })),
      {
        timestamp: historyEntry.endTime || historyEntry.startTime,
        eventType: 'operation_completed',
        description: `Operation ${historyEntry.status}`,
        data: {
          status: historyEntry.status,
          duration: historyEntry.duration,
          successItems: historyEntry.successItems,
          failedItems: historyEntry.failedItems
        }
      }
    ];

    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return timeline;
  }

  /**
   * Add listener for history events
   * @param {Function} callback - Event listener callback
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove listener
   * @param {Function} callback - Event listener callback
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify listeners of events
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('History listener error:', error);
      }
    });
  }

  // Private methods

  _generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateHistoryId() {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _cleanupHistory() {
    if (this.history.length > this.maxHistorySize) {
      this.history.splice(0, this.history.length - this.maxHistorySize);
    }
  }

  _cleanupAuditLogs() {
    if (this.auditLogs.length > this.maxAuditLogSize) {
      this.auditLogs.splice(0, this.auditLogs.length - this.maxAuditLogSize);
    }
  }

  _updateMetrics(operationId, eventType, eventData) {
    let metrics = this.metrics.get(operationId);
    if (!metrics) {
      metrics = this._calculateDefaultMetrics();
      this.metrics.set(operationId, metrics);
    }

    // Update metrics based on event type
    switch (eventType) {
      case 'operation_started':
        metrics.startedAt = eventData.timestamp;
        break;
      case 'operation_completed':
        metrics.completedAt = eventData.timestamp;
        metrics.duration = eventData.duration;
        break;
      case 'batch_processed':
        metrics.batchesProcessed++;
        metrics.lastBatchProcessedAt = eventData.timestamp;
        break;
      case 'error_occurred':
        metrics.errorCount++;
        break;
      case 'warning_occurred':
        metrics.warningCount++;
        break;
    }

    this.metrics.set(operationId, metrics);
  }

  _calculateDefaultMetrics() {
    return {
      operationId: null,
      startedAt: null,
      completedAt: null,
      duration: 0,
      batchesProcessed: 0,
      lastBatchProcessedAt: null,
      errorCount: 0,
      warningCount: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  _getEventDescription(eventType) {
    const descriptions = {
      'operation_created': 'Operation created',
      'operation_started': 'Operation started',
      'operation_completed': 'Operation completed',
      'operation_cancelled': 'Operation cancelled',
      'batch_processed': 'Batch processed',
      'error_occurred': 'Error occurred',
      'warning_occurred': 'Warning occurred',
      'retry_attempted': 'Retry attempted',
      'validation_started': 'Validation started',
      'validation_completed': 'Validation completed'
    };

    return descriptions[eventType] || eventType;
  }
}

// Singleton instance
export const bulkOperationsHistory = new BulkOperationsHistory();
export default bulkOperationsHistory;
