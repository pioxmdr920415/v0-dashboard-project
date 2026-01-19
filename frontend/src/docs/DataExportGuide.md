# Data Export Management Guide

This guide covers the comprehensive data export functionality implemented in the application, including multi-format exports, templates, scheduling, and batch operations.

## Overview

The Data Export system provides a complete solution for exporting data in multiple formats (CSV, Excel, PDF) with advanced features including:

- **Multi-format Export**: Support for CSV, Excel, and PDF formats
- **Export Templates**: Reusable templates with predefined configurations
- **Export Configurations**: Flexible configuration management
- **Batch Exports**: Process multiple export requests efficiently
- **Scheduling**: Automated export scheduling with cron expressions
- **Progress Tracking**: Real-time progress monitoring
- **Bulk Operations Integration**: Seamless integration with the BulkOperationsManager
- **Queue Management**: Advanced queue handling for export operations

## Architecture

### Core Components

1. **DataExportService** (`frontend/src/services/DataExportService.js`)
   - Main service for export operations
   - Handles template and configuration management
   - Manages export queues and scheduling
   - Provides progress tracking and event notifications

2. **DataExportDashboard** (`frontend/src/components/DataExportDashboard.js`)
   - User interface for managing exports
   - Provides tabs for templates, configurations, history, and scheduling
   - Real-time progress tracking and export management

3. **Integration with BulkOperationsManager**
   - Seamless integration with existing bulk operations system
   - Export operations are tracked as bulk operations
   - Queue management and progress tracking

## Features

### 1. Multi-Format Export

The system supports three export formats:

- **CSV**: Comma-separated values with configurable delimiters
- **Excel**: Spreadsheet format (mock implementation, ready for SheetJS integration)
- **PDF**: Document format (mock implementation, ready for jsPDF integration)

\`\`\`javascript
// Example export request
const exportRequest = {
  format: 'csv',           // 'csv', 'excel', or 'pdf'
  templateId: 'template_1',
  dataSource: 'api',       // 'api', 'database', or 'mock'
  query: { limit: 1000 },
  options: {
    includeHeaders: true,
    delimiter: ',',
    encoding: 'utf-8'
  }
};

const result = await dataExportService.exportData(exportRequest);
\`\`\`

### 2. Export Templates

Templates provide reusable configurations for common export scenarios:

\`\`\`javascript
// Create a template
const template = dataExportService.createTemplate('sales_template', {
  name: 'Sales Data Template',
  description: 'Template for exporting sales data',
  format: 'csv',
  fields: ['id', 'name', 'amount', 'date', 'category'],
  filters: { status: 'active' },
  sorting: { field: 'date', order: 'desc' },
  formatting: { dateFormat: 'YYYY-MM-DD' }
});

// List all templates
const templates = dataExportService.listTemplates();
\`\`\`

### 3. Export Configurations

Configurations combine templates with specific settings:

\`\`\`javascript
// Create a configuration
const config = dataExportService.createExportConfig('monthly_sales_config', {
  name: 'Monthly Sales Export',
  description: 'Monthly sales data export configuration',
  templateId: 'sales_template',
  dataSource: 'api',
  query: { 
    dateRange: { start: '2023-01-01', end: '2023-12-31' },
    filters: { region: 'US' }
  },
  format: 'excel',
  options: {
    includeHeaders: true,
    compression: true
  }
});
\`\`\`

### 4. Batch Exports

Process multiple export requests efficiently:

\`\`\`javascript
// Batch export requests
const batchRequests = [
  {
    format: 'csv',
    templateId: 'sales_template',
    dataSource: 'api',
    query: { month: 'January' }
  },
  {
    format: 'csv', 
    templateId: 'sales_template',
    dataSource: 'api',
    query: { month: 'February' }
  }
];

// Process batch with progress tracking
const results = await dataExportService.batchExport(batchRequests, (progress) => {
  console.log(`Overall progress: ${progress.overallProgress}%`);
  console.log(`Current export progress: ${progress.currentExportProgress}%`);
});
\`\`\`

### 5. Export Scheduling

Automate exports with cron-based scheduling:

\`\`\`javascript
// Schedule an export
const schedule = await dataExportService.scheduleExport({
  name: 'Daily Sales Report',
  configId: 'monthly_sales_config',
  cronExpression: '0 6 * * *',  // Daily at 6 AM
  enabled: true
});

// List schedules
const schedules = dataExportService.listSchedules();
\`\`\`

### 6. Progress Tracking

Real-time progress monitoring with event listeners:

\`\`\`javascript
// Add progress listener
dataExportService.addListener((event, data) => {
  switch (event) {
    case 'export_started':
      console.log(`Export ${data.id} started`);
      break;
    case 'export_progress':
      console.log(`Export progress: ${data.progress}%`);
      break;
    case 'export_completed':
      console.log(`Export ${data.id} completed successfully`);
      break;
    case 'export_failed':
      console.log(`Export ${data.id} failed: ${data.errors[0]?.message}`);
      break;
  }
});
\`\`\`

### 7. Integration with BulkOperationsManager

Export operations are seamlessly integrated with the bulk operations system:

\`\`\`javascript
// Export operations are automatically tracked as bulk operations
const exportResult = await dataExportService.exportData(exportRequest);

// Get bulk operation details
const bulkOperations = bulkOperationsManager.getAllOperations();
const exportOperation = bulkOperations.find(op => op.type === 'export');

console.log(`Export bulk operation ID: ${exportOperation.id}`);
console.log(`Export status: ${exportOperation.status}`);
console.log(`Items processed: ${exportOperation.processedItems}`);
\`\`\`

## Usage Examples

### Basic Export

\`\`\`javascript
import { dataExportService } from './services/DataExportService';

// Create a simple export
const result = await dataExportService.exportData({
  format: 'csv',
  dataSource: 'mock',
  query: { limit: 1000 },
  createdBy: 'user123'
});

// Download the file
if (result.fileUrl) {
  const link = document.createElement('a');
  link.href = result.fileUrl;
  link.download = result.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
\`\`\`

### Template-Based Export

\`\`\`javascript
// Create a template
const template = dataExportService.createTemplate('customer_template', {
  name: 'Customer Data',
  format: 'csv',
  fields: ['id', 'name', 'email', 'phone', 'address']
});

// Use template for export
const result = await dataExportService.exportData({
  templateId: 'customer_template',
  dataSource: 'api',
  query: { status: 'active' },
  options: {
    includeHeaders: true,
    delimiter: ';'
  }
});
\`\`\`

### Scheduled Export

\`\`\`javascript
// Create a configuration
const config = dataExportService.createExportConfig('daily_report', {
  name: 'Daily Report',
  templateId: 'customer_template',
  dataSource: 'api',
  query: { date: 'today' },
  format: 'pdf'
});

// Schedule the export
const schedule = await dataExportService.scheduleExport({
  name: 'Daily Customer Report',
  configId: 'daily_report',
  cronExpression: '0 8 * * *',  // Every day at 8 AM
  enabled: true
});
\`\`\`

### Batch Export with Progress

\`\`\`javascript
// Multiple export requests
const batchRequests = [
  { format: 'csv', query: { month: 'January' } },
  { format: 'csv', query: { month: 'February' } },
  { format: 'csv', query: { month: 'March' } }
];

// Process with progress tracking
const results = await dataExportService.batchExport(batchRequests, (progress) => {
  updateProgressBar(progress.overallProgress);
  updateCurrentExportStatus(progress.currentExportProgress);
});

// Handle results
results.forEach((result, index) => {
  if (result.success) {
    console.log(`Export ${index + 1} completed successfully`);
  } else {
    console.error(`Export ${index + 1} failed: ${result.error}`);
  }
});
\`\`\`

## Configuration Options

### Service Configuration

\`\`\`javascript
dataExportService.configure({
  defaultFormat: 'csv',
  maxExportSize: 50000,
  batchSize: 500,
  retryAttempts: 5,
  retryDelay: 2000,
  enableScheduling: true,
  enableTemplates: true,
  enableValidation: true,
  enableQueue: true,
  maxConcurrentExports: 5
});
\`\`\`

### Export Options

\`\`\`javascript
const exportOptions = {
  includeHeaders: true,      // Include headers in CSV/Excel
  delimiter: ',',            // CSV delimiter
  encoding: 'utf-8',         // File encoding
  compression: false,        // Enable compression
  dateFormat: 'YYYY-MM-DD',  // Date format for exports
  numberFormat: '0,0.00'     // Number format
};
\`\`\`

## Error Handling

The system provides comprehensive error handling:

\`\`\`javascript
try {
  const result = await dataExportService.exportData(exportRequest);
  console.log('Export completed successfully');
} catch (error) {
  console.error('Export failed:', error.message);
  
  // Check error type
  if (error.message.includes('format')) {
    console.log('Invalid export format');
  } else if (error.message.includes('size')) {
    console.log('Export size too large');
  } else {
    console.log('Unknown error occurred');
  }
}
\`\`\`

## Performance Considerations

1. **Batch Size**: Configure appropriate batch sizes for optimal performance
2. **Concurrent Exports**: Limit concurrent exports to prevent system overload
3. **Memory Management**: Large exports are processed in batches to manage memory
4. **Queue Management**: Use the queue system for better resource management

## Future Enhancements

1. **Real Excel/PDF Generation**: Integrate with SheetJS and jsPDF libraries
2. **Advanced Scheduling**: Add more sophisticated scheduling options
3. **Export Notifications**: Email notifications for completed exports
4. **Export Analytics**: Track export usage and performance metrics
5. **Template Sharing**: Share templates across users and teams

## Troubleshooting

### Common Issues

1. **Export Timeout**: Increase timeout settings for large datasets
2. **Memory Issues**: Reduce batch size for memory-constrained environments
3. **Queue Backlog**: Monitor and manage the export queue
4. **Format Errors**: Verify format support and configuration

### Debugging

\`\`\`javascript
// Enable debug logging
dataExportService.addListener((event, data) => {
  console.log(`[DEBUG] ${event}:`, data);
});

// Check export history
const history = dataExportService.getExportHistory({
  status: 'failed',
  dateFrom: '2023-01-01'
});

console.log('Failed exports:', history);
\`\`\`

## Integration Points

### With DataValidationService

Export operations can integrate with data validation:

\`\`\`javascript
// Pre-validate data before export
const validationReport = await dataValidationService.preValidateForBulkOperation(
  'schema_id', 
  exportData, 
  { failOnValidationError: false }
);

if (validationReport.canProceed) {
  const result = await dataExportService.exportData(exportRequest);
} else {
  console.log('Data validation failed, export blocked');
}
\`\`\`

### With BulkOperationsManager

Export operations are automatically tracked:

\`\`\`javascript
// Monitor export progress through bulk operations
bulkOperationsManager.addListener((event, data) => {
  if (data.type === 'export') {
    console.log(`Export ${data.id} progress: ${data.progress}%`);
  }
});
\`\`\`

This comprehensive guide covers all aspects of the data export functionality, from basic usage to advanced features and integration points.
