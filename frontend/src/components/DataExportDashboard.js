import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from '../components/ui/use-toast';
import { dataExportService } from '../services/DataExportService';
import { bulkOperationsManager } from '../services/BulkOperationsManager';

const DataExportDashboard = () => {
  const [activeTab, setActiveTab] = useState('export');
  const [templates, setTemplates] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [exports, setExports] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [dataSource, setDataSource] = useState('api');
  const [query, setQuery] = useState('');
  const [fileName, setFileName] = useState('');
  const [exportId, setExportId] = useState(null);
  const progressIntervalRef = useRef(null);

  // Initialize data
  useEffect(() => {
    loadInitialData();
    setupEventListeners();
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const loadInitialData = async () => {
    try {
      // Load templates and configs
      const templateList = dataExportService.listTemplates();
      const configList = dataExportService.listExportConfigs();
      const exportHistory = dataExportService.getExportHistory();
      
      setTemplates(templateList);
      setConfigs(configList);
      setExports(exportHistory);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: "Error",
        description: "Failed to load export data",
        variant: "destructive"
      });
    }
  };

  const setupEventListeners = () => {
    // Listen for export events
    dataExportService.addListener((event, data) => {
      switch (event) {
        case 'export_started':
          setIsExporting(true);
          setExportId(data.id);
          toast({
            title: "Export Started",
            description: `Export ${data.id} has started`
          });
          break;
        case 'export_completed':
          setIsExporting(false);
          setExportProgress(100);
          toast({
            title: "Export Completed",
            description: `Export ${data.id} completed successfully`
          });
          loadInitialData();
          break;
        case 'export_failed':
          setIsExporting(false);
          toast({
            title: "Export Failed",
            description: `Export ${data.id} failed: ${data.errors[0]?.message}`,
            variant: "destructive"
          });
          break;
        case 'export_progress':
          setExportProgress(data.progress);
          break;
      }
    });

    // Listen for bulk operation events
    bulkOperationsManager.addListener((event, data) => {
      if (event === 'operation_progress' && data.type === 'export') {
        setExportProgress(Math.round((data.processedItems / data.totalItems) * 100));
      }
    });
  };

  const handleCreateTemplate = async () => {
    try {
      const template = dataExportService.createTemplate(`template_${Date.now()}`, {
        name: `Template ${templates.length + 1}`,
        description: 'Auto-generated template',
        format: exportFormat,
        fields: ['id', 'name', 'value', 'category'],
        filters: {},
        sorting: {},
        formatting: {}
      });
      
      setTemplates([...templates, template]);
      toast({
        title: "Template Created",
        description: "New export template has been created"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive"
      });
    }
  };

  const handleCreateConfig = async () => {
    try {
      const config = dataExportService.createExportConfig(`config_${Date.now()}`, {
        name: `Config ${configs.length + 1}`,
        description: 'Auto-generated config',
        templateId: selectedTemplate,
        dataSource,
        query: query ? JSON.parse(query) : {},
        format: exportFormat,
        options: {
          includeHeaders: true,
          delimiter: ',',
          encoding: 'utf-8'
        }
      });
      
      setConfigs([...configs, config]);
      toast({
        title: "Configuration Created",
        description: "New export configuration has been created"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create configuration",
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    if (!selectedTemplate && !query) {
      toast({
        title: "Error",
        description: "Please select a template or provide a query",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const exportRequest = {
        format: exportFormat,
        templateId: selectedTemplate,
        dataSource,
        query: query ? JSON.parse(query) : {},
        options: {
          includeHeaders: true,
          delimiter: ',',
          encoding: 'utf-8'
        },
        createdBy: 'user'
      };

      const result = await dataExportService.exportData(exportRequest, (progress) => {
        setExportProgress(progress.progress);
      });

      // Download file
      if (result.fileUrl) {
        const link = document.createElement('a');
        link.href = result.fileUrl;
        link.download = result.fileName || 'export';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Export Complete",
        description: "File has been downloaded successfully"
      });

    } catch (error) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleScheduleExport = async () => {
    try {
      const schedule = await dataExportService.scheduleExport({
        name: `Scheduled Export ${schedules.length + 1}`,
        configId: configs[0]?.id || null,
        cronExpression: '0 2 * * *', // Daily at 2 AM
        enabled: true
      });

      setSchedules([...schedules, schedule]);
      toast({
        title: "Schedule Created",
        description: "Export has been scheduled successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create schedule",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-yellow-500';
      case 'pending': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Export Management</h1>
        <div className="flex gap-2">
          <Button onClick={loadInitialData} variant="outline">
            Refresh
          </Button>
          <Button onClick={handleCreateTemplate} variant="outline">
            Create Template
          </Button>
          <Button onClick={handleCreateConfig} variant="outline">
            Create Config
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="configs">Configurations</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Quick Export</CardTitle>
              <CardDescription>Configure and execute data exports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template">Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataSource">Data Source</Label>
                  <Select value={dataSource} onValueChange={setDataSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="mock">Mock Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileName">File Name</Label>
                  <Input
                    id="fileName"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="Enter file name (optional)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="query">Query (JSON)</Label>
                <Textarea
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='{"limit": 1000, "filters": {}}'
                  rows={4}
                />
              </div>

              {isExporting && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Export Progress</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="w-full" />
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleExport} disabled={isExporting}>
                  {isExporting ? 'Exporting...' : 'Export Data'}
                </Button>
                <Button onClick={handleScheduleExport} variant="outline">
                  Schedule Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Export Templates</CardTitle>
              <CardDescription>Manage export templates and configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {templates.map(template => (
                    <Card key={template.id}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <span>{template.name}</span>
                          <Badge variant="secondary">{template.format}</Badge>
                        </CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Fields:</span>
                            <div className="mt-1 text-gray-600">
                              {template.fields.join(', ')}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>
                            <div className="mt-1 text-gray-600">
                              {new Date(template.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configs">
          <Card>
            <CardHeader>
              <CardTitle>Export Configurations</CardTitle>
              <CardDescription>Manage export configurations and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {configs.map(config => (
                    <Card key={config.id}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <span>{config.name}</span>
                          <Badge variant="outline">{config.format}</Badge>
                        </CardTitle>
                        <CardDescription>{config.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Template:</span>
                            <div className="mt-1 text-gray-600">
                              {config.templateId || 'None'}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Data Source:</span>
                            <div className="mt-1 text-gray-600">
                              {config.dataSource}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>
                            <div className="mt-1 text-gray-600">
                              {new Date(config.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
              <CardDescription>View and manage export history</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {exports.map(exportOp => (
                    <Card key={exportOp.id}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <span>Export {exportOp.id}</span>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(exportOp.status)}>
                              {exportOp.status}
                            </Badge>
                            <Badge variant="outline">{exportOp.format}</Badge>
                          </div>
                        </CardTitle>
                        <CardDescription>
                          Started: {new Date(exportOp.startTime).toLocaleString()}
                          {exportOp.endTime && ` | Completed: ${new Date(exportOp.endTime).toLocaleString()}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Items:</span>
                            <div className="mt-1 text-gray-600">
                              {exportOp.totalItems} total, {exportOp.exportedItems} exported
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span>
                            <div className="mt-1 text-gray-600">
                              {exportOp.duration}ms
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">File:</span>
                            <div className="mt-1 text-gray-600">
                              {exportOp.fileName || 'N/A'}
                            </div>
                          </div>
                        </div>
                        {exportOp.errors.length > 0 && (
                          <div className="mt-2">
                            <span className="font-medium text-red-600">Errors:</span>
                            <div className="mt-1 text-red-600 text-sm">
                              {exportOp.errors.map((error, index) => (
                                <div key={index}>{error.message}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>Export Schedules</CardTitle>
              <CardDescription>Manage scheduled export operations</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {schedules.map(schedule => (
                    <Card key={schedule.id}>
                      <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                          <span>{schedule.name}</span>
                          <Badge variant={schedule.enabled ? "default" : "secondary"}>
                            {schedule.enabled ? 'Active' : 'Disabled'}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Cron: {schedule.cronExpression}
                          {schedule.nextRun && ` | Next Run: ${new Date(schedule.nextRun).toLocaleString()}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Config:</span>
                            <div className="mt-1 text-gray-600">
                              {schedule.configId || 'None'}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>
                            <div className="mt-1 text-gray-600">
                              {new Date(schedule.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataExportDashboard;
