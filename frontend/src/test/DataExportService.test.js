/**
 * Test file for DataExportService
 * Tests the export functionality and integration with BulkOperationsManager
 */

import { dataExportService } from '../services/DataExportService';
import { bulkOperationsManager } from '../services/BulkOperationsManager';

describe('DataExportService', () => {
  beforeEach(() => {
    // Reset service state
    dataExportService.exportTemplates.clear();
    dataExportService.exportConfigs.clear();
    dataExportService.exportHistory = [];
  });

  test('should create export template', () => {
    const template = dataExportService.createTemplate('test_template', {
      name: 'Test Template',
      format: 'csv',
      fields: ['id', 'name', 'value']
    });

    expect(template).toBeDefined();
    expect(template.id).toBe('test_template');
    expect(template.name).toBe('Test Template');
    expect(template.format).toBe('csv');
    expect(template.fields).toEqual(['id', 'name', 'value']);
  });

  test('should create export configuration', () => {
    const config = dataExportService.createExportConfig('test_config', {
      name: 'Test Config',
      templateId: 'test_template',
      format: 'csv'
    });

    expect(config).toBeDefined();
    expect(config.id).toBe('test_config');
    expect(config.name).toBe('Test Config');
    expect(config.templateId).toBe('test_template');
    expect(config.format).toBe('csv');
  });

  test('should export data successfully', async () => {
    // Create a template first
    dataExportService.createTemplate('test_template', {
      name: 'Test Template',
      format: 'csv',
      fields: ['id', 'name', 'value']
    });

    const exportRequest = {
      format: 'csv',
      templateId: 'test_template',
      dataSource: 'mock',
      query: {},
      createdBy: 'test'
    };

    const result = await dataExportService.exportData(exportRequest);

    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
    expect(result.format).toBe('csv');
    expect(result.templateId).toBe('test_template');
    expect(result.fileUrl).toBeDefined();
    expect(result.fileName).toBeDefined();
  });

  test('should handle batch export', async () => {
    // Create a template first
    dataExportService.createTemplate('test_template', {
      name: 'Test Template',
      format: 'csv',
      fields: ['id', 'name', 'value']
    });

    const batchRequests = [
      {
        format: 'csv',
        templateId: 'test_template',
        dataSource: 'mock',
        query: {},
        createdBy: 'test'
      },
      {
        format: 'csv',
        templateId: 'test_template',
        dataSource: 'mock',
        query: {},
        createdBy: 'test'
      }
    ];

    const results = await dataExportService.batchExport(batchRequests);

    expect(results).toBeDefined();
    expect(results.length).toBe(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });

  test('should schedule export', async () => {
    const schedule = await dataExportService.scheduleExport({
      name: 'Test Schedule',
      configId: 'test_config',
      cronExpression: '0 2 * * *',
      enabled: true
    });

    expect(schedule).toBeDefined();
    expect(schedule.name).toBe('Test Schedule');
    expect(schedule.cronExpression).toBe('0 2 * * *');
    expect(schedule.enabled).toBe(true);
  });

  test('should get export history', () => {
    const history = dataExportService.getExportHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  test('should integrate with BulkOperationsManager', async () => {
    // Create a template first
    dataExportService.createTemplate('test_template', {
      name: 'Test Template',
      format: 'csv',
      fields: ['id', 'name', 'value']
    });

    const exportRequest = {
      format: 'csv',
      templateId: 'test_template',
      dataSource: 'mock',
      query: {},
      createdBy: 'test'
    };

    const result = await dataExportService.exportData(exportRequest);

    // Check if bulk operation was created
    const bulkOperations = bulkOperationsManager.getAllOperations();
    const exportOperation = bulkOperations.find(op => op.type === 'export');

    expect(exportOperation).toBeDefined();
    expect(exportOperation.status).toBe('completed');
  });
});

// Simple integration test runner
if (typeof window !== 'undefined') {
  console.log('DataExportService tests would run in a proper test environment');
  console.log('Service methods available:', Object.getOwnPropertyNames(dataExportService).filter(name => typeof dataExportService[name] === 'function'));
}
