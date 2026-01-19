/**
 * ValidationConfigManager - Manages validation schemas and configurations
 * Provides a centralized system for creating, storing, and managing validation schemas
 */

import { dataValidationService } from './DataValidationService';

class ValidationConfigManager {
  constructor() {
    this.configStorageKey = 'validation_configs';
    this.defaultSchemas = new Map();
    this.loadDefaultSchemas();
  }

  /**
   * Load default schemas for common data types
   */
  loadDefaultSchemas() {
    // Google Sheets schema template
    this.defaultSchemas.set('google_sheets', {
      name: 'Google Sheets Data',
      description: 'Validation schema for Google Sheets data',
      version: '1.0.0',
      fields: {
        id: {
          type: 'string',
          required: true,
          format: 'uuid',
          description: 'Unique identifier for the record'
        },
        timestamp: {
          type: 'string',
          required: true,
          format: 'datetime',
          description: 'Record creation timestamp'
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'pending', 'archived'],
          description: 'Record status'
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'Email address'
        },
        phone: {
          type: 'string',
          format: 'phone',
          description: 'Phone number'
        },
        name: {
          type: 'string',
          length: { min: 2, max: 100 },
          description: 'Name field'
        },
        age: {
          type: 'number',
          range: { min: 0, max: 120 },
          description: 'Age in years'
        }
      },
      customValidations: [
        {
          name: 'email_uniqueness',
          validate: (data, context) => {
            // This would typically check against a database
            return { errors: [], warnings: [] };
          }
        }
      ]
    });

    // Google Drive schema template
    this.defaultSchemas.set('google_drive', {
      name: 'Google Drive Files',
      description: 'Validation schema for Google Drive file metadata',
      version: '1.0.0',
      fields: {
        id: {
          type: 'string',
          required: true,
          description: 'File ID'
        },
        name: {
          type: 'string',
          required: true,
          length: { min: 1, max: 255 },
          description: 'File name'
        },
        mimeType: {
          type: 'string',
          required: true,
          enum: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'text/plain',
            'application/msword',
            'application/vnd.google-apps.document'
          ],
          description: 'File MIME type'
        },
        size: {
          type: 'number',
          range: { min: 0, max: 1000000000 }, // 1GB max
          description: 'File size in bytes'
        },
        createdTime: {
          type: 'string',
          format: 'datetime',
          description: 'File creation time'
        },
        modifiedTime: {
          type: 'string',
          format: 'datetime',
          description: 'File last modification time'
        }
      ]
    });

    // User data schema template
    this.defaultSchemas.set('user_data', {
      name: 'User Information',
      description: 'Validation schema for user data',
      version: '1.0.0',
      fields: {
        userId: {
          type: 'string',
          required: true,
          format: 'uuid',
          description: 'Unique user identifier'
        },
        username: {
          type: 'string',
          required: true,
          length: { min: 3, max: 50 },
          format: /^[a-zA-Z0-9_]+$/,
          description: 'Username (alphanumeric and underscores only)'
        },
        email: {
          type: 'string',
          required: true,
          format: 'email',
          description: 'User email address'
        },
        firstName: {
          type: 'string',
          required: true,
          length: { min: 1, max: 50 },
          description: 'User first name'
        },
        lastName: {
          type: 'string',
          required: true,
          length: { min: 1, max: 50 },
          description: 'User last name'
        },
        dateOfBirth: {
          type: 'string',
          format: 'date',
          custom: (value, context) => {
            if (value) {
              const birthDate = new Date(value);
              const today = new Date();
              const age = today.getFullYear() - birthDate.getFullYear();
              
              if (age < 13) {
                return {
                  error: {
                    code: 'MINIMUM_AGE_REQUIREMENT',
                    message: 'User must be at least 13 years old'
                  }
                };
              }
            }
            return null;
          },
          description: 'User date of birth (YYYY-MM-DD format)'
        },
        role: {
          type: 'string',
          enum: ['admin', 'user', 'guest', 'moderator'],
          required: true,
          description: 'User role'
        },
        isActive: {
          type: 'boolean',
          description: 'Whether user account is active'
        }
      },
      customValidations: [
        {
          name: 'password_complexity',
          validate: (data, context) => {
            const errors = [];
            const warnings = [];
            
            if (data.password) {
              if (data.password.length < 8) {
                errors.push({
                  field: 'password',
                  code: 'PASSWORD_TOO_SHORT',
                  message: 'Password must be at least 8 characters long'
                });
              }
              
              if (!/(?=.*[a-z])/.test(data.password)) {
                warnings.push({
                  field: 'password',
                  code: 'PASSWORD_LOW_COMPLEXITY',
                  message: 'Password should contain lowercase letters'
                });
              }
              
              if (!/(?=.*[A-Z])/.test(data.password)) {
                warnings.push({
                  field: 'password',
                  code: 'PASSWORD_LOW_COMPLEXITY',
                  message: 'Password should contain uppercase letters'
                });
              }
              
              if (!/(?=.*\d)/.test(data.password)) {
                warnings.push({
                  field: 'password',
                  code: 'PASSWORD_LOW_COMPLEXITY',
                  message: 'Password should contain numbers'
                });
              }
            }
            
            return { errors, warnings };
          }
        }
      ]
    });
  }

  /**
   * Create a new validation schema
   * @param {string} schemaId - Unique identifier for the schema
   * @param {Object} schemaConfig - Schema configuration
   * @returns {Object} Created schema
   */
  createSchema(schemaId, schemaConfig) {
    const schema = {
      ...schemaConfig,
      id: schemaId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: schemaConfig.version || '1.0.0'
    };

    dataValidationService.registerSchema(schemaId, schema);
    this.saveToStorage();
    
    return schema;
  }

  /**
   * Update an existing schema
   * @param {string} schemaId - Schema identifier
   * @param {Object} updates - Schema updates
   * @returns {Object} Updated schema
   */
  updateSchema(schemaId, updates) {
    const existingSchema = dataValidationService.getSchema(schemaId);
    if (!existingSchema) {
      throw new Error(`Schema '${schemaId}' not found`);
    }

    const updatedSchema = {
      ...existingSchema,
      ...updates,
      updatedAt: new Date().toISOString(),
      version: updates.version || existingSchema.version
    };

    dataValidationService.registerSchema(schemaId, updatedSchema);
    this.saveToStorage();
    
    return updatedSchema;
  }

  /**
   * Get a schema by ID
   * @param {string} schemaId - Schema identifier
   * @returns {Object|null} Schema configuration
   */
  getSchema(schemaId) {
    return dataValidationService.getSchema(schemaId);
  }

  /**
   * Get all registered schemas
   * @returns {Array} Array of schemas
   */
  getAllSchemas() {
    const schemas = Array.from(dataValidationService.schemas.entries())
      .map(([id, schema]) => ({
        id,
        name: schema.name || id,
        description: schema.description || '',
        version: schema.version || '1.0.0',
        fields: Object.keys(schema.fields || {}),
        createdAt: schema.createdAt,
        updatedAt: schema.updatedAt || schema.createdAt
      }));
    
    return schemas;
  }

  /**
   * Get default schemas
   * @returns {Array} Array of default schemas
   */
  getDefaultSchemas() {
    return Array.from(this.defaultSchemas.entries()).map(([id, schema]) => ({
      id,
      name: schema.name,
      description: schema.description,
      version: schema.version,
      fields: Object.keys(schema.fields || {}),
      isDefault: true
    }));
  }

  /**
   * Create schema from template
   * @param {string} templateId - Template identifier
   * @param {string} newSchemaId - New schema identifier
   * @param {Object} overrides - Schema overrides
   * @returns {Object} Created schema
   */
  createFromTemplate(templateId, newSchemaId, overrides = {}) {
    const template = this.defaultSchemas.get(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    const schema = {
      ...JSON.parse(JSON.stringify(template)), // Deep clone
      ...overrides,
      id: newSchemaId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dataValidationService.registerSchema(newSchemaId, schema);
    this.saveToStorage();
    
    return schema;
  }

  /**
   * Delete a schema
   * @param {string} schemaId - Schema identifier
   */
  deleteSchema(schemaId) {
    // Clear validation results for this schema
    dataValidationService.clearResults(schemaId);
    
    // Remove from service
    dataValidationService.schemas.delete(schemaId);
    
    this.saveToStorage();
  }

  /**
   * Validate schema configuration
   * @param {Object} schemaConfig - Schema configuration to validate
   * @returns {Object} Validation result
   */
  validateSchemaConfig(schemaConfig) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!schemaConfig.name) {
      errors.push('Schema name is required');
    }

    if (!schemaConfig.fields || Object.keys(schemaConfig.fields).length === 0) {
      warnings.push('Schema has no fields defined');
    }

    // Validate field configurations
    if (schemaConfig.fields) {
      Object.entries(schemaConfig.fields).forEach(([fieldName, fieldConfig]) => {
        if (fieldConfig.required && !fieldConfig.type) {
          warnings.push(`Field '${fieldName}' is required but has no type specified`);
        }

        if (fieldConfig.enum && !Array.isArray(fieldConfig.enum)) {
          errors.push(`Field '${fieldName}' enum must be an array`);
        }

        if (fieldConfig.range && !fieldConfig.type) {
          warnings.push(`Field '${fieldName}' has range validation but no type specified`);
        }
      });
    }

    // Validate custom validations
    if (schemaConfig.customValidations && Array.isArray(schemaConfig.customValidations)) {
      schemaConfig.customValidations.forEach((validation, index) => {
        if (!validation.validate || typeof validation.validate !== 'function') {
          errors.push(`Custom validation ${index} must have a validate function`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Export schema configuration
   * @param {string} schemaId - Schema identifier
   * @returns {string} JSON string of schema
   */
  exportSchema(schemaId) {
    const schema = this.getSchema(schemaId);
    if (!schema) {
      throw new Error(`Schema '${schemaId}' not found`);
    }

    return JSON.stringify(schema, null, 2);
  }

  /**
   * Import schema configuration
   * @param {string} schemaData - JSON string of schema
   * @returns {Object} Imported schema
   */
  importSchema(schemaData) {
    let schema;
    try {
      schema = JSON.parse(schemaData);
    } catch (error) {
      throw new Error('Invalid JSON format for schema');
    }

    const validation = this.validateSchemaConfig(schema);
    if (!validation.isValid) {
      throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
    }

    return this.createSchema(schema.id || `imported_${Date.now()}`, schema);
  }

  /**
   * Save schemas to local storage
   */
  saveToStorage() {
    try {
      const schemas = Array.from(dataValidationService.schemas.entries())
        .map(([id, schema]) => ({ id, schema }));
      localStorage.setItem(this.configStorageKey, JSON.stringify(schemas));
    } catch (error) {
      console.error('Failed to save validation configs:', error);
    }
  }

  /**
   * Load schemas from local storage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.configStorageKey);
      if (stored) {
        const schemas = JSON.parse(stored);
        schemas.forEach(({ id, schema }) => {
          dataValidationService.registerSchema(id, schema);
        });
      }
    } catch (error) {
      console.error('Failed to load validation configs:', error);
    }
  }

  /**
   * Clear all custom schemas (keeps defaults)
   */
  clearCustomSchemas() {
    const defaultSchemaIds = Array.from(this.defaultSchemas.keys());
    
    for (const [schemaId] of dataValidationService.schemas) {
      if (!defaultSchemaIds.includes(schemaId)) {
        this.deleteSchema(schemaId);
      }
    }
  }

  /**
   * Get schema usage statistics
   * @param {string} schemaId - Schema identifier
   * @returns {Object} Usage statistics
   */
  getSchemaUsageStats(schemaId) {
    const results = dataValidationService.getValidationResults(schemaId);
    
    return {
      totalValidations: results.length,
      lastValidation: results.length > 0 ? results[results.length - 1].timestamp : null,
      averageDuration: results.length > 0 
        ? results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length 
        : 0,
      errorRate: results.length > 0 
        ? (results.filter(r => r.status === 'invalid').length / results.length) * 100 
        : 0
    };
  }
}

// Singleton instance
export const validationConfigManager = new ValidationConfigManager();
export default validationConfigManager;
