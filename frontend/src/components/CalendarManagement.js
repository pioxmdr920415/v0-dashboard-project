import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSheetData } from '../utils/api';
import { useApp } from '../context/AppContext';
import Header from './Header';

const CalendarManagement = () => {
  const { showToast, cacheSheetData, getCachedSheetData } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const exportToCSV = () => {
    if (filteredData.length === 0) {
      showToast('No data to export', 'error');
      return;
    }

    const headers = ['Event/Task', 'Date', 'Time', 'Location', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `calendar_events_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Data exported successfully', 'success');
  };

  const handlePrint = () => {
    window.print();
    showToast('Print dialog opened', 'info');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await fetchSheetData('event');
      const sheetData = result.data || [];
      setData(sheetData);
      setFilteredData(sheetData);
      await cacheSheetData('event', sheetData);
    } catch (error) {
      const cached = await getCachedSheetData('event');
      if (cached && cached.data) {
        setData(cached.data);
        setFilteredData(cached.data);
        showToast('Loaded cached data', 'info');
      } else {
        showToast('Failed to load data', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(data);
    } else {
      const filtered = data.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredData(filtered);
    }
  }, [searchTerm, data]);

  return (
    <div>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="bg-white border-2 border-gray-300 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                🔙 Back
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📅 Calendar Management</h1>
                <p className="text-sm mt-1 text-gray-600">{filteredData.length} events found</p>
              </div>
            </div>

            {/* Export and Print Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                data-testid="export-csv-button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                data-testid="print-button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 md:p-6 shadow-md mb-6">
            <input
              type="text"
              placeholder="Search events and tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-all"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {filteredData.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No events scheduled</h3>
                  <p className="text-gray-600">No data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-b from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-gray-700">Event/Task</th>
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-gray-700">Time</th>
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-gray-700">Location</th>
                        <th className="px-4 md:px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 md:px-6 py-4 font-semibold text-gray-900">{item['Event/Task'] || ''}</td>
                          <td className="px-4 md:px-6 py-4 text-gray-600">{item['Date'] || ''}</td>
                          <td className="px-4 md:px-6 py-4 text-gray-600">{item['Time'] || ''}</td>
                          <td className="px-4 md:px-6 py-4 text-gray-600">{item['Location'] || ''}</td>
                          <td className="px-4 md:px-6 py-4">
                            <span
                              className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${
                                item['Status'] === 'Upcoming'
                                  ? 'bg-blue-100 text-blue-700'
                                  : item['Status'] === 'Completed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {item['Status'] || ''}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarManagement;
