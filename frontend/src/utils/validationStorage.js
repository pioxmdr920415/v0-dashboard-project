/**
 * validationStorage.js - IndexedDB storage for validation results and configurations
 * Provides persistent storage for validation schemas, results, and quality metrics
 */

import { openDB } from 'idb';

const DB_NAME = 'data-validation-db';
const DB_VERSION = 1;
const STORES = {
  SCHEMAS: 'schemas',
  RESULTS: 'validation_results',
  METRICS: 'quality_metrics',
  CONFIGS: 'validation_configs'
};

/**
 * Initialize IndexedDB database
 */
async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Schemas store
      if (!db.objectStoreNames.contains(STORES.SCHEMAS)) {
        const schemaStore = db.createObjectStore(STORES.SCHEMAS, { keyPath: 'id' });
        schemaStore.createIndex('name', 'name', { unique: false });
        schemaStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Validation results store
      if (!db.objectStoreNames.contains(STORES.RESULTS)) {
        const resultStore = db.createObjectStore(STORES.RESULTS, { keyPath: 'id' });
        resultStore.createIndex('schemaId', 'schemaId', { unique: false });
        resultStore.createIndex('timestamp', 'timestamp', { unique: false });
        resultStore.createIndex('status', 'status', { unique: false });
      }

      // Quality metrics store
      if (!db.objectStoreNames.contains(STORES.METRICS)) {
        const metricsStore = db.createObjectStore(STORES.METRICS, { keyPath: 'schemaId' });
        metricsStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      // Configurations store
      if (!db.objectStoreNames.contains(STORES.CONFIGS)) {
        const configStore = db.createObjectStore(STORES.CONFIGS, { keyPath: 'key' });
      }
    }
  });
}

/**
 * Schema Storage Operations
 */
export const schemaStorage = {
  /**
   * Save schema to IndexedDB
   * @param {Object} schema - Schema object
   */
  async saveSchema(schema) {
    const db = await initDB();
    return db.put(STORES.SCHEMAS, {
      ...schema,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Get schema by ID
   * @param {string} schemaId - Schema identifier
   * @returns {Object|null} Schema object
   */
  async getSchema(schemaId) {
    const db = await initDB();
    return db.get(STORES.SCHEMAS, schemaId);
  },

  /**
   * Get all schemas
   * @returns {Array} Array of schema objects
   */
  async getAllSchemas() {
    const db = await initDB();
    return db.getAll(STORES.SCHEMAS);
  },

  /**
   * Delete schema by ID
   * @param {string} schemaId - Schema identifier
   */
  async deleteSchema(schemaId) {
    const db = await initDB();
    return db.delete(STORES.SCHEMAS, schemaId);
  },

  /**
   * Clear all schemas
   */
  async clearSchemas() {
    const db = await initDB();
    return db.clear(STORES.SCHEMAS);
  }
};

/**
 * Validation Results Storage Operations
 */
export const resultStorage = {
  /**
   * Save validation result
   * @param {Object} result - Validation result object
   */
  async saveResult(result) {
    const db = await initDB();
    const id = `${result.schemaId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return db.put(STORES.RESULTS, {
      ...result,
      id,
      timestamp: result.timestamp || new Date().toISOString()
    });
  },

  /**
   * Get validation results by schema ID
   * @param {string} schemaId - Schema identifier
   * @param {Object} options - Query options
   * @returns {Array} Array of validation results
   */
  async getResultsBySchema(schemaId, options = {}) {
    const db = await initDB();
    const tx = db.transaction(STORES.RESULTS, 'readonly');
    const index = tx.store.index('schemaId');
    
    let results = await index.getAll(schemaId);
    
    // Apply filters
    if (options.status) {
      results = results.filter(r => r.status === options.status);
    }
    
    if (options.dateRange) {
      const cutoff = getDateCutoff(options.dateRange);
      results = results.filter(r => new Date(r.timestamp) >= cutoff);
    }
    
    // Sort by timestamp descending
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  },

  /**
   * Get latest validation results
   * @param {number} limit - Number of results to return
   * @returns {Array} Array of latest validation results
   */
  async getLatestResults(limit = 100) {
    const db = await initDB();
    const tx = db.transaction(STORES.RESULTS, 'readonly');
    const index = tx.store.index('timestamp');
    
    const results = await index.getAll();
    return results
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  },

  /**
   * Delete validation results by schema ID
   * @param {string} schemaId - Schema identifier
   */
  async deleteResultsBySchema(schemaId) {
    const db = await initDB();
    const tx = db.transaction(STORES.RESULTS, 'readwrite');
    const index = tx.store.index('schemaId');
    
    const keys = await index.getAllKeys(schemaId);
    for (const key of keys) {
      await tx.store.delete(key);
    }
    
    return tx.done;
  },

  /**
   * Clear all validation results
   */
  async clearResults() {
    const db = await initDB();
    return db.clear(STORES.RESULTS);
  },

  /**
   * Get validation statistics
   * @param {string} schemaId - Schema identifier
   * @returns {Object} Validation statistics
   */
  async getStatistics(schemaId) {
    const results = await this.getResultsBySchema(schemaId);
    
    if (results.length === 0) {
      return {
        total: 0,
        valid: 0,
        invalid: 0,
        warnings: 0,
        errorCount: 0,
        warningCount: 0,
        averageDuration: 0,
        lastValidation: null
      };
    }

    const valid = results.filter(r => r.status === 'valid').length;
    const invalid = results.filter(r => r.status === 'invalid').length;
    const warnings = results.filter(r => r.status === 'warnings').length;
    const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0);
    const warningCount = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const averageDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;
    const lastValidation = results[0].timestamp;

    return {
      total: results.length,
      valid,
      invalid,
      warnings,
      errorCount,
      warningCount,
      averageDuration,
      lastValidation
    };
  }
};

/**
 * Quality Metrics Storage Operations
 */
export const metricsStorage = {
  /**
   * Save quality metrics
   * @param {string} schemaId - Schema identifier
   * @param {Object} metrics - Quality metrics object
   */
  async saveMetrics(schemaId, metrics) {
    const db = await initDB();
    return db.put(STORES.METRICS, {
      ...metrics,
      schemaId,
      lastUpdated: new Date().toISOString()
    });
  },

  /**
   * Get quality metrics by schema ID
   * @param {string} schemaId - Schema identifier
   * @returns {Object|null} Quality metrics object
   */
  async getMetrics(schemaId) {
    const db = await initDB();
    return db.get(STORES.METRICS, schemaId);
  },

  /**
   * Get all quality metrics
   * @returns {Array} Array of quality metrics objects
   */
  async getAllMetrics() {
    const db = await initDB();
    return db.getAll(STORES.METRICS);
  },

  /**
   * Update quality metrics
   * @param {string} schemaId - Schema identifier
   * @param {Object} updates - Metrics updates
   */
  async updateMetrics(schemaId, updates) {
    const currentMetrics = await this.getMetrics(schemaId);
    const newMetrics = {
      ...currentMetrics,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    return this.saveMetrics(schemaId, newMetrics);
  },

  /**
   * Clear all quality metrics
   */
  async clearMetrics() {
    const db = await initDB();
    return db.clear(STORES.METRICS);
  }
};

/**
 * Configuration Storage Operations
 */
export const configStorage = {
  /**
   * Save configuration
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   */
  async saveConfig(key, value) {
    const db = await initDB();
    return db.put(STORES.CONFIGS, {
      key,
      value,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Get configuration by key
   * @param {string} key - Configuration key
   * @returns {any} Configuration value
   */
  async getConfig(key) {
    const db = await initDB();
    const config = await db.get(STORES.CONFIGS, key);
    return config ? config.value : null;
  },

  /**
   * Get all configurations
   * @returns {Object} Object with all configuration key-value pairs
   */
  async getAllConfigs() {
    const db = await initDB();
    const configs = await db.getAll(STORES.CONFIGS);
    return configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});
  },

  /**
   * Delete configuration by key
   * @param {string} key - Configuration key
   */
  async deleteConfig(key) {
    const db = await initDB();
    return db.delete(STORES.CONFIGS, key);
  },

  /**
   * Clear all configurations
   */
  async clearConfigs() {
    const db = await initDB();
    return db.clear(STORES.CONFIGS);
  }
};

/**
 * Utility functions
 */
function getDateCutoff(dateRange) {
  const now = new Date();
  const cutoff = new Date();
  
  switch (dateRange) {
    case '1h':
      cutoff.setHours(now.getHours() - 1);
      break;
    case '24h':
      cutoff.setDate(now.getDate() - 1);
      break;
    case '7d':
      cutoff.setDate(now.getDate() - 7);
      break;
    case '30d':
      cutoff.setDate(now.getDate() - 30);
      break;
    default:
      return new Date(0); // Beginning of time
  }
  
  return cutoff;
}

/**
 * Bulk operations
 */
export const bulkOperations = {
  /**
   * Export all validation data
   * @returns {Object} Exported data object
   */
  async exportAllData() {
    const schemas = await schemaStorage.getAllSchemas();
    const results = await resultStorage.getLatestResults(1000); // Limit to prevent memory issues
    const metrics = await metricsStorage.getAllMetrics();
    const configs = await configStorage.getAllConfigs();
    
    return {
      schemas,
      results,
      metrics,
      configs,
      exportDate: new Date().toISOString(),
      version: DB_VERSION
    };
  },

  /**
   * Import validation data
   * @param {Object} data - Data to import
   */
  async importData(data) {
    const db = await initDB();
    const tx = db.transaction([
      STORES.SCHEMAS,
      STORES.RESULTS,
      STORES.METRICS,
      STORES.CONFIGS
    ], 'readwrite');

    // Import schemas
    if (data.schemas && Array.isArray(data.schemas)) {
      for (const schema of data.schemas) {
        await tx.store(STORES.SCHEMAS).put(schema);
      }
    }

    // Import results
    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results) {
        await tx.store(STORES.RESULTS).put(result);
      }
    }

    // Import metrics
    if (data.metrics && Array.isArray(data.metrics)) {
      for (const metric of data.metrics) {
        await tx.store(STORES.METRICS).put(metric);
      }
    }

    // Import configs
    if (data.configs && typeof data.configs === 'object') {
      for (const [key, value] of Object.entries(data.configs)) {
        await tx.store(STORES.CONFIGS).put({ key, value });
      }
    }

    return tx.done;
  },

  /**
   * Clear all validation data
   */
  async clearAllData() {
    const db = await initDB();
    const tx = db.transaction([
      STORES.SCHEMAS,
      STORES.RESULTS,
      STORES.METRICS,
      STORES.CONFIGS
    ], 'readwrite');

    await tx.store(STORES.SCHEMAS).clear();
    await tx.store(STORES.RESULTS).clear();
    await tx.store(STORES.METRICS).clear();
    await tx.store(STORES.CONFIGS).clear();

    return tx.done;
  }
};

/**
 * Database maintenance
 */
export const dbMaintenance = {
  /**
   * Clean up old validation results
   * @param {number} maxAgeDays - Maximum age in days
   */
  async cleanupOldResults(maxAgeDays = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);

    const db = await initDB();
    const tx = db.transaction(STORES.RESULTS, 'readwrite');
    const index = tx.store.index('timestamp');

    const oldKeys = await index.getAllKeys(IDBKeyRange.upperBound(cutoff.toISOString()));
    
    for (const key of oldKeys) {
      await tx.store.delete(key);
    }

    return tx.done;
  },

  /**
   * Get database statistics
   * @returns {Object} Database statistics
   */
  async getDBStats() {
    const db = await initDB();
    
    const schemaCount = await db.count(STORES.SCHEMAS);
    const resultCount = await db.count(STORES.RESULTS);
    const metricsCount = await db.count(STORES.METRICS);
    const configCount = await db.count(STORES.CONFIGS);

    return {
      schemas: schemaCount,
      results: resultCount,
      metrics: metricsCount,
      configs: configCount,
      totalRecords: schemaCount + resultCount + metricsCount + configCount
    };
  }
};

export default {
  schemaStorage,
  resultStorage,
  metricsStorage,
  configStorage,
  bulkOperations,
  dbMaintenance
};
