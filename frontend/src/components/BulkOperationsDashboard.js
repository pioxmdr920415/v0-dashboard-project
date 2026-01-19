import React, { useState, useEffect, useMemo } from 'react';
import { bulkOperationsManager } from '../services/BulkOperationsManager';
import { dataValidationService } from '../services/DataValidationService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { 
  Play, 
  Pause, 
  StopSquare, 
  RefreshCw, 
  Plus, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Database,
  Settings,
  Activity,
  List,
  Eye,
  FileText,
  Users
} from 'lucide-react';

const BulkOperationsDashboard = () => {
  const [operations, setOperations] = useState([]);
  const [queueStatus, setQueueStatus] = useState({});
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: ''
  });
  const [sortBy, setSortBy] = useState('startTime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [config, setConfig] = useState({
    batchSize: 100,
    retryAttempts: 3,
    maxConcurrent: 3,
    validationEnabled: true
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOperation, setNewOperation] = useState({
    type: 'import',
    name: '',
    description: '',
    batchSize: 100,
    validationSchema: '',
    failOnValidationError: false,
    data: null
  });

  useEffect(() => {
    // Load initial data
    loadInitialData();
    
    // Set up listeners
    const handleOperationEvent = (event, data) => {
      loadInitialData();
    };

    bulkOperationsManager.addListener(handleOperationEvent);
    dataValidationService.addListener(handleOperationEvent);

    return () => {
      bulkOperationsManager.removeListener(handleOperationEvent);
      dataValidationService.removeListener(handleOperationEvent);
    };
  }, []);

  const loadInitialData = () => {
    setOperations(bulkOperationsManager.getAllOperations());
    setQueueStatus(bulkOperationsManager.getQueueStatus());
    
    // Load schemas for validation
    const schemaEntries = Array.from(dataValidationService.schemas.entries());
    const schemaList = schemaEntries.map(([id, schema]) => ({
      id,
      name: schema.name || id,
      description: schema.description || ''
    }));
    setSchemas(schemaList);
  };

  const filteredOperations = useMemo(() => {
    let filtered = operations;

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(op => op.status === filters.status);
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(op => op.type === filters.type);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(op => 
        op.id.toLowerCase().includes(searchLower) ||
        op.type.toLowerCase().includes(searchLower) ||
        (op.config.name && op.config.name.toLowerCase().includes(searchLower)) ||
        (op.config.description && op.config.description.toLowerCase().includes(searchLower))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'startTime':
          aVal = new Date(a.startTime || a.metadata?.createdAt);
          bVal = new Date(b.startTime || b.metadata?.createdAt);
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        case 'progress':
          aVal = a.progress;
          bVal = b.progress;
          break;
        default:
          aVal = new Date(a.startTime || a.metadata?.createdAt);
          bVal = new Date(b.startTime || b.metadata?.createdAt);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [operations, filters, sortBy, sortOrder]);

  const getOperationIcon = (type) => {
    switch (type) {
      case 'import': return <Upload className="h-4 w-4" />;
      case 'export': return <Download className="h-4 w-4" />;
      case 'update': return <Edit className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> },
      running: { color: 'bg-blue-100 text-blue-800', icon: <Activity className="h-3 w-3" /> },
      completed: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      failed: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      cancelled: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="h-3 w-3" /> }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={config.color}>
        {config.icon}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const handleCreateOperation = async () => {
    try {
      const operation = bulkOperationsManager.createOperation({
        type: newOperation.type,
        name: newOperation.name,
        description: newOperation.description,
        batchSize: parseInt(newOperation.batchSize),
        validationSchema: newOperation.validationSchema,
        failOnValidationError: newOperation.failOnValidationError,
        data: newOperation.data,
        createdBy: 'user'
      });

      setShowCreateModal(false);
      setNewOperation({
        type: 'import',
        name: '',
        description: '',
        batchSize: 100,
        validationSchema: '',
        failOnValidationError: false,
        data: null
      });
    } catch (error) {
      console.error('Error creating operation:', error);
    }
  };

  const handleQueueOperation = (operationId) => {
    try {
      bulkOperationsManager.addToQueue(operationId);
    } catch (error) {
      console.error('Error queuing operation:', error);
    }
  };

  const handleCancelOperation = async (operationId) => {
    try {
      await bulkOperationsManager.cancelOperation(operationId);
    } catch (error) {
      console.error('Error cancelling operation:', error);
    }
  };

  const handleClearCompleted = () => {
    bulkOperationsManager.clearCompletedOperations();
  };

  const handleConfigUpdate = () => {
    bulkOperationsManager.configure(config);
  };

  const formatDuration = (ms) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Database className="h-6 w-6 text-blue-600" />
            <span>Bulk Operations Dashboard</span>
          </h1>
          <p className="text-gray-600 mt-1">Manage and monitor bulk data operations</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Operation
          </Button>
          <Button variant="outline" onClick={loadInitialData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <List className="h-5 w-5" />
            <span>Queue Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${queueStatus.isProcessing ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div>
                <div className="text-sm font-medium">Processing</div>
                <div className="text-xs text-gray-500">{queueStatus.isProcessing ? 'Active' : 'Idle'}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Queue Length</div>
              <div className="text-2xl font-bold">{queueStatus.queueLength}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Config</div>
              <div className="text-sm text-gray-600">
                Batch: {config.batchSize} | Retries: {config.retryAttempts}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearCompleted}
                disabled={operations.filter(op => op.status === 'completed' || op.status === 'failed').length === 0}
              >
                Clear Completed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Batch Size</label>
              <Input
                type="number"
                value={config.batchSize}
                onChange={(e) => setConfig({...config, batchSize: parseInt(e.target.value)})}
                min="1"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Retry Attempts</label>
              <Input
                type="number"
                value={config.retryAttempts}
                onChange={(e) => setConfig({...config, retryAttempts: parseInt(e.target.value)})}
                min="0"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Concurrent</label>
              <Input
                type="number"
                value={config.maxConcurrent}
                onChange={(e) => setConfig({...config, maxConcurrent: parseInt(e.target.value)})}
                min="1"
                max="10"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleConfigUpdate}>Update Config</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operations">
            <List className="h-4 w-4 mr-2" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="queue">
            <Activity className="h-4 w-4 mr-2" />
            Queue
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <FileText className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <CardTitle>Operations</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {/* Filters */}
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => setFilters({...filters, status: value})}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={filters.type} 
                      onValueChange={(value) => setFilters({...filters, type: value})}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="import">Import</SelectItem>
                        <SelectItem value="export">Export</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 flex-1 max-w-md">
                    <Input
                      placeholder="Search operations..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => setSortBy(sortBy === 'startTime' ? 'startTime' : 'startTime')}>
                        Started {sortBy === 'startTime' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOperations.map((operation) => (
                      <TableRow key={operation.id}>
                        <TableCell className="font-mono text-sm">
                          {operation.startTime 
                            ? new Date(operation.startTime).toLocaleString()
                            : new Date(operation.metadata.createdAt).toLocaleString()
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getOperationIcon(operation.type)}
                            <span className="capitalize">{operation.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(operation.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={operation.progress} className="w-20" />
                            <span className="text-sm font-medium">{operation.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-green-600 font-medium">{operation.successItems}</span>/
                            <span className="text-red-600 font-medium">{operation.failedItems}</span>/
                            <span className="text-gray-600">{operation.totalItems}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {operation.duration ? formatDuration(operation.duration) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {operation.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleQueueOperation(operation.id)}
                              >
                                Queue
                              </Button>
                            )}
                            {operation.status === 'running' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCancelOperation(operation.id)}
                              >
                                Cancel
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => console.log('View details:', operation)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Queue Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queueStatus.queuedOperations.map((operation, index) => (
                  <Card key={operation.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <Badge variant="secondary">#{index + 1}</Badge>
                          <div>
                            <div className="font-medium">{operation.config.name || operation.id}</div>
                            <div className="text-sm text-gray-600 capitalize">{operation.type}</div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {operation.totalItems} items
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(operation.status)}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCancelOperation(operation.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {queueStatus.queueLength === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No operations in queue
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Operations Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Operations</p>
                        <p className="text-2xl font-bold">{operations.length}</p>
                      </div>
                      <Database className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Completed</p>
                        <p className="text-2xl font-bold text-green-600">
                          {operations.filter(op => op.status === 'completed').length}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Failed</p>
                        <p className="text-2xl font-bold text-red-600">
                          {operations.filter(op => op.status === 'failed').length}
                        </p>
                      </div>
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {operations.length > 0 
                            ? Math.round((operations.filter(op => op.status === 'completed').length / operations.length) * 100)
                            : 0}%
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Operation Type Distribution */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Operation Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {['import', 'export', 'update', 'delete'].map(type => {
                    const count = operations.filter(op => op.type === type).length;
                    return (
                      <Card key={type}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                {getOperationIcon(type)}
                                <span className="capitalize font-medium">{type}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{count} operations</p>
                            </div>
                            <Badge variant="secondary">
                              {count > 0 ? Math.round((count / operations.length) * 100) : 0}%
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Operation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Operation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operation Type</label>
                <Select 
                  value={newOperation.type} 
                  onValueChange={(value) => setNewOperation({...newOperation, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="import">Import</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <Input
                  value={newOperation.name}
                  onChange={(e) => setNewOperation({...newOperation, name: e.target.value})}
                  placeholder="Operation name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <Input
                  value={newOperation.description}
                  onChange={(e) => setNewOperation({...newOperation, description: e.target.value})}
                  placeholder="Operation description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Batch Size</label>
                <Input
                  type="number"
                  value={newOperation.batchSize}
                  onChange={(e) => setNewOperation({...newOperation, batchSize: parseInt(e.target.value)})}
                  min="1"
                  max="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Validation Schema</label>
                <Select 
                  value={newOperation.validationSchema} 
                  onValueChange={(value) => setNewOperation({...newOperation, validationSchema: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select schema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {schemas.map(schema => (
                      <SelectItem key={schema.id} value={schema.id}>
                        {schema.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="failOnValidationError"
                  checked={newOperation.failOnValidationError}
                  onChange={(e) => setNewOperation({...newOperation, failOnValidationError: e.target.checked})}
                />
                <label htmlFor="failOnValidationError" className="text-sm text-gray-700">
                  Fail on validation errors
                </label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateOperation}>
                  Create Operation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BulkOperationsDashboard;
