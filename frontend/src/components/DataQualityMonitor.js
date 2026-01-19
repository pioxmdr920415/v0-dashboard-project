import React, { useState, useEffect, useCallback } from 'react';
import { dataValidationService } from '../services/DataValidationService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { AlertCircle, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';

const DataQualityMonitor = ({ schemaId, autoRefresh = 30000 }) => {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchMetrics = useCallback(async () => {
    if (!schemaId) return;

    try {
      const qualityMetrics = dataValidationService.getQualityMetrics(schemaId);
      setMetrics(qualityMetrics);
      setLastUpdate(new Date().toISOString());

      // Generate alerts based on metrics
      const newAlerts = generateAlerts(qualityMetrics);
      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
    }
  }, [schemaId]);

  const generateAlerts = (metrics) => {
    const newAlerts = [];

    // Quality score alerts
    if (metrics.qualityScore < 70) {
      newAlerts.push({
        id: 'low_quality_score',
        type: 'warning',
        severity: 'high',
        message: `Data quality score is low (${metrics.qualityScore}%)`,
        timestamp: new Date().toISOString()
      });
    } else if (metrics.qualityScore < 90) {
      newAlerts.push({
        id: 'medium_quality_score',
        type: 'info',
        severity: 'medium',
        message: `Data quality score is moderate (${metrics.qualityScore}%)`,
        timestamp: new Date().toISOString()
      });
    }

    // Error rate alerts
    const errorRate = metrics.totalValidations > 0 
      ? (metrics.invalidRecords / metrics.totalValidations) * 100 
      : 0;

    if (errorRate > 10) {
      newAlerts.push({
        id: 'high_error_rate',
        type: 'error',
        severity: 'critical',
        message: `High error rate detected: ${errorRate.toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Warning rate alerts
    const warningRate = metrics.totalValidations > 0 
      ? (metrics.warningRecords / metrics.totalValidations) * 100 
      : 0;

    if (warningRate > 20) {
      newAlerts.push({
        id: 'high_warning_rate',
        type: 'warning',
        severity: 'medium',
        message: `High warning rate detected: ${warningRate.toFixed(1)}%`,
        timestamp: new Date().toISOString()
      });
    }

    // Trend analysis
    if (metrics.totalValidations > 100) {
      const recentErrors = metrics.errorCount;
      const avgErrorsPerValidation = recentErrors / metrics.totalValidations;
      
      if (avgErrorsPerValidation > 0.5) {
        newAlerts.push({
          id: 'increasing_errors',
          type: 'warning',
          severity: 'high',
          message: 'Error trend is increasing - review data sources',
          timestamp: new Date().toISOString()
        });
      }
    }

    return newAlerts;
  };

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh && isMonitoring) {
      const interval = setInterval(fetchMetrics, autoRefresh);
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, autoRefresh, isMonitoring]);

  // Listen for validation updates
  useEffect(() => {
    const handleValidationUpdate = (event, data) => {
      if (data.schemaId === schemaId) {
        fetchMetrics();
      }
    };

    dataValidationService.addListener(handleValidationUpdate);
    return () => dataValidationService.removeListener(handleValidationUpdate);
  }, [schemaId, fetchMetrics]);

  const getQualityColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBg = (score) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  if (!schemaId) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>No schema selected for monitoring</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span>Data Quality Monitor</span>
              <Badge variant="secondary" className="ml-2">
                {schemaId}
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Real-time monitoring of data quality metrics and validation results
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isMonitoring ? "default" : "secondary"}>
              {isMonitoring ? 'Monitoring' : 'Paused'}
            </Badge>
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                Last updated: {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Quality Score */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="text-lg font-semibold">Quality Score</span>
              <span className={`text-2xl font-bold ${getQualityColor(metrics.qualityScore)}`}>
                {metrics.qualityScore}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress 
                value={metrics.qualityScore} 
                className={`h-3 ${getQualityBg(metrics.qualityScore)}`}
              />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatNumber(metrics.validRecords)}
                  </div>
                  <div className="text-sm text-green-700">Valid Records</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {formatNumber(metrics.invalidRecords)}
                  </div>
                  <div className="text-sm text-red-700">Invalid Records</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatNumber(metrics.warningRecords)}
                  </div>
                  <div className="text-sm text-yellow-700">Records with Warnings</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatNumber(metrics.totalValidations)}
                  </div>
                  <div className="text-sm text-blue-700">Total Validations</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Quality Alerts</span>
              <Badge variant="destructive">{alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'critical' 
                      ? 'bg-red-50 border-red-500' 
                      : alert.severity === 'high'
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {alert.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                      {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                      {alert.type === 'info' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      <span className="font-medium">{alert.message}</span>
                    </div>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Details */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Error Count</span>
                  <span className="font-medium text-red-600">{formatNumber(metrics.errorCount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Warning Count</span>
                  <span className="font-medium text-yellow-600">{formatNumber(metrics.warningCount)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <span className="font-medium text-red-600">
                    {metrics.totalValidations > 0 
                      ? ((metrics.invalidRecords / metrics.totalValidations) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Warning Rate</span>
                  <span className="font-medium text-yellow-600">
                    {metrics.totalValidations > 0 
                      ? ((metrics.warningRecords / metrics.totalValidations) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataQualityMonitor;
