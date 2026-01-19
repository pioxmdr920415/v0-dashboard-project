# Data Validation Pipeline Documentation

## Overview

The Data Validation Pipeline provides a comprehensive system for validating data against configurable schemas, tracking data quality metrics, and monitoring validation results in real-time. This system integrates seamlessly with the existing AppContext to provide validation for cached data.

## Architecture

### Core Components

1. **DataValidationService** - Core validation engine
2. **DataQualityMonitor** - Real-time quality tracking component
3. **ValidationDashboard** - Comprehensive dashboard for monitoring
4. **ValidationConfigManager** - Schema configuration management
5. **RealTimeValidationMonitor** - Real-time monitoring and alerts
6. **validationStorage** - Persistent storage for validation data

### Integration Points

- **AppContext** - Integrated validation for cached data
- **IndexedDB** - Persistent storage for schemas, results, and metrics
- **Toast Notifications** - Real-time alerts and notifications

## Usage

### Basic Validation

\`\`\`javascript
import { dataValidationService } from '../services/DataValidationService';

// Define a schema
const userSchema = {
  name: 'User Data',
  description: 'Schema for user information',
  fields: {
    email: {
      type: 'string',
      required: true,
      format: 'email'
    },
    age: {
      type: 'number',
      range: { min: 0, max: 120 }
    }
  }
};

// Register the schema
dataValidationService.registerSchema('user_data', userSchema);

// Validate data
const userData = { email: 'user@example.com', age: 25 };
const result = dataValidationService.validate('user_data', userData);

console.log(result.status); // 'valid'
console.log(result.errors); // []
\`\`\`

### Using with AppContext

\`\`\`javascript
import { useApp } from '../context/AppContext';

function MyComponent() {
  const { registerValidationSchema, getValidationResults } = useApp();

  useEffect(() => {
    // Register schema
    registerValidationSchema('my_schema', mySchema);
  }, []);

  const handleData = async (data) => {
    // Data will be automatically validated when cached
    await cacheSheetData('my_sheet', data);
    
    // Get validation results
    const results = getValidationResults('my_schema');
  };
}
\`\`\`

## Schema Configuration

### Field Validation Rules

#### Required Fields
\`\`\`javascript
{
  required: ['name', 'email']
}
\`\`\`

#### Type Validation
\`\`\`javascript
{
  fields: {
    age: { type: 'number' },
    name: { type: 'string' },
    isActive: { type: 'boolean' },
    createdAt: { type: 'date' }
  }
}
\`\`\`

#### Format Validation
\`\`\`javascript
{
  fields: {
    email: { format: 'email' },
    phone: { format: 'phone' },
    uuid: { format: 'uuid' },
    custom: { format: /^[A-Z]{3}-\d{4}$/ }
  }
}
\`\`\`

#### Range Validation
\`\`\`javascript
{
  fields: {
    age: { type: 'number', range: { min: 0, max: 120 } },
    score: { type: 'number', range: [0, 100] }
  }
}
\`\`\`

#### Enum Validation
\`\`\`javascript
{
  fields: {
    status: { 
      enum: ['active', 'inactive', 'pending'] 
    }
  }
}
\`\`\`

#### Length Validation
\`\`\`javascript
{
  fields: {
    name: { length: { min: 2, max: 100 } },
    code: { length: 5 } // Exact length
  }
}
\`\`\`

#### Custom Validation
\`\`\`javascript
{
  fields: {
    password: {
      custom: (value, context) => {
        if (value && value.length < 8) {
          return {
            error: {
              code: 'PASSWORD_TOO_SHORT',
              message: 'Password must be at least 8 characters'
            }
          };
        }
        return null;
      }
    }
  }
}
\`\`\`

### Custom Validation Functions

\`\`\`javascript
{
  customValidations: [
    {
      name: 'email_uniqueness',
      validate: (data, context) => {
        // Custom validation logic
        return {
          errors: [],
          warnings: []
        };
      }
    }
  ]
}
\`\`\`

## Data Quality Monitoring

### Quality Metrics

The system tracks the following metrics:
- **Quality Score** (0-100%) - Overall data quality
- **Valid Records** - Count of successfully validated records
- **Invalid Records** - Count of records with validation errors
- **Warning Records** - Count of records with warnings
- **Error Count** - Total number of validation errors
- **Warning Count** - Total number of validation warnings
- **Error Rate** - Percentage of invalid records
- **Warning Rate** - Percentage of records with warnings

### Real-time Monitoring

\`\`\`javascript
import { realTimeValidationMonitor } from '../services/RealTimeValidationMonitor';

// Start monitoring
realTimeValidationMonitor.startMonitoring();

// Set alert thresholds
realTimeValidationMonitor.setAlertThresholds('user_data', {
  qualityScore: { critical: 60, warning: 80 },
  errorRate: { critical: 15, warning: 5 }
});

// Listen for alerts
realTimeValidationMonitor.addListener((event, data) => {
  if (event === 'alert_triggered') {
    console.log('Alert:', data.message);
  }
});
\`\`\`

## Storage and Persistence

### IndexedDB Storage

All validation data is persisted in IndexedDB with the following stores:
- **schemas** - Validation schema configurations
- **validation_results** - Individual validation results
- **quality_metrics** - Quality metrics for each schema
- **validation_configs** - Configuration settings

### Storage Operations

\`\`\`javascript
import { schemaStorage, resultStorage, metricsStorage } from '../utils/validationStorage';

// Save schema
await schemaStorage.saveSchema(schema);

// Get validation results
const results = await resultStorage.getResultsBySchema('user_data', {
  status: 'invalid',
  dateRange: '24h'
});

// Get quality metrics
const metrics = await metricsStorage.getMetrics('user_data');
\`\`\`

## Dashboard Integration

### Validation Dashboard

The `ValidationDashboard` component provides a comprehensive interface for:
- Schema selection and management
- Real-time quality monitoring
- Validation results viewing and filtering
- Analytics and statistics
- Export functionality

### Data Quality Monitor

The `DataQualityMonitor` component provides:
- Real-time quality score display
- Validation metrics visualization
- Quality alerts and notifications
- Trend analysis

## Best Practices

### Schema Design

1. **Start Simple** - Begin with basic validation rules and expand as needed
2. **Use Descriptive Names** - Use clear, descriptive schema and field names
3. **Document Requirements** - Include descriptions for all fields and rules
4. **Version Control** - Use schema versions for tracking changes

### Performance Optimization

1. **Batch Validation** - Use `validateBatch()` for multiple records
2. **Limit Result Storage** - Configure appropriate retention periods
3. **Monitor Alert Frequency** - Adjust thresholds to avoid alert fatigue
4. **Use Indexes** - Leverage IndexedDB indexes for query performance

### Error Handling

1. **Graceful Degradation** - Continue operation even if validation fails
2. **Clear Error Messages** - Provide actionable error messages
3. **Log Validation Issues** - Track validation failures for analysis
4. **User Feedback** - Inform users of validation status

## Examples

### Google Sheets Integration

\`\`\`javascript
// Schema for Google Sheets data
const sheetSchema = {
  name: 'Employee Data',
  fields: {
    employeeId: {
      type: 'string',
      required: true,
      format: 'uuid'
    },
    email: {
      type: 'string',
      required: true,
      format: 'email'
    },
    department: {
      enum: ['Engineering', 'Sales', 'Marketing', 'HR']
    },
    salary: {
      type: 'number',
      range: { min: 30000, max: 200000 }
    }
  }
};

// Register and use
dataValidationService.registerSchema('employee_data', sheetSchema);
\`\`\`

### Google Drive Integration

\`\`\`javascript
// Schema for Drive file metadata
const driveSchema = {
  name: 'Drive Files',
  fields: {
    id: { type: 'string', required: true },
    name: { 
      type: 'string', 
      required: true,
      length: { min: 1, max: 255 }
    },
    mimeType: {
      enum: [
        'application/pdf',
        'image/jpeg',
        'text/plain'
      ]
    },
    size: {
      type: 'number',
      range: { min: 0, max: 1000000000 } // 1GB
    }
  }
};
\`\`\`

### Custom Validation Example

\`\`\`javascript
// Complex validation for financial data
const financialSchema = {
  name: 'Financial Transactions',
  fields: {
    amount: {
      type: 'number',
      range: { min: 0.01, max: 1000000 }
    },
    currency: {
      enum: ['USD', 'EUR', 'GBP', 'JPY']
    },
    transactionDate: {
      type: 'string',
      format: 'date',
      custom: (value) => {
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
        return null;
      }
    }
  },
  customValidations: [
    {
      name: 'balance_consistency',
      validate: (data) => {
        const errors = [];
        if (data.amount < 0 && data.transactionType !== 'debit') {
          errors.push({
            field: 'amount',
            message: 'Negative amounts should be debit transactions'
          });
        }
        return { errors };
      }
    }
  ]
};
\`\`\`

## Troubleshooting

### Common Issues

1. **Schema Not Found** - Ensure schema is registered before validation
2. **Validation Performance** - Use batch validation for large datasets
3. **Storage Limits** - Monitor IndexedDB storage usage
4. **Alert Fatigue** - Adjust alert thresholds appropriately

### Debugging

\`\`\`javascript
// Enable debug logging
dataValidationService.addListener((event, data) => {
  console.log(`Validation Event: ${event}`, data);
});

// Check schema registration
const schema = dataValidationService.getSchema('my_schema');
console.log('Schema:', schema);

// View validation results
const results = dataValidationService.getValidationResults('my_schema');
console.log('Results:', results);
\`\`\`

## API Reference

### DataValidationService

- `registerSchema(schemaId, schema)` - Register a validation schema
- `validate(schemaId, data, options)` - Validate data against schema
- `validateBatch(schemaId, datasets, options)` - Validate multiple datasets
- `getValidationResults(schemaId, filters)` - Get validation results
- `getQualityMetrics(schemaId)` - Get quality metrics
- `clearResults(schemaId)` - Clear validation results

### ValidationConfigManager

- `createSchema(schemaId, schemaConfig)` - Create new schema
- `updateSchema(schemaId, updates)` - Update existing schema
- `getSchema(schemaId)` - Get schema by ID
- `getAllSchemas()` - Get all registered schemas
- `createFromTemplate(templateId, newSchemaId, overrides)` - Create from template
- `validateSchemaConfig(schemaConfig)` - Validate schema configuration

### RealTimeValidationMonitor

- `startMonitoring()` - Start real-time monitoring
- `stopMonitoring()` - Stop monitoring
- `setAlertThresholds(schemaId, thresholds)` - Set alert thresholds
- `getActiveAlerts(schemaId)` - Get active alerts
- `acknowledgeAlert(alertId)` - Acknowledge alert

## Migration Guide

### From Basic Validation

If you're migrating from basic validation to this system:

1. **Register Existing Schemas**
   \`\`\`javascript
   // Old: Manual validation
   function validateEmail(email) { /* ... */ }
   
   // New: Schema-based validation
   dataValidationService.registerSchema('user_data', {
     fields: {
       email: { format: 'email' }
     }
   });
   \`\`\`

2. **Update Validation Calls**
   \`\`\`javascript
   // Old: Direct function calls
   const isValid = validateEmail(data.email);
   
   // New: Service-based validation
   const result = dataValidationService.validate('user_data', data);
   \`\`\`

3. **Add Quality Monitoring**
   \`\`\`javascript
   // Start monitoring quality
   realTimeValidationMonitor.startMonitoring();
   \`\`\`

This comprehensive documentation provides everything needed to implement and use the data validation pipeline effectively.
