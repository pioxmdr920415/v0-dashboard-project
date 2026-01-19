import React, { useState, useEffect } from 'react';
import { bulkOperationsManager } from '../services/BulkOperationsManager';
import { bulkOperationsQueue } from '../services/BulkOperationsQueue';
import { bulkOperationsHistory } from '../services/BulkOperationsHistory';
import { dataValidationService } from '../services/DataValidationService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  Play, 
  StopSquare, 
  RefreshCw, 
  Database, 
  List, 
  History, 
  Settings,
  Upload,
  Download,
  Edit,
  Trash2
} from 'lucide-react';

/**
 * BulkOperationsTestSuite - Comprehensive test suite for bulk operations
 * Demonstrates all functionality and integration points
 */
const BulkOperationsTestSuite = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);
  const [progress, setProgress] = useState(0);

  // Register test schema
  useEffect(() => {
    const testSchema = {
      name: 'Test Data Schema',
      description: 'Schema for testing bulk operations',
      required: ['id', 'name'],
      fields: {
        id: {
          type: 'number',
          range: [1, 10000],
          custom: (value) => {
            if (value <= 0) {
              return { error: { message: 'ID must be positive' } };
            }
            return null;
          }
        },
        name: {
          type: 'string',
          length: { min: 2, max: 100 },
          format: /^[A-Za-z\s]+$/
        },
        email: {
          type: 'string',
          format: 'email'
        },
        age: {
          type: 'number',
          range: [0, 120]
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'pending']
        }
      },
      customValidations: [
        {
          validate: (data) => {
            const errors = [];
            if (data.age && data.age < 18 && data.status === 'active') {
              errors.push({
                field: 'status',
                message: 'Cannot be active if under 18'
              });
            }
            return { errors };
          }
        }
      ]
    };

    dataValidationService.registerSchema('test-schema', testSchema);
  }, []);

  const runTestSuite = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults([]);
    
    const tests = [
      testBulkImport,
      testBulkExport,
      testBulkUpdate,
      testBulkDelete,
      testValidationIntegration,
      testQueueManagement,
      testHistoryTracking,
      testErrorHandling
    ];

    for (let i = 0; i < tests.length; i++) {
      setCurrentTest(tests[i].name);
      setProgress(((i + 1) / tests.length) * 100);
      
      try {
        const result = await tests[i]();
        setTestResults(prev => [...prev, {
          name: tests[i].name,
          status: 'passed',
          result,
          timestamp: new Date().toISOString()
        }]);
      } catch (error) {
        setTestResults(prev => [...prev, {
          name: tests[i].name,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        }]);
      }
    }

    setIsRunning(false);
    setCurrentTest(null);
  };

  const testBulkImport = async () => {
    const testData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Test User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      age: 20 + (i % 50),
      status: i % 3 === 0 ? 'active' : 'inactive'
    }));

    const operation = bulkOperationsManager.createOperation({
      type: 'import',
      name: 'Test Import Operation',
      description: 'Testing bulk import functionality',
      batchSize: 20,
      validationSchema: 'test-schema',
      data: testData
    });

    bulkOperationsManager.addToQueue(operation.id);
    
    // Wait for completion
    await new Promise(resolve => {
      const checkCompletion = () => {
        const op = bulkOperationsManager.getOperation(operation.id);
        if (op.status === 'completed' || op.status === 'failed') {
          resolve(op);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    });

    return { operationId: operation.id, items: testData.length };
  };

  const testBulkExport = async () => {
    const operation = bulkOperationsManager.createOperation({
      type: 'export',
      name: 'Test Export Operation',
      description: 'Testing bulk export functionality',
      batchSize: 30,
      query: { type: 'test-data' },
      format: 'json'
    });

    bulkOperationsManager.addToQueue(operation.id);
    
    // Wait for completion
    await new Promise(resolve => {
      const checkCompletion = () => {
        const op = bulkOperationsManager.getOperation(operation.id);
        if (op.status === 'completed' || op.status === 'failed') {
          resolve(op);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    });

    return { operationId: operation.id };
  };

  const testBulkUpdate = async () => {
    const operation = bulkOperationsManager.createOperation({
      type: 'update',
      name: 'Test Update Operation',
      description: 'Testing bulk update functionality',
      batchSize: 25,
      query: { type: 'test-data' },
      updates: { status: 'pending' }
    });

    bulkOperationsManager.addToQueue(operation.id);
    
    // Wait for completion
    await new Promise(resolve => {
      const checkCompletion = () => {
        const op = bulkOperationsManager.getOperation(operation.id);
        if (op.status === 'completed' || op.status === 'failed') {
          resolve(op);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    });

    return { operationId: operation.id };
  };

  const testBulkDelete = async () => {
    const operation = bulkOperationsManager.createOperation({
      type: 'delete',
      name: 'Test Delete Operation',
      description: 'Testing bulk delete functionality',
      batchSize: 15,
      query: { type: 'test-data' }
    });

    bulkOperationsManager.addToQueue(operation.id);
    
    // Wait for completion
    await new Promise(resolve => {
      const checkCompletion = () => {
        const op = bulkOperationsManager.getOperation(operation.id);
        if (op.status === 'completed' || op.status === 'failed') {
          resolve(op);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    });

    return { operationId: operation.id };
  };

  const testValidationIntegration = async () => {
    // Test data with some invalid entries
    const testData = [
      { id: 1, name: 'Valid User', email: 'valid@example.com', age: 25, status: 'active' },
      { id: -1, name: 'Invalid ID', email: 'invalid@example.com', age: 25, status: 'active' }, // Invalid ID
      { id: 2, name: '123', email: 'invalid-email', age: 25, status: 'active' }, // Invalid name and email
      { id: 3, name: 'Young User', email: 'young@example.com', age: 16, status: 'active' } // Underage active user
    ];

    const report = await dataValidationService.preValidateForBulkOperation('test-schema', testData);
    
    return {
      totalItems: testData.length,
      validItems: report.validItems,
      invalidItems: report.invalidItems,
      canProceed: report.canProceed,
      recommendations: report.recommendations
    };
  };

  const testQueueManagement = async () => {
    // Create multiple operations with different priorities
    const operations = [];
    
    for (let i = 0; i < 3; i++) {
      const op = bulkOperationsManager.createOperation({
        type: 'import',
        name: `Queue Test ${i + 1}`,
        description: `Testing queue priority ${i + 1}`,
        batchSize: 10,
        data: Array.from({ length: 50 }, (_, j) => ({ id: j + 1, name: `Item ${j + 1}` }))
      });
      operations.push(op);
    }

    // Add to queue with different priorities
    bulkOperationsQueue.enqueue(operations[0].id, 'high');
    bulkOperationsQueue.enqueue(operations[1].id, 'normal');
    bulkOperationsQueue.enqueue(operations[2].id, 'low');

    const queueStatus = bulkOperationsQueue.getQueueStatus();
    
    return {
      queueStatus,
      operations: operations.map(op => op.id)
    };
  };

  const testHistoryTracking = async () => {
    // Wait a moment for operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    const history = bulkOperationsHistory.getHistory();
    const stats = bulkOperationsHistory.getStatistics();
    const auditLogs = bulkOperationsHistory.getAuditLogs(history[0]?.operationId || '');

    return {
      totalOperations: history.length,
      statistics: stats,
      recentAuditLogs: auditLogs.slice(0, 10)
    };
  };

  const testErrorHandling = async () => {
    // Create an operation that will fail
    const operation = bulkOperationsManager.createOperation({
      type: 'import',
      name: 'Error Test Operation',
      description: 'Testing error handling',
      batchSize: 10,
      validationSchema: 'test-schema',
      data: [{ invalid: 'data' }] // Invalid data
    });

    bulkOperationsManager.addToQueue(operation.id);
    
    // Wait for failure
    await new Promise(resolve => {
      const checkCompletion = () => {
        const op = bulkOperationsManager.getOperation(operation.id);
        if (op.status === 'failed') {
          resolve(op);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    });

    return {
      operationId: operation.id,
      status: 'failed',
      errors: operation.errors.length
    };
  };

  const getTestStatusColor = (status) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Database className="h-6 w-6 text-blue-600" />
            <span>Bulk Operations Test Suite</span>
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive testing of bulk operations functionality</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={runTestSuite} disabled={isRunning}>
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running Tests...' : 'Run Test Suite'}
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <List className="h-5 w-5" />
              <span>Test Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Test:</span>
                <span className="font-medium">{currentTest || 'Initializing...'}</span>
              </div>
              <Progress value={progress} className="w-full" />
              <div className="text-sm text-gray-600">
                {testResults.length} tests completed • {Math.round(progress)}% complete
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Test Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{result.name}</h3>
                        <Badge className={getTestStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(result.timestamp).toLocaleString()}
                      </p>
                      {result.error && (
                        <p className="text-red-600 text-sm mt-2">Error: {result.error}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {result.result && (
                        <div className="text-sm text-gray-600">
                          {JSON.stringify(result.result, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {testResults.length === 0 && !isRunning && (
              <div className="text-center py-8 text-gray-500">
                No test results yet. Click "Run Test Suite" to begin testing.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Test Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Tests</p>
                      <p className="text-2xl font-bold">{testResults.length}</p>
                    </div>
                    <Database className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Passed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {testResults.filter(r => r.status === 'passed').length}
                      </p>
                    </div>
                    <Upload className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Failed</p>
                      <p className="text-2xl font-bold text-red-600">
                        {testResults.filter(r => r.status === 'failed').length}
                      </p>
                    </div>
                    <Download className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {testResults.length > 0 
                          ? Math.round((testResults.filter(r => r.status === 'passed').length / testResults.length) * 100)
                          : 0}%
                      </p>
                    </div>
                    <Edit className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkOperationsTestSuite;
