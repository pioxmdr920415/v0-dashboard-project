/**
 * ValidationExamples.js - Practical examples of using the data validation pipeline
 * Demonstrates various validation scenarios and use cases
 */

import { dataValidationService } from '../services/DataValidationService';
import { validationConfigManager } from '../services/ValidationConfigManager';
import { realTimeValidationMonitor } from '../services/RealTimeValidationMonitor';

/**
 * Example 1: Basic User Data Validation
 */
export function setupUserValidation() {
  const userSchema = {
    name: 'User Information',
    description: 'Schema for validating user registration data',
    fields: {
      userId: {
        type: 'string',
        required: true,
        format: 'uuid',
        description: 'Unique user identifier'
      },
      email: {
        type: 'string',
        required: true,
        format: 'email',
        description: 'User email address'
      },
      username: {
        type: 'string',
        required: true,
        length: { min: 3, max: 50 },
        format: /^[a-zA-Z0-9_]+$/,
        description: 'Username (alphanumeric and underscores only)'
      },
      age: {
        type: 'number',
        range: { min: 13, max: 120 },
        description: 'User age in years'
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
        description: 'Date of birth (YYYY-MM-DD format)'
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
      },
      {
        name: 'email_domain_check',
        validate: (data, context) => {
          const errors = [];
          
          if (data.email && data.email.endsWith('@example.com')) {
            errors.push({
              field: 'email',
              code: 'INVALID_DOMAIN',
              message: 'Example.com domain is not allowed for production use'
            });
          }
          
          return { errors };
        }
      }
    ]
  };

  // Register the schema
  validationConfigManager.createSchema('user_registration', userSchema);
  
  // Set up monitoring
  realTimeValidationMonitor.setAlertThresholds('user_registration', {
    qualityScore: { critical: 70, warning: 85 },
    errorRate: { critical: 10, warning: 5 }
  });

  return userSchema;
}

/**
 * Example 2: Product Data Validation
 */
export function setupProductValidation() {
  const productSchema = {
    name: 'Product Information',
    description: 'Schema for validating product catalog data',
    fields: {
      productId: {
        type: 'string',
        required: true,
        format: /^[A-Z]{3}-\d{4}$/,
        description: 'Product ID (format: XXX-1234)'
      },
      name: {
        type: 'string',
        required: true,
        length: { min: 2, max: 200 },
        description: 'Product name'
      },
      description: {
        type: 'string',
        length: { min: 10, max: 2000 },
        description: 'Product description'
      },
      price: {
        type: 'number',
        range: { min: 0.01, max: 10000 },
        description: 'Product price in USD'
      },
      category: {
        type: 'string',
        enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'toys'],
        required: true,
        description: 'Product category'
      },
      stockQuantity: {
        type: 'number',
        range: { min: 0, max: 100000 },
        description: 'Available stock quantity'
      },
      weight: {
        type: 'number',
        range: { min: 0.01, max: 1000 },
        description: 'Product weight in kg'
      },
      dimensions: {
        type: 'object',
        custom: (value, context) => {
          if (value) {
            const requiredFields = ['length', 'width', 'height'];
            const missingFields = requiredFields.filter(field => !(field in value));
            
            if (missingFields.length > 0) {
              return {
                error: {
                  code: 'MISSING_DIMENSIONS',
                  message: `Missing required dimensions: ${missingFields.join(', ')}`
                }
              };
            }
            
            for (const field of requiredFields) {
              if (typeof value[field] !== 'number' || value[field] <= 0) {
                return {
                  error: {
                    code: 'INVALID_DIMENSION',
                    message: `Dimension '${field}' must be a positive number`
                  }
                };
              }
            }
          }
          return null;
        },
        description: 'Product dimensions (length, width, height in cm)'
      },
      tags: {
        type: 'array',
        custom: (value, context) => {
          if (value && !Array.isArray(value)) {
            return {
              error: {
                code: 'INVALID_TAGS',
                message: 'Tags must be an array'
              }
            };
          }
          
          if (value && value.length > 10) {
            return {
              warning: {
                code: 'TOO_MANY_TAGS',
                message: 'Consider limiting tags to 10 or fewer'
              }
            };
          }
          
          return null;
        },
        description: 'Product tags for categorization'
      }
    },
    customValidations: [
      {
        name: 'price_vs_category',
        validate: (data, context) => {
          const errors = [];
          
          if (data.category === 'electronics' && data.price < 5) {
            errors.push({
              field: 'price',
              code: 'PRICE_TOO_LOW',
              message: 'Electronics products typically cost more than $5'
            });
          }
          
          if (data.category === 'books' && data.price > 500) {
            errors.push({
              field: 'price',
              code: 'PRICE_TOO_HIGH',
              message: 'Books typically cost less than $500'
            });
          }
          
          return { errors };
        }
      }
    ]
  };

  validationConfigManager.createSchema('product_catalog', productSchema);
  
  return productSchema;
}

/**
 * Example 3: Financial Transaction Validation
 */
export function setupTransactionValidation() {
  const transactionSchema = {
    name: 'Financial Transactions',
    description: 'Schema for validating financial transaction data',
    fields: {
      transactionId: {
        type: 'string',
        required: true,
        format: 'uuid',
        description: 'Unique transaction identifier'
      },
      amount: {
        type: 'number',
        required: true,
        range: { min: 0.01, max: 1000000 },
        description: 'Transaction amount'
      },
      currency: {
        type: 'string',
        required: true,
        enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD'],
        description: 'Transaction currency'
      },
      transactionType: {
        type: 'string',
        required: true,
        enum: ['credit', 'debit', 'transfer', 'fee'],
        description: 'Type of transaction'
      },
      accountNumber: {
        type: 'string',
        required: true,
        format: /^[A-Z0-9]{8,16}$/,
        description: 'Account number (8-16 alphanumeric characters)'
      },
      description: {
        type: 'string',
        length: { min: 5, max: 500 },
        description: 'Transaction description'
      },
      transactionDate: {
        type: 'string',
        required: true,
        format: 'datetime',
        custom: (value, context) => {
          if (value) {
            const date = new Date(value);
            const today = new Date();
            
            if (date > today) {
              return {
                error: {
                  code: 'FUTURE_DATE',
                  message: 'Transaction date cannot be in the future'
                }
              };
            }
            
            // Check if transaction is older than 2 years
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(today.getFullYear() - 2);
            
            if (date < twoYearsAgo) {
              return {
                warning: {
                  code: 'OLD_TRANSACTION',
                  message: 'Transaction appears to be older than 2 years'
                }
              };
            }
          }
          return null;
        },
        description: 'Transaction date and time'
      },
      status: {
        type: 'string',
        enum: ['pending', 'completed', 'failed', 'cancelled'],
        required: true,
        description: 'Transaction status'
      }
    },
    customValidations: [
      {
        name: 'amount_consistency',
        validate: (data, context) => {
          const errors = [];
          
          if (data.transactionType === 'debit' && data.amount > 0) {
            errors.push({
              field: 'amount',
              code: 'INCONSISTENT_AMOUNT',
              message: 'Debit transactions should have negative amounts'
            });
          } else if (data.transactionType === 'credit' && data.amount < 0) {
            errors.push({
              field: 'amount',
              code: 'INCONSISTENT_AMOUNT',
              message: 'Credit transactions should have positive amounts'
            });
          }
          
          return { errors };
        }
      },
      {
        name: 'high_value_alert',
        validate: (data, context) => {
          const warnings = [];
          
          if (data.amount > 50000) {
            warnings.push({
              field: 'amount',
              code: 'HIGH_VALUE_TRANSACTION',
              message: 'High-value transaction detected - additional review recommended'
            });
          }
          
          return { warnings };
        }
      }
    ]
  };

  validationConfigManager.createSchema('financial_transactions', transactionSchema);
  
  // Set strict monitoring for financial data
  realTimeValidationMonitor.setAlertThresholds('financial_transactions', {
    qualityScore: { critical: 95, warning: 98 },
    errorRate: { critical: 1, warning: 2 }
  });

  return transactionSchema;
}

/**
 * Example 4: Google Sheets Data Validation
 */
export function setupGoogleSheetsValidation() {
  const sheetsSchema = {
    name: 'Google Sheets Data',
    description: 'Schema for validating Google Sheets data',
    fields: {
      id: {
        type: 'string',
        required: true,
        format: 'uuid',
        description: 'Record identifier'
      },
      timestamp: {
        type: 'string',
        required: true,
        format: 'datetime',
        description: 'Record timestamp'
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
      },
      department: {
        type: 'string',
        enum: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'],
        description: 'Department'
      },
      salary: {
        type: 'number',
        range: { min: 30000, max: 200000 },
        description: 'Annual salary'
      }
    },
    customValidations: [
      {
        name: 'department_salary_validation',
        validate: (data, context) => {
          const errors = [];
          
          if (data.department === 'Engineering' && data.salary < 50000) {
            errors.push({
              field: 'salary',
              code: 'SALARY_TOO_LOW',
              message: 'Engineering salaries should typically be above $50,000'
            });
          }
          
          if (data.department === 'HR' && data.salary > 150000) {
            errors.push({
              field: 'salary',
              code: 'SALARY_TOO_HIGH',
              message: 'HR salaries above $150,000 are unusual'
            });
          }
          
          return { errors };
        }
      }
    ]
  };

  validationConfigManager.createSchema('google_sheets_data', sheetsSchema);
  
  return sheetsSchema;
}

/**
 * Example 5: Google Drive File Validation
 */
export function setupGoogleDriveValidation() {
  const driveSchema = {
    name: 'Google Drive Files',
    description: 'Schema for validating Google Drive file metadata',
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
          'application/vnd.google-apps.document',
          'application/vnd.google-apps.spreadsheet',
          'application/vnd.google-apps.presentation'
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
        custom: (value, context) => {
          if (value && context.data.createdTime) {
            const modified = new Date(value);
            const created = new Date(context.data.createdTime);
            
            if (modified < created) {
              return {
                error: {
                  code: 'INVALID_MODIFIED_TIME',
                  message: 'Modified time cannot be before creation time'
                }
              };
            }
          }
          return null;
        },
        description: 'File last modification time'
      },
      owners: {
        type: 'array',
        custom: (value, context) => {
          if (value && !Array.isArray(value)) {
            return {
              error: {
                code: 'INVALID_OWNERS',
                message: 'Owners must be an array'
              }
            };
          }
          
          if (value && value.length === 0) {
            return {
              warning: {
                code: 'NO_OWNERS',
                message: 'File has no owners assigned'
              }
            };
          }
          
          return null;
        },
        description: 'File owners'
      }
    },
    customValidations: [
      {
        name: 'file_size_validation',
        validate: (data, context) => {
          const errors = [];
          const warnings = [];
          
          if (data.mimeType === 'image/jpeg' && data.size > 10000000) { // 10MB
            warnings.push({
              field: 'size',
              code: 'LARGE_IMAGE',
              message: 'JPEG file is larger than 10MB - consider compression'
            });
          }
          
          if (data.mimeType === 'application/pdf' && data.size < 100) {
            warnings.push({
              field: 'size',
              code: 'SMALL_PDF',
              message: 'PDF file is very small - may be corrupted'
            });
          }
          
          return { errors, warnings };
        }
      }
    ]
  };

  validationConfigManager.createSchema('google_drive_files', driveSchema);
  
  return driveSchema;
}

/**
 * Utility function to run validation examples
 */
export function runValidationExamples() {
  console.log('Setting up validation examples...');
  
  // Set up all validation schemas
  const userSchema = setupUserValidation();
  const productSchema = setupProductValidation();
  const transactionSchema = setupTransactionValidation();
  const sheetsSchema = setupGoogleSheetsValidation();
  const driveSchema = setupGoogleDriveValidation();
  
  // Example data to validate
  const exampleData = {
    user: {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      email: 'john.doe@example.com',
      username: 'johndoe',
      age: 25,
      dateOfBirth: '1998-05-15',
      role: 'user',
      isActive: true,
      password: 'MySecurePassword123'
    },
    product: {
      productId: 'ELE-1234',
      name: 'Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      price: 299.99,
      category: 'electronics',
      stockQuantity: 50,
      weight: 0.5,
      dimensions: {
        length: 20,
        width: 18,
        height: 8
      },
      tags: ['audio', 'wireless', 'headphones']
    },
    transaction: {
      transactionId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 99.99,
      currency: 'USD',
      transactionType: 'debit',
      accountNumber: 'ACC123456789',
      description: 'Online purchase',
      transactionDate: '2024-01-15T10:30:00Z',
      status: 'completed'
    }
  };
  
  // Validate example data
  console.log('\nValidating example data...');
  
  try {
    const userResult = dataValidationService.validate('user_registration', exampleData.user);
    console.log('User validation result:', userResult);
    
    const productResult = dataValidationService.validate('product_catalog', exampleData.product);
    console.log('Product validation result:', productResult);
    
    const transactionResult = dataValidationService.validate('financial_transactions', exampleData.transaction);
    console.log('Transaction validation result:', transactionResult);
    
  } catch (error) {
    console.error('Validation error:', error);
  }
  
  // Start monitoring
  realTimeValidationMonitor.startMonitoring();
  
  console.log('\nValidation examples setup complete!');
  console.log('Available schemas:', validationConfigManager.getAllSchemas().map(s => s.name));
  
  return {
    schemas: { userSchema, productSchema, transactionSchema, sheetsSchema, driveSchema },
    exampleData
  };
}

/**
 * Function to demonstrate batch validation
 */
export function demonstrateBatchValidation() {
  const batchData = [
    { email: 'user1@example.com', age: 25, role: 'user' },
    { email: 'user2@example.com', age: 30, role: 'admin' },
    { email: 'invalid-email', age: -5, role: 'invalid' },
    { email: 'user4@example.com', age: 150, role: 'user' }
  ];
  
  const results = dataValidationService.validateBatch('user_registration', batchData);
  
  console.log('Batch validation results:');
  results.forEach((result, index) => {
    console.log(`Record ${index + 1}: ${result.status}`);
    if (result.errors.length > 0) {
      console.log('  Errors:', result.errors);
    }
    if (result.warnings.length > 0) {
      console.log('  Warnings:', result.warnings);
    }
  });
  
  return results;
}

export default {
  setupUserValidation,
  setupProductValidation,
  setupTransactionValidation,
  setupGoogleSheetsValidation,
  setupGoogleDriveValidation,
  runValidationExamples,
  demonstrateBatchValidation
};
