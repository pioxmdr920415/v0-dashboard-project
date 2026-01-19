import React, { useState, useEffect, useMemo } from 'react';
import { dataValidationService } from '../services/DataValidationService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Database,
  Settings
} from 'lucide-react';
import DataQualityMonitor from './DataQualityMonitor';

const ValidationDashboard = () => {
  const [schemas, setSchemas] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState('');
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    search: ''
  });
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Load all registered schemas
    const loadSchemas = () => {
      const schemaEntries = Array.from(dataValidationService.schemas.entries());
      const schemaList = schemaEntries.map(([id, schema]) => ({
        id,
        name: schema.name || id,
        description: schema.description || '',
        fields: Object.keys(schema.fields || {}),
        createdAt: schema.createdAt
      }));
      setSchemas(schemaList);
      
      if (schemaList.length > 0 && !selectedSchema) {
        setSelectedSchema(schemaList[0].id);
      }
    };

    loadSchemas();

    // Listen for schema changes
    const handleSchemaChange = () => {
      loadSchemas();
    };

    dataValidationService.addListener(handleSchemaChange);
    return () => dataValidationService.removeListener(handleSchemaChange);
  }, [selectedSchema]);

  useEffect(() => {
    if (selectedSchema) {
      loadResults();
    }
  }, [selectedSchema, filters, sortBy, sortOrder]);

  const loadResults = async () => {
    if (!selectedSchema) return;

    setLoading(true);
    try {
      const allResults = dataValidationService.getValidationResults(selectedSchema);
      setResults(allResults);
    } catch (error) {
      console.error('Error loading validation results:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    let filtered = results;

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(result => result.status === filters.status);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(result => 
        JSON.stringify(result.data).toLowerCase().includes(searchLower) ||
        result.errors.some(error => error.message.toLowerCase().includes(searchLower)) ||
        result.warnings.some(warning => warning.message.toLowerCase().includes(searchLower))
      );
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (filters.dateRange) {
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
          break;
      }

      filtered = filtered.filter(result => new Date(result.timestamp) >= cutoff);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'timestamp':
          aVal = new Date(a.timestamp);
          bVal = new Date(b.timestamp);
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'errorCount':
          aVal = a.errors.length;
          bVal = b.errors.length;
          break;
        case 'warningCount':
          aVal = a.warnings.length;
          bVal = a.warnings.length;
          break;
        default:
          aVal = a.timestamp;
          bVal = b.timestamp;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [results, filters, sortBy, sortOrder]);

  const getSchemaStats = useMemo(() => {
    if (!selectedSchema) return null;

    const total = results.length;
    const valid = results.filter(r => r.status === 'valid').length;
    const invalid = results.filter(r => r.status === 'invalid').length;
    const warnings = results.filter(r => r.status === 'warnings').length;
    const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0);
    const warningCount = results.reduce((sum, r) => sum + r.warnings.length, 0);

    return {
      total,
      valid,
      invalid,
      warnings,
      errorCount,
      warningCount,
      validRate: total > 0 ? ((valid / total) * 100).toFixed(1) : 0
    };
  }, [results, selectedSchema]);

  const exportResults = () => {
    const dataStr = JSON.stringify(filteredResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `validation-results-${selectedSchema}-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warnings':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'invalid':
        return 'bg-red-100 text-red-800';
      case 'warnings':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Database className="h-6 w-6 text-blue-600" />
            <span>Data Validation Dashboard</span>
          </h1>
          <p className="text-gray-600 mt-1">Monitor and manage data quality across all schemas</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'border-green-500 text-green-700' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
          </Button>
          <Button variant="outline" onClick={loadResults} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportResults}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Schema Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Schema Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Schema</label>
              <Select value={selectedSchema} onValueChange={setSelectedSchema}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a schema" />
                </SelectTrigger>
                <SelectContent>
                  {schemas.map(schema => (
                    <SelectItem key={schema.id} value={schema.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{schema.name}</span>
                        <span className="text-xs text-gray-500">{schema.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Stats</label>
              {getSchemaStats && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">{getSchemaStats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valid:</span>
                    <span className="text-green-600 font-medium">{getSchemaStats.valid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invalid:</span>
                    <span className="text-red-600 font-medium">{getSchemaStats.invalid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Warnings:</span>
                    <span className="text-yellow-600 font-medium">{getSchemaStats.warnings}</span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quality Score</label>
              {getSchemaStats && (
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${getSchemaStats.validRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-16">{getSchemaStats.validRate}%</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="monitor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monitor">
            <Activity className="h-4 w-4 mr-2" />
            Quality Monitor
          </TabsTrigger>
          <TabsTrigger value="results">
            <Search className="h-4 w-4 mr-2" />
            Validation Results
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor">
          <DataQualityMonitor 
            schemaId={selectedSchema}
            autoRefresh={autoRefresh ? 30000 : null}
          />
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <CardTitle>Validation Results</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {/* Filters */}
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => setFilters({...filters, status: value})}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="valid">Valid</SelectItem>
                        <SelectItem value="invalid">Invalid</SelectItem>
                        <SelectItem value="warnings">Warnings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={filters.dateRange} 
                      onValueChange={(value) => setFilters({...filters, dateRange: value})}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Date Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="1h">Last Hour</SelectItem>
                        <SelectItem value="24h">Last 24h</SelectItem>
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 flex-1 max-w-md">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search results..."
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
                      <TableHead onClick={() => setSortBy(sortBy === 'timestamp' ? 'timestamp' : 'timestamp')}>
                        Timestamp {sortBy === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead onClick={() => setSortBy(sortBy === 'status' ? 'status' : 'status')}>
                        Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead onClick={() => setSortBy(sortBy === 'errorCount' ? 'errorCount' : 'errorCount')}>
                        Errors {sortBy === 'errorCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead onClick={() => setSortBy(sortBy === 'warningCount' ? 'warningCount' : 'warningCount')}>
                        Warnings {sortBy === 'warningCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {new Date(result.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(result.status)}>
                            {getStatusIcon(result.status)}
                            <span className="ml-1 capitalize">{result.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600 font-medium">{result.errors.length}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-yellow-600 font-medium">{result.warnings.length}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{result.duration?.toFixed(2)}ms</span>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              // Show detailed view
                              console.log('Detailed result:', result);
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Validation Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Validations</p>
                        <p className="text-2xl font-bold">{getSchemaStats?.total || 0}</p>
                      </div>
                      <Database className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold text-green-600">{getSchemaStats?.validRate || 0}%</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Errors</p>
                        <p className="text-2xl font-bold text-red-600">{getSchemaStats?.errorCount || 0}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Warnings</p>
                        <p className="text-2xl font-bold text-yellow-600">{getSchemaStats?.warningCount || 0}</p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ValidationDashboard;
