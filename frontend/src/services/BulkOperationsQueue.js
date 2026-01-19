/**
 * BulkOperationsQueue - Advanced queue management for bulk operations
 * Provides priority queuing, scheduling, and advanced queue operations
 */

import { bulkOperationsManager } from './BulkOperationsManager';

class BulkOperationsQueue {
  constructor() {
    this.queues = {
      high: [],
      normal: [],
      low: []
    };
    this.scheduledOperations = new Map();
    this.pausedQueues = new Set();
    this.listeners = new Set();
    this.stats = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalFailed: 0,
      totalCancelled: 0,
      averageProcessingTime: 0,
      throughput: 0 // operations per second
    };
  }

  /**
   * Enqueue an operation with priority
   * @param {string} operationId - Operation ID
   * @param {string} priority - Priority level (high, normal, low)
   * @param {Object} options - Queue options
   */
  enqueue(operationId, priority = 'normal', options = {}) {
    const operation = bulkOperationsManager.getOperation(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (operation.status !== 'pending') {
      throw new Error(`Operation ${operationId} is not in pending state`);
    }

    const queueItem = {
      operationId,
      priority,
      enqueuedAt: new Date().toISOString(),
      scheduledFor: options.scheduledFor || null,
      metadata: {
        ...options,
        enqueuedBy: options.enqueuedBy || 'system',
        estimatedDuration: operation.metadata?.estimatedDuration || null
      }
    };

    this.queues[priority].push(queueItem);
    this.stats.totalEnqueued++;

    this.notifyListeners('operation_enqueued', {
      operationId,
      priority,
      queueLength: this.getQueueLength(priority)
    });

    // Auto-start processing if not paused
    if (!this.pausedQueues.has(priority)) {
      this._processQueue(priority);
    }

    return queueItem;
  }

  /**
   * Schedule an operation for future execution
   * @param {string} operationId - Operation ID
   * @param {Date} scheduledTime - When to execute
   * @param {string} priority - Priority level
   */
  schedule(operationId, scheduledTime, priority = 'normal') {
    const operation = bulkOperationsManager.getOperation(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    const scheduledItem = {
      operationId,
      scheduledTime: scheduledTime.toISOString(),
      priority,
      createdAt: new Date().toISOString()
    };

    this.scheduledOperations.set(operationId, scheduledItem);

    this.notifyListeners('operation_scheduled', {
      operationId,
      scheduledTime: scheduledItem.scheduledTime,
      priority
    });

    // Set up timer for scheduled execution
    const delay = scheduledTime.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        this._executeScheduledOperation(operationId);
      }, delay);
    }

    return scheduledItem;
  }

  /**
   * Pause a priority queue
   * @param {string} priority - Priority level to pause
   */
  pauseQueue(priority) {
    this.pausedQueues.add(priority);
    this.notifyListeners('queue_paused', { priority });
  }

  /**
   * Resume a priority queue
   * @param {string} priority - Priority level to resume
   */
  resumeQueue(priority) {
    this.pausedQueues.delete(priority);
    this.notifyListeners('queue_resumed', { priority });
    
    // Resume processing
    this._processQueue(priority);
  }

  /**
   * Get queue status
   * @param {string} priority - Priority level (optional)
   * @returns {Object} Queue status
   */
  getQueueStatus(priority = null) {
    if (priority) {
      return {
        priority,
        length: this.queues[priority].length,
        paused: this.pausedQueues.has(priority),
        items: this.queues[priority]
      };
    }

    return {
      high: this.getQueueStatus('high'),
      normal: this.getQueueStatus('normal'),
      low: this.getQueueStatus('low'),
      scheduled: Array.from(this.scheduledOperations.values()),
      stats: this.stats,
      isProcessing: this._isAnyQueueProcessing()
    };
  }

  /**
   * Get queue length for a priority
   * @param {string} priority - Priority level
   * @returns {number} Queue length
   */
  getQueueLength(priority) {
    return this.queues[priority].length;
  }

  /**
   * Get next operation to process
   * @returns {Object|null} Next operation or null
   */
  getNextOperation() {
    // Process in priority order
    for (const priority of ['high', 'normal', 'low']) {
      if (this.queues[priority].length > 0 && !this.pausedQueues.has(priority)) {
        return this.queues[priority][0];
      }
    }
    return null;
  }

  /**
   * Remove operation from queue
   * @param {string} operationId - Operation ID
   * @param {string} priority - Priority level
   */
  removeFromQueue(operationId, priority) {
    const queue = this.queues[priority];
    const index = queue.findIndex(item => item.operationId === operationId);
    
    if (index > -1) {
      const removed = queue.splice(index, 1)[0];
      this.stats.totalCancelled++;
      
      this.notifyListeners('operation_removed', {
        operationId,
        priority,
        removedItem: removed
      });
      
      return removed;
    }
    
    return null;
  }

  /**
   * Clear all queues
   * @param {string} priority - Priority level (optional, clears all if not specified)
   */
  clearQueues(priority = null) {
    if (priority) {
      const cleared = this.queues[priority].splice(0);
      this.notifyListeners('queues_cleared', { priority, count: cleared.length });
      return cleared;
    }

    const allCleared = {};
    for (const [p, queue] of Object.entries(this.queues)) {
      allCleared[p] = queue.splice(0);
    }

    this.notifyListeners('queues_cleared', { priority: 'all', queues: allCleared });
    return allCleared;
  }

  /**
   * Get processing statistics
   * @returns {Object} Processing statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalEnqueued: 0,
      totalProcessed: 0,
      totalFailed: 0,
      totalCancelled: 0,
      averageProcessingTime: 0,
      throughput: 0
    };
    
    this.notifyListeners('stats_reset');
  }

  /**
   * Process queue for a specific priority
   * @param {string} priority - Priority level
   */
  async _processQueue(priority) {
    if (this.pausedQueues.has(priority) || this.queues[priority].length === 0) {
      return;
    }

    const queueItem = this.queues[priority][0];
    const operation = bulkOperationsManager.getOperation(queueItem.operationId);

    if (!operation) {
      // Remove from queue if operation no longer exists
      this.queues[priority].shift();
      return;
    }

    try {
      // Start processing
      await bulkOperationsManager.addToQueue(queueItem.operationId);
      
      // Remove from queue after processing
      this.queues[priority].shift();
      this.stats.totalProcessed++;

      // Update throughput statistics
      this._updateThroughputStats();

    } catch (error) {
      this.stats.totalFailed++;
      this.notifyListeners('operation_failed', {
        operationId: queueItem.operationId,
        priority,
        error: error.message
      });
    }

    // Continue processing next item
    setTimeout(() => this._processQueue(priority), 100);
  }

  /**
   * Execute a scheduled operation
   * @param {string} operationId - Operation ID
   */
  async _executeScheduledOperation(operationId) {
    const scheduledItem = this.scheduledOperations.get(operationId);
    if (!scheduledItem) {
      return;
    }

    try {
      // Move to appropriate queue
      this.enqueue(operationId, scheduledItem.priority);
      
      // Remove from scheduled operations
      this.scheduledOperations.delete(operationId);

      this.notifyListeners('scheduled_operation_executed', {
        operationId,
        priority: scheduledItem.priority
      });

    } catch (error) {
      this.notifyListeners('scheduled_operation_failed', {
        operationId,
        error: error.message
      });
    }
  }

  /**
   * Update throughput statistics
   */
  _updateThroughputStats() {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const recentOperations = this.stats.totalProcessed;
    
    // Calculate operations per second over the last minute
    this.stats.throughput = recentOperations > 0 
      ? Math.round(recentOperations / (timeWindow / 1000))
      : 0;
  }

  /**
   * Check if any queue is processing
   * @returns {boolean} True if any queue is processing
   */
  _isAnyQueueProcessing() {
    return Array.from(this.queues.values()).some(queue => queue.length > 0);
  }

  /**
   * Add listener for queue events
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
        console.error('Queue listener error:', error);
      }
    });
  }
}

// Singleton instance
export const bulkOperationsQueue = new BulkOperationsQueue();
export default bulkOperationsQueue;
