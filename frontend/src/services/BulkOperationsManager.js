/**
 * BulkOperationsManager - Core service for handling bulk data operations
 * Provides comprehensive bulk operations including import, export, update, and delete
 * with progress tracking, error handling, and integration with DataValidationService
 * Enhanced with queue management and history tracking
 */

import { dataValidationService } from './DataValidationService';
import { bulkOperationsQueue } from './BulkOperationsQueue';
import { bulkOperationsHistory } from './BulkOperationsHistory';

class BulkOperationsManager {
  constructor() {
    this.operations = new Map();
    this.queue = [];
    this.isProcessing = false;
    this.listeners = new Set();
    this.config = {
      batchSize: 100,
      retryAttempts: 3,
      retryDelay: 1000,
      maxConcurrent: 3,
      validationEnabled: true,
      progressUpdateInterval: 1000,
      enableHistory: true,
      enableQueue: true
    };
  }

  /**
   * Configure bulk operations settings
   * @param {Object} settings - Configuration settings
   */
  configure(settings) {
    this.config = { ...this.config, ...settings };
    this.notifyListeners('config_updated', this.config);
  }

  /**
   * Create a new bulk operation
   * @param {Object} operationConfig - Operation configuration
   * @returns {Object} Created operation
   */
  createOperation(operationConfig) {
    const operation = {
      id: this._generateId(),
      type: operationConfig.type, // 'import', 'export', 'update', 'delete'
      status: 'pending',
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      successItems: 0,
      failedItems: 0,
      errors: [],
      warnings: [],
      startTime: null,
      endTime: null,
      duration: 0,
      config: {
        ...operationConfig,
        batchSize: operationConfig.batchSize || this.config.batchSize,
        validationSchema: operationConfig.validationSchema,
        retryAttempts: operationConfig.retryAttempts || this.config.retryAttempts
      },
      metadata: {
        createdBy: operationConfig.createdBy || 'system',
        createdAt: new Date().toISOString(),
        estimatedDuration: null,
        itemsPerSecond: 0
      }
    };

    this.operations.set(operation.id, operation);
    this.notifyListeners('operation_created', operation);
    
    return operation;
  }

  /**
   * Add operation to queue
   * @param {string} operationId - Operation ID
   * @param {string} priority - Priority level (high, normal, low)
   * @param {Object} options - Queue options
   */
  addToQueue(operationId, priority = 'normal', options = {}) {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (operation.status !== 'pending') {
      throw new Error(`Operation ${operationId} is not in pending state`);
    }

    // Log the queueing event
    if (this.config.enableHistory) {
      bulkOperationsHistory.logEvent(operationId, 'operation_queued', {
        priority,
        queueLength: this.queue.length
      }, options);
    }

    // Use advanced queue if enabled
    if (this.config.enableQueue) {
      bulkOperationsQueue.enqueue(operationId, priority, options);
      this.notifyListeners('operation_queued', {
        operationId,
        priority,
        queueLength: bulkOperationsQueue.getQueueLength(priority)
      });
    } else {
      // Use simple queue
      this.queue.push(operationId);
      this.notifyListeners('operation_queued', { operationId, queueLength: this.queue.length });
      
      // Start processing if not already running
      if (!this.isProcessing) {
        this._processQueue();
      }
    }
  }

  /**
   * Start processing operations in queue
   */
  async _processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    // Log queue start
    if (this.config.enableHistory) {
      bulkOperationsHistory.logEvent('system', 'queue_started', {
        queueLength: this.queue.length
      });
    }

    this.notifyListeners('queue_started', { queueLength: this.queue.length });

    while (this.queue.length > 0) {
      const operationId = this.queue[0];
      const operation = this.operations.get(operationId);

      try {
        await this._executeOperation(operation);
      } catch (error) {
        this._handleOperationError(operation, error);
      }

      // Remove from queue
      this.queue.shift();
      
      // Notify progress
      this.notifyListeners('queue_progress', {
        completed: this.queue.length === 0,
        remaining: this.queue.length
      });
    }

    this.isProcessing = false;
    
    // Log queue completion
    if (this.config.enableHistory) {
      bulkOperationsHistory.logEvent('system', 'queue_completed');
    }

    this.notifyListeners('queue_completed');
  }

  /**
   * Execute a single operation
   * @param {Object} operation - Operation to execute
   */
  async _executeOperation(operation) {
    const startTime = Date.now();
    operation.status = 'running';
    operation.startTime = new Date().toISOString();
    operation.retryCount = 0;
    
    // Log operation start
    if (this.config.enableHistory) {
      bulkOperationsHistory.logEvent(operation.id, 'operation_started', {
        type: operation.type,
        totalItems: operation.totalItems
      });
    }

    this.notifyListeners('operation_started', operation);

    try {
      // Pre-validation if enabled
      if (this.config.validationEnabled && operation.config.validationSchema) {
        await this._preValidateData(operation, operation.config.data, operation.config.validationSchema);
      }

      switch (operation.type) {
        case 'import':
          await this._executeImport(operation);
          break;
        case 'export':
          await this._executeExport(operation);
          break;
        case 'update':
          await this._executeUpdate(operation);
          break;
        case 'delete':
          await this._executeDelete(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      operation.status = 'completed';
      operation.endTime = new Date().toISOString();
      operation.duration = Date.now() - startTime;
      
      // Record completion in history
      if (this.config.enableHistory) {
        bulkOperationsHistory.recordCompletion(operation);
      }
      
      this.notifyListeners('operation_completed', operation);

    } catch (error) {
      operation.status = 'failed';
      operation.endTime = new Date().toISOString();
      operation.duration = Date.now() - startTime;
      operation.errors.push({
        timestamp: new Date().toISOString(),
        message: error.message,
        type: 'operation_error'
      });

      // Log operation failure
      if (this.config.enableHistory) {
        bulkOperationsHistory.logEvent(operation.id, 'operation_failed', {
          error: error.message,
          duration: operation.duration
        });
      }

      this.notifyListeners('operation_failed', operation);
      throw error;
    }
  }

  /**
   * Execute import operation
   * @param {Object} operation - Import operation
   */
  async _executeImport(operation) {
    const { data, validationSchema } = operation.config;
    
    if (!Array.isArray(data)) {
      throw new Error('Import data must be an array');
    }

    operation.totalItems = data.length;
    this._updateEstimatedDuration(operation);

    // Pre-validation if enabled
    if (this.config.validationEnabled && validationSchema) {
      await this._preValidateData(operation, data, validationSchema);
    }

    // Process in batches
    const batchSize = operation.config.batchSize;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await this._processBatch(operation, batch, i);
    }
  }

  /**
   * Execute export operation
   * @param {Object} operation - Export operation
   */
  async _executeExport(operation) {
    const { query, format, validationSchema } = operation.config;
    
    // Fetch data based on query
    const data = await this._fetchDataForExport(query);
    operation.totalItems = data.length;
    this._updateEstimatedDuration(operation);

    // Pre-validation if enabled
    if (this.config.validationEnabled && validationSchema) {
      await this._preValidateData(operation, data, validationSchema);
    }

    // Process in batches
    const batchSize = operation.config.batchSize;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await this._exportBatch(operation, batch, i);
    }
  }

  /**
   * Execute update operation
   * @param {Object} operation - Update operation
   */
  async _executeUpdate(operation) {
    const { query, updates, validationSchema } = operation.config;
    
    // Fetch data to update
    const data = await this._fetchDataForUpdate(query);
    operation.totalItems = data.length;
    this._updateEstimatedDuration(operation);

    // Apply updates and validate
    const updatedData = data.map(item => ({ ...item, ...updates }));
    
    // Pre-validation if enabled
    if (this.config.validationEnabled && validationSchema) {
      await this._preValidateData(operation, updatedData, validationSchema);
    }

    // Process in batches
    const batchSize = operation.config.batchSize;
    for (let i = 0; i < updatedData.length; i += batchSize) {
      const batch = updatedData.slice(i, i + batchSize);
      await this._updateBatch(operation, batch, i);
    }
  }

  /**
   * Execute delete operation
   * @param {Object} operation - Delete operation
   */
  async _executeDelete(operation) {
    const { query, validationSchema } = operation.config;
    
    // Fetch data to delete (for validation)
    const data = await this._fetchDataForDelete(query);
    operation.totalItems = data.length;
    this._updateEstimatedDuration(operation);

    // Pre-validation if enabled
    if (this.config.validationEnabled && validationSchema) {
      await this._preValidateData(operation, data, validationSchema);
    }

    // Process in batches
    const batchSize = operation.config.batchSize;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await this._deleteBatch(operation, batch, i);
    }
  }

  /**
   * Pre-validate data before processing
   * @param {Object} operation - Operation
   * @param {Array} data - Data to validate
   * @param {string} schemaId - Validation schema ID
   */
  async _preValidateData(operation, data, schemaId) {
    const validationResults = dataValidationService.validateBatch(schemaId, data);
    
    const invalidItems = validationResults.filter(result => !result.isValid);
    
    if (invalidItems.length > 0) {
      operation.errors.push({
        timestamp: new Date().toISOString(),
        message: `${invalidItems.length} items failed pre-validation`,
        type: 'pre_validation_error',
        details: invalidItems.map(item => ({
          index: item.batchIndex,
          errors: item.errors
        }))
      });

      // Decide whether to continue or fail based on configuration
      if (operation.config.failOnValidationError) {
        throw new Error(`Pre-validation failed for ${invalidItems.length} items`);
      }
    }

    // Add warnings for items with warnings
    const warningItems = validationResults.filter(result => result.status === 'warnings');
    if (warningItems.length > 0) {
      operation.warnings.push({
        timestamp: new Date().toISOString(),
        message: `${warningItems.length} items have validation warnings`,
        type: 'pre_validation_warning'
      });
    }
  }

  /**
   * Process a batch of import data
   * @param {Object} operation - Operation
   * @param {Array} batch - Batch of data
   * @param {number} startIndex - Start index of batch
   */
  async _processBatch(operation, batch, startIndex) {
    try {
      // Log batch processing start
      if (this.config.enableHistory) {
        bulkOperationsHistory.logEvent(operation.id, 'batch_started', {
          batchIndex: startIndex,
          batchSize: batch.length
        });
      }

      // Simulate API call or database operation
      const results = await this._simulateImport(batch);
      
      operation.processedItems += batch.length;
      operation.successItems += results.successCount;
      operation.failedItems += results.failureCount;
      
      if (results.errors.length > 0) {
        operation.errors.push(...results.errors);
        
        // Log errors
        if (this.config.enableHistory) {
          results.errors.forEach(error => {
            bulkOperationsHistory.logEvent(operation.id, 'error_occurred', error);
          });
        }
      }

      // Log batch completion
      if (this.config.enableHistory) {
        bulkOperationsHistory.logEvent(operation.id, 'batch_completed', {
          batchIndex: startIndex,
          successCount: results.successCount,
          failureCount: results.failureCount,
          processedItems: operation.processedItems
        });
      }

      this._updateProgress(operation);
      
    } catch (error) {
      this._handleBatchError(operation, error, startIndex);
    }
  }

  /**
   * Export a batch of data
   * @param {Object} operation - Operation
   * @param {Array} batch - Batch of data
   * @param {number} startIndex - Start index of batch
   */
  async _exportBatch(operation, batch, startIndex) {
    try {
      // Simulate export process
      const results = await this._simulateExport(batch, operation.config.format);
      
      operation.processedItems += batch.length;
      operation.successItems += results.successCount;
      operation.failedItems += results.failureCount;
      
      if (results.errors.length > 0) {
        operation.errors.push(...results.errors);
      }

      this._updateProgress(operation);
      
    } catch (error) {
      this._handleBatchError(operation, error, startIndex);
    }
  }

  /**
   * Update a batch of data
   * @param {Object} operation - Operation
   * @param {Array} batch - Batch of data
   * @param {number} startIndex - Start index of batch
   */
  async _updateBatch(operation, batch, startIndex) {
    try {
      // Simulate update process
      const results = await this._simulateUpdate(batch);
      
      operation.processedItems += batch.length;
      operation.successItems += results.successCount;
      operation.failedItems += results.failureCount;
      
      if (results.errors.length > 0) {
        operation.errors.push(...results.errors);
      }

      this._updateProgress(operation);
      
    } catch (error) {
      this._handleBatchError(operation, error, startIndex);
    }
  }

  /**
   * Delete a batch of data
   * @param {Object} operation - Operation
   * @param {Array} batch - Batch of data
   * @param {number} startIndex - Start index of batch
   */
  async _deleteBatch(operation, batch, startIndex) {
    try {
      // Simulate delete process
      const results = await this._simulateDelete(batch);
      
      operation.processedItems += batch.length;
      operation.successItems += results.successCount;
      operation.failedItems += results.failureCount;
      
      if (results.errors.length > 0) {
        operation.errors.push(...results.errors);
      }

      this._updateProgress(operation);
      
    } catch (error) {
      this._handleBatchError(operation, error, startIndex);
    }
  }

  /**
   * Update operation progress
   * @param {Object} operation - Operation
   */
  _updateProgress(operation) {
    const progress = Math.round((operation.processedItems / operation.totalItems) * 100);
    operation.progress = progress;
    
    // Calculate items per second
    const durationSeconds = (Date.now() - new Date(operation.startTime).getTime()) / 1000;
    operation.metadata.itemsPerSecond = durationSeconds > 0 
      ? Math.round(operation.processedItems / durationSeconds) 
      : 0;

    this.notifyListeners('operation_progress', operation);
  }

  /**
   * Update estimated duration
   * @param {Object} operation - Operation
   */
  _updateEstimatedDuration(operation) {
    const itemsPerSecond = 50; // Estimated rate
    const estimatedSeconds = Math.ceil(operation.totalItems / itemsPerSecond);
    operation.metadata.estimatedDuration = estimatedSeconds;
  }

  /**
   * Handle batch error with retry logic
   * @param {Object} operation - Operation
   * @param {Error} error - Error that occurred
   * @param {number} startIndex - Start index of failed batch
   */
  async _handleBatchError(operation, error, startIndex) {
    const retryAttempts = operation.config.retryAttempts || this.config.retryAttempts;
    
    if (operation.retryCount < retryAttempts) {
      operation.retryCount = (operation.retryCount || 0) + 1;
      
      // Wait before retry
      await this._delay(this.config.retryDelay);
      
      // Retry the operation
      this.notifyListeners('operation_retry', { 
        operationId: operation.id, 
        attempt: operation.retryCount,
        error: error.message 
      });
      
      return; // Let the main loop retry
    }

    // Max retries exceeded
    operation.errors.push({
      timestamp: new Date().toISOString(),
      message: `Batch failed after ${retryAttempts} retries: ${error.message}`,
      type: 'batch_error',
      startIndex,
      originalError: error
    });

    operation.failedItems += 1; // Count as failed
    this._updateProgress(operation);
  }

  /**
   * Handle operation error
   * @param {Object} operation - Operation
   * @param {Error} error - Error that occurred
   */
  _handleOperationError(operation, error) {
    operation.status = 'failed';
    operation.endTime = new Date().toISOString();
    operation.errors.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      type: 'operation_error'
    });

    this.notifyListeners('operation_failed', operation);
  }

  /**
   * Simulate import operation
   * @param {Array} data - Data to import
   * @returns {Object} Import results
   */
  async _simulateImport(data) {
    // Simulate processing time
    await this._delay(100);
    
    // Simulate some failures
    const failureRate = 0.05; // 5% failure rate
    const failures = Math.floor(data.length * failureRate);
    
    return {
      successCount: data.length - failures,
      failureCount: failures,
      errors: failures > 0 ? [
        {
          timestamp: new Date().toISOString(),
          message: `${failures} items failed to import`,
          type: 'import_error'
        }
      ] : []
    };
  }

  /**
   * Simulate export operation
   * @param {Array} data - Data to export
   * @param {string} format - Export format
   * @returns {Object} Export results
   */
  async _simulateExport(data, format) {
    await this._delay(50);
    
    return {
      successCount: data.length,
      failureCount: 0,
      errors: []
    };
  }

  /**
   * Simulate update operation
   * @param {Array} data - Data to update
   * @returns {Object} Update results
   */
  async _simulateUpdate(data) {
    await this._delay(75);
    
    const failureRate = 0.02; // 2% failure rate
    const failures = Math.floor(data.length * failureRate);
    
    return {
      successCount: data.length - failures,
      failureCount: failures,
      errors: failures > 0 ? [
        {
          timestamp: new Date().toISOString(),
          message: `${failures} items failed to update`,
          type: 'update_error'
        }
      ] : []
    };
  }

  /**
   * Simulate delete operation
   * @param {Array} data - Data to delete
   * @returns {Object} Delete results
   */
  async _simulateDelete(data) {
    await this._delay(50);
    
    return {
      successCount: data.length,
      failureCount: 0,
      errors: []
    };
  }

  /**
   * Fetch data for export
   * @param {Object} query - Query parameters
   * @returns {Array} Data to export
   */
  async _fetchDataForExport(query) {
    // This would typically make an API call
    // For now, return mock data
    await this._delay(200);
    return Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.random() * 100
    }));
  }

  /**
   * Fetch data for update
   * @param {Object} query - Query parameters
   * @returns {Array} Data to update
   */
  async _fetchDataForUpdate(query) {
    await this._delay(150);
    return Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.random() * 100
    }));
  }

  /**
   * Fetch data for delete
   * @param {Object} query - Query parameters
   * @returns {Array} Data to delete
   */
  async _fetchDataForDelete(query) {
    await this._delay(100);
    return Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`
    }));
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  _generateId() {
    return `bulk_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get operation by ID
   * @param {string} operationId - Operation ID
   * @returns {Object|null} Operation
   */
  getOperation(operationId) {
    return this.operations.get(operationId) || null;
  }

  /**
   * Get all operations
   * @returns {Array} All operations
   */
  getAllOperations() {
    return Array.from(this.operations.values());
  }

  /**
   * Get operations by status
   * @param {string} status - Operation status
   * @returns {Array} Operations with matching status
   */
  getOperationsByStatus(status) {
    return Array.from(this.operations.values()).filter(op => op.status === status);
  }

  /**
   * Get queue status
   * @returns {Object} Queue information
   */
  getQueueStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.queue.length,
      queuedOperations: this.queue.map(id => this.operations.get(id)),
      config: this.config
    };
  }

  /**
   * Cancel an operation
   * @param {string} operationId - Operation ID
   */
  async cancelOperation(operationId) {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (operation.status === 'running') {
      operation.status = 'cancelled';
      operation.endTime = new Date().toISOString();
      operation.duration = Date.now() - new Date(operation.startTime).getTime();
      
      // Remove from queue if it's there
      const queueIndex = this.queue.indexOf(operationId);
      if (queueIndex > -1) {
        this.queue.splice(queueIndex, 1);
      }
      
      this.notifyListeners('operation_cancelled', operation);
    } else if (operation.status === 'pending') {
      operation.status = 'cancelled';
      
      // Remove from queue
      const queueIndex = this.queue.indexOf(operationId);
      if (queueIndex > -1) {
        this.queue.splice(queueIndex, 1);
      }
      
      this.notifyListeners('operation_cancelled', operation);
    } else {
      throw new Error(`Cannot cancel operation ${operationId} in status: ${operation.status}`);
    }
  }

  /**
   * Clear completed operations
   */
  clearCompletedOperations() {
    const completedOps = Array.from(this.operations.entries())
      .filter(([id, op]) => op.status === 'completed' || op.status === 'failed' || op.status === 'cancelled');
    
    completedOps.forEach(([id]) => this.operations.delete(id));
    
    this.notifyListeners('completed_operations_cleared', { count: completedOps.length });
  }

  /**
   * Add listener for events
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
        console.error('Bulk operations listener error:', error);
      }
    });
  }
}

// Singleton instance
export const bulkOperationsManager = new BulkOperationsManager();
export default bulkOperationsManager;
