/**
 * DataValidationService - Core validation engine for data management
 * Provides configurable schema validation with support for common validation rules
 * Enhanced with bulk operations support and integration
 */

class DataValidationService {
  constructor() {
    this.schemas = new Map();
    this.validationResults = new Map();
    this.qualityMetrics = new Map();
    this.listeners = new Set();
    this.bulkValidationResults = new Map();
    this.validationSessions = new Map();
  }

  /**
   * Register a validation schema
   * @param {string} schemaId - Unique identifier for the schema
   * @param {Object} schema - Schema configuration
   */
  registerSchema(schemaId, schema) {
    this.schemas.set(schemaId, {
      ...schema,
      id: schemaId,
      createdAt: new Date().toISOString(),
      version: schema.version || '1.0.0'
    });
    this.notifyListeners('schema_registered', { schemaId, schema });
  }

  /**
   * Get registered schema
   * @param {string} schemaId - Schema identifier
   * @returns {Object|null} Schema configuration
   */
  getSchema(schemaId) {
    return this.schemas.get(schemaId) || null;
  }

  /**
   * Validate data against a schema
   * @param {string} schemaId - Schema identifier
   * @param {Object|Array} data - Data to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validate(schemaId, data, options = {}) {
    const schema = this.getSchema(schemaId);
    if (!schema) {
      throw new Error(`Schema '${schemaId}' not found`);
    }

    const startTime = performance.now();
    const result = this._validateData(schema, data, options);
    const duration = performance.now() - startTime;

    // Store validation result
    const validationResult = {
      ...result,
      schemaId,
      timestamp: new Date().toISOString(),
      duration,
      options
    };

    this._storeValidationResult(validationResult);
    this._updateQualityMetrics(schemaId, validationResult);

    return validationResult;
  }

  /**
   * Validate multiple datasets against the same schema
   * @param {string} schemaId - Schema identifier
   * @param {Array} datasets - Array of data to validate
   * @param {Object} options - Validation options
   * @returns {Array} Array of validation results
   */
  validateBatch(schemaId, datasets, options = {}) {
    return datasets.map((data, index) => ({
      ...this.validate(schemaId, data, options),
      batchIndex: index
    }));
  }

  /**
   * Validate data in bulk with progress tracking
   * @param {string} schemaId - Schema identifier
   * @param {Array} datasets - Array of data to validate
   * @param {Object} options - Validation options
   * @param {Function} progressCallback - Progress callback function
   * @returns {Object} Bulk validation results
   */
  async validateBulk(schemaId, datasets, options = {}, progressCallback = null) {
    const sessionId = this._generateSessionId();
    
    const session = {
      sessionId,
      schemaId,
      totalItems: datasets.length,
      processedItems: 0,
      startTime: new Date().toISOString(),
      status: 'running'
    };

    this.validationSessions.set(sessionId, session);

    const results = [];
    const errors = [];
    const warnings = [];
    let validCount = 0;
    let invalidCount = 0;
    let warningCount = 0;

    // Process in batches for better performance
    const batchSize = options.batchSize || 50;
    
    for (let i = 0; i < datasets.length; i += batchSize) {
      const batch = datasets.slice(i, i + batchSize);
      
      // Validate batch
      const batchResults = batch.map((data, batchIndex) => {
        const result = this.validate(schemaId, data, options);
        return {
          ...result,
          globalIndex: i + batchIndex,
          batchIndex
        };
      });

      results.push(...batchResults);

      // Count results
      batchResults.forEach(result => {
        if (result.status === 'valid') {
          validCount++;
        } else if (result.status === 'invalid') {
          invalidCount++;
          errors.push(...result.errors);
        } else {
          warningCount++;
          warnings.push(...result.warnings);
        }
      });

      // Update session progress
      session.processedItems = Math.min(i + batchSize, datasets.length);
      session.status = session.processedItems === datasets.length ? 'completed' : 'running';

      // Call progress callback
      if (progressCallback) {
        const progress = Math.round((session.processedItems / session.totalItems) * 100);
        progressCallback({
          sessionId,
          progress,
          processed: session.processedItems,
          total: session.totalItems,
          validCount,
          invalidCount,
          warningCount,
          currentBatch: batchResults
        });
      }

      // Small delay to prevent blocking UI
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Store bulk results
    const bulkResults = {
      sessionId,
      schemaId,
      totalItems: datasets.length,
      validItems: validCount,
      invalidItems: invalidCount,
      warningItems: warningCount,
      errors,
      warnings,
      results,
      summary: {
        validRate: datasets.length > 0 ? Math.round((validCount / datasets.length) * 100) : 0,
        invalidRate: datasets.length > 0 ? Math.round((invalidCount / datasets.length) * 100) : 0,
        warningRate: datasets.length > 0 ? Math.round((warningCount / datasets.length) * 100) : 0,
        errorCount: errors.length,
        warningCount: warnings.length
      },
      duration: Date.now() - new Date(session.startTime).getTime()
    };

    this.bulkValidationResults.set(sessionId, bulkResults);
    session.status = 'completed';
    session.endTime = new Date().toISOString();

    this.notifyListeners('bulk_validation_completed', {
      sessionId,
      schemaId,
      summary: bulkResults.summary
    });

    return bulkResults;
  }

  /**
   * Validate data with bulk operation integration
   * @param {string} schemaId - Schema identifier
   * @param {Object|Array} data - Data to validate
   * @param {Object} options - Validation options
   * @param {string} bulkOperationId - Bulk operation ID for integration
   * @returns {Object} Validation result
   */
  validateWithBulkIntegration(schemaId, data, options = {}, bulkOperationId = null) {
    const result = this.validate(schemaId, data, options);
    
    // If part of a bulk operation, store additional metadata
    if (bulkOperationId) {
      result.bulkOperationId = bulkOperationId;
      result.validationTimestamp = new Date().toISOString();
    }

    return result;
  }

  /**
   * Pre-validate data for bulk operations with detailed reporting
   * @param {string} schemaId - Schema identifier
   * @param {Array} datasets - Data to pre-validate
   * @param {Object} options - Validation options
   * @returns {Object} Pre-validation report
   */
  async preValidateForBulkOperation(schemaId, datasets, options = {}) {
    const report = {
      schemaId,
      totalItems: datasets.length,
      validItems: 0,
      invalidItems: 0,
      warningItems: 0,
      errors: [],
      warnings: [],
      fieldErrors: {},
      criticalErrors: [],
      recommendations: [],
      canProceed: true
    };

    // Validate each item and collect detailed information
    for (let i = 0; i < datasets.length; i++) {
      const result = this.validate(schemaId, datasets[i], options);
      
      if (result.status === 'valid') {
        report.validItems++;
      } else if (result.status === 'invalid') {
        report.invalidItems++;
        report.errors.push({
          index: i,
          errors: result.errors
        });

        // Track field-specific errors
        result.errors.forEach(error => {
          if (!report.fieldErrors[error.field]) {
            report.fieldErrors[error.field] = 0;
          }
          report.fieldErrors[error.field]++;
        });

        // Check for critical errors
        const critical = result.errors.filter(err =>
          err.code === 'REQUIRED_FIELD_MISSING' ||
          err.code === 'INVALID_TYPE'
        );
        
        if (critical.length > 0) {
          report.criticalErrors.push({
            index: i,
            errors: critical
          });
        }
      } else {
        report.warningItems++;
        report.warnings.push({
          index: i,
          warnings: result.warnings
        });
      }
    }

    // Generate recommendations
    if (report.invalidItems > 0) {
      report.recommendations.push({
        type: 'data_cleaning',
        message: `Found ${report.invalidItems} invalid items. Consider cleaning the data before bulk operation.`,
        priority: 'high'
      });
    }

    if (Object.keys(report.fieldErrors).length > 0) {
      const mostErrorField = Object.keys(report.fieldErrors).reduce((a, b) =>
        report.fieldErrors[a] > report.fieldErrors[b] ? a : b
      );
      report.recommendations.push({
        type: 'field_validation',
        message: `Field '${mostErrorField}' has the most errors (${report.fieldErrors[mostErrorField]}). Review validation rules.`,
        priority: 'medium'
      });
    }

    // Determine if operation can proceed
    const invalidRate = report.totalItems > 0 ? (report.invalidItems / report.totalItems) : 0;
    report.canProceed = invalidRate < 0.1; // Allow if less than 10% invalid

    if (!report.canProceed) {
      report.recommendations.push({
        type: 'operation_blocked',
        message: 'Too many invalid items. Operation blocked.',
        priority: 'critical'
      });
    }

    return report;
  }

  /**
   * Get validation results for a schema
   * @param {string} schemaId - Schema identifier
   * @param {Object} filters - Filter options
   * @returns {Array} Validation results
   */
  getValidationResults(schemaId, filters = {}) {
    const results = Array.from(this.validationResults.values())
      .filter(result => result.schemaId === schemaId);

    if (filters.status) {
      return results.filter(r => r.status === filters.status);
    }

    return results;
  }

  /**
   * Get data quality metrics for a schema
   * @param {string} schemaId - Schema identifier
   * @returns {Object} Quality metrics
   */
  getQualityMetrics(schemaId) {
    return this.qualityMetrics.get(schemaId) || this._calculateDefaultMetrics();
  }

  /**
   * Clear validation results for a schema
   * @param {string} schemaId - Schema identifier
   */
  clearResults(schemaId) {
    for (const [key, result] of this.validationResults.entries()) {
      if (result.schemaId === schemaId) {
        this.validationResults.delete(key);
      }
    }
    this.notifyListeners('results_cleared', { schemaId });
  }

  /**
   * Clear bulk validation results
   * @param {string} sessionId - Validation session ID
   */
  clearBulkResults(sessionId) {
    this.bulkValidationResults.delete(sessionId);
    this.validationSessions.delete(sessionId);
    this.notifyListeners('bulk_results_cleared', { sessionId });
  }

  /**
   * Get bulk validation results for a session
   * @param {string} sessionId - Validation session ID
   * @returns {Object} Bulk validation results
   */
  getBulkValidationResults(sessionId) {
    return this.bulkValidationResults.get(sessionId) || {
      sessionId,
      totalItems: 0,
      validItems: 0,
      invalidItems: 0,
      warningItems: 0,
      errors: [],
      warnings: [],
      results: [],
      summary: {}
    };
  }

  /**
   * Get validation session info
   * @param {string} sessionId - Validation session ID
   * @returns {Object} Session information
   */
  getValidationSession(sessionId) {
    return this.validationSessions.get(sessionId);
  }

  /**
   * List all validation sessions
   * @returns {Array} Array of validation sessions
   */
  listValidationSessions() {
    return Array.from(this.validationSessions.values());
  }

  /**
   * Add validation listener
   * @param {Function} callback - Listener callback
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove validation listener
   * @param {Function} callback - Listener callback
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // Private methods

  _validateData(schema, data, options) {
    const errors = [];
    const warnings = [];
    const context = { path: '', data, schema, options };

    // Validate required fields
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach(field => {
        if (!(field in data)) {
          errors.push({
            field,
            code: 'REQUIRED_FIELD_MISSING',
            message: `Required field '${field}' is missing`,
            path: field
          });
        }
      });
    }

    // Validate field rules
    if (schema.fields) {
      Object.entries(schema.fields).forEach(([field, rules]) => {
        const fieldValue = data[field];
        const fieldPath = context.path ? `${context.path}.${field}` : field;

        if (fieldValue !== undefined || rules.required) {
          const fieldContext = { ...context, path: fieldPath, field, value: fieldValue };

          // Apply validation rules
          const fieldErrors = this._validateField(fieldValue, rules, fieldContext);
          errors.push(...fieldErrors);

          // Check for warnings
          const fieldWarnings = this._checkFieldWarnings(fieldValue, rules, fieldContext);
          warnings.push(...fieldWarnings);
        }
      });
    }

    // Custom validation functions
    if (schema.customValidations && Array.isArray(schema.customValidations)) {
      schema.customValidations.forEach(validation => {
        try {
          const customResult = validation.validate(data, context);
          if (customResult && customResult.errors) {
            errors.push(...customResult.errors.map(err => ({
              ...err,
              path: err.path || context.path
            })));
          }
          if (customResult && customResult.warnings) {
            warnings.push(...customResult.warnings.map(warn => ({
              ...warn,
              path: warn.path || context.path
            })));
          }
        } catch (error) {
          errors.push({
            code: 'CUSTOM_VALIDATION_ERROR',
            message: `Custom validation failed: ${error.message}`,
            path: context.path
          });
        }
      });
    }

    const isValid = errors.length === 0;
    const status = isValid ? 'valid' : (warnings.length > 0 ? 'warnings' : 'invalid');

    return {
      status,
      isValid,
      errors,
      warnings,
      data,
      schemaId: schema.id
    };
  }

  _validateField(value, rules, context) {
    const errors = [];

    // Type validation
    if (rules.type) {
      const typeError = this._validateType(value, rules.type, context);
      if (typeError) errors.push(typeError);
    }

    // Format validation (regex patterns)
    if (rules.format && value !== null && value !== undefined) {
      const formatError = this._validateFormat(value, rules.format, context);
      if (formatError) errors.push(formatError);
    }

    // Range validation
    if (rules.range && (rules.type === 'number' || rules.type === 'date')) {
      const rangeError = this._validateRange(value, rules.range, context);
      if (rangeError) errors.push(rangeError);
    }

    // Enum validation
    if (rules.enum && Array.isArray(rules.enum)) {
      const enumError = this._validateEnum(value, rules.enum, context);
      if (enumError) errors.push(enumError);
    }

    // Length validation
    if (rules.length && typeof value === 'string') {
      const lengthError = this._validateLength(value, rules.length, context);
      if (lengthError) errors.push(lengthError);
    }

    // Custom field validation
    if (rules.custom && typeof rules.custom === 'function') {
      try {
        const customResult = rules.custom(value, context);
        if (customResult && customResult.error) {
          errors.push({
            ...customResult.error,
            path: context.path
          });
        }
      } catch (error) {
        errors.push({
          field: context.field,
          code: 'CUSTOM_FIELD_VALIDATION_ERROR',
          message: `Custom field validation failed: ${error.message}`,
          path: context.path
        });
      }
    }

    return errors;
  }

  _checkFieldWarnings(value, rules, context) {
    const warnings = [];

    // Check for deprecated fields
    if (rules.deprecated) {
      warnings.push({
        field: context.field,
        code: 'DEPRECATED_FIELD',
        message: `Field '${context.field}' is deprecated: ${rules.deprecated.reason || ''}`,
        path: context.path
      });
    }

    // Check for potential issues
    if (rules.warnIf && typeof rules.warnIf === 'function') {
      try {
        const warnResult = rules.warnIf(value, context);
        if (warnResult) {
          warnings.push({
            field: context.field,
            code: 'FIELD_WARNING',
            message: typeof warnResult === 'string' ? warnResult : 'Potential issue detected',
            path: context.path
          });
        }
      } catch (error) {
        warnings.push({
          field: context.field,
          code: 'WARNING_CHECK_ERROR',
          message: `Warning check failed: ${error.message}`,
          path: context.path
        });
      }
    }

    return warnings;
  }

  _validateType(value, expectedType, context) {
    if (value === null || value === undefined) {
      return null; // Let other rules handle null/undefined
    }

    let actualType = typeof value;

    // Handle special types
    if (Array.isArray(value)) {
      actualType = 'array';
    } else if (value instanceof Date) {
      actualType = 'date';
    }

    if (actualType !== expectedType) {
      return {
        field: context.field,
        code: 'INVALID_TYPE',
        message: `Expected type '${expectedType}', got '${actualType}'`,
        path: context.path,
        expected: expectedType,
        actual: actualType
      };
    }

    return null;
  }

  _validateFormat(value, format, context) {
    if (typeof value !== 'string') {
      return null;
    }

    let regex;
    if (typeof format === 'string') {
      // Common format patterns
      const patterns = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        url: /^https?:\/\/.+\..+/,
        phone: /^\+?[\d\s\-\(\)]{10,}$/,
        uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        date: /^\d{4}-\d{2}-\d{2}$/,
        time: /^\d{2}:\d{2}(:\d{2})?$/,
        datetime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z?$/
      };
      regex = patterns[format.toLowerCase()];
    } else if (format instanceof RegExp) {
      regex = format;
    }

    if (!regex || !regex.test(value)) {
      return {
        field: context.field,
        code: 'INVALID_FORMAT',
        message: `Value does not match expected format '${format}'`,
        path: context.path,
        format: format.toString()
      };
    }

    return null;
  }

  _validateRange(value, range, context) {
    if (value === null || value === undefined) {
      return null;
    }

    let minValue, maxValue;

    if (typeof range === 'object') {
      minValue = range.min;
      maxValue = range.max;
    } else if (Array.isArray(range) && range.length === 2) {
      minValue = range[0];
      maxValue = range[1];
    }

    if (minValue !== undefined && value < minValue) {
      return {
        field: context.field,
        code: 'VALUE_TOO_LOW',
        message: `Value ${value} is below minimum ${minValue}`,
        path: context.path,
        min: minValue,
        actual: value
      };
    }

    if (maxValue !== undefined && value > maxValue) {
      return {
        field: context.field,
        code: 'VALUE_TOO_HIGH',
        message: `Value ${value} is above maximum ${maxValue}`,
        path: context.path,
        max: maxValue,
        actual: value
      };
    }

    return null;
  }

  _validateEnum(value, enumValues, context) {
    if (!enumValues.includes(value)) {
      return {
        field: context.field,
        code: 'INVALID_ENUM',
        message: `Value '${value}' is not in allowed values: [${enumValues.join(', ')}]`,
        path: context.path,
        allowed: enumValues,
        actual: value
      };
    }

    return null;
  }

  _validateLength(value, lengthRules, context) {
    if (typeof value !== 'string') {
      return null;
    }

    let minLength, maxLength;

    if (typeof lengthRules === 'number') {
      minLength = maxLength = lengthRules;
    } else if (typeof lengthRules === 'object') {
      minLength = lengthRules.min;
      maxLength = lengthRules.max;
    }

    if (minLength !== undefined && value.length < minLength) {
      return {
        field: context.field,
        code: 'STRING_TOO_SHORT',
        message: `String length ${value.length} is below minimum ${minLength}`,
        path: context.path,
        min: minLength,
        actual: value.length
      };
    }

    if (maxLength !== undefined && value.length > maxLength) {
      return {
        field: context.field,
        code: 'STRING_TOO_LONG',
        message: `String length ${value.length} exceeds maximum ${maxLength}`,
        path: context.path,
        max: maxLength,
        actual: value.length
      };
    }

    return null;
  }

  _storeValidationResult(result) {
    const key = `${result.schemaId}_${result.timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    this.validationResults.set(key, result);
    this.notifyListeners('validation_completed', result);
  }

  _updateQualityMetrics(schemaId, validationResult) {
    let metrics = this.qualityMetrics.get(schemaId);
    if (!metrics) {
      metrics = this._calculateDefaultMetrics();
    }

    // Update metrics
    metrics.totalValidations++;
    if (validationResult.status === 'valid') {
      metrics.validRecords++;
    } else if (validationResult.status === 'invalid') {
      metrics.invalidRecords++;
    } else {
      metrics.warningRecords++;
    }

    metrics.errorCount += validationResult.errors.length;
    metrics.warningCount += validationResult.warnings.length;

    // Calculate quality score (0-100)
    const totalIssues = validationResult.errors.length + (validationResult.warnings.length * 0.1);
    const maxPossibleIssues = Object.keys(validationResult.data || {}).length * 2; // Rough estimate
    const issueRatio = Math.min(totalIssues / maxPossibleIssues, 1);
    metrics.qualityScore = Math.max(0, Math.round(100 - (issueRatio * 100)));

    metrics.lastUpdated = new Date().toISOString();
    this.qualityMetrics.set(schemaId, metrics);

    this.notifyListeners('metrics_updated', { schemaId, metrics });
  }

  _calculateDefaultMetrics() {
    return {
      totalValidations: 0,
      validRecords: 0,
      invalidRecords: 0,
      warningRecords: 0,
      errorCount: 0,
      warningCount: 0,
      qualityScore: 100,
      lastUpdated: new Date().toISOString()
    };
  }

  _notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Validation listener error:', error);
      }
    });
  }

  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const dataValidationService = new DataValidationService();
export default dataValidationService;
