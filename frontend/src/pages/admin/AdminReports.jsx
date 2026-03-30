// src/pages/admin/AdminReports.jsx
import React, { useState, useEffect } from 'react';

const AdminReports = ({ adminData, getAuthHeaders, showNotification }) => {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('appointments');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState(getDefaultStartDate('week'));
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');

  // الحصول على تاريخ البدء الافتراضي حسب النطاق
  function getDefaultStartDate(range) {
    const today = new Date();
    switch(range) {
      case 'today':
        return today.toISOString().split('T')[0];
      case 'week':
        const weekAgo = new Date(today.setDate(today.getDate() - 7));
        return weekAgo.toISOString().split('T')[0];
      case 'month':
        const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
        return monthAgo.toISOString().split('T')[0];
      case 'quarter':
        const quarterAgo = new Date(today.setMonth(today.getMonth() - 3));
        return quarterAgo.toISOString().split('T')[0];
      case 'year':
        const yearAgo = new Date(today.setFullYear(today.getFullYear() - 1));
        return yearAgo.toISOString().split('T')[0];
      default:
        return new Date().toISOString().split('T')[0];
    }
  }

  // تحديث التاريخ عند تغيير النطاق
  useEffect(() => {
    setStartDate(getDefaultStartDate(dateRange));
  }, [dateRange]);

  // جلب بيانات التقرير
  useEffect(() => {
    fetchReportData();
  }, [reportType, startDate, endDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/admin/reports.php?type=${reportType}&startDate=${startDate}&endDate=${endDate}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();

      if (data.success) {
        setReportData(data.data);
      } else {
        showNotification('error', data.error || 'Failed to load report data');
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      showNotification('error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // تصدير التقرير
  const handleExport = () => {
    if (!reportData) return;

    if (exportFormat === 'pdf') {
      // تصدير PDF
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Healthcare System Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #1e1e2f; }
              .header { text-align: center; margin-bottom: 30px; }
              .date { color: #666; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background: #667eea; color: white; padding: 10px; text-align: left; }
              td { padding: 8px; border-bottom: 1px solid #ddd; }
              .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
              .summary-item { display: inline-block; margin-right: 30px; }
              .summary-value { font-size: 24px; font-weight: bold; color: #667eea; }
              .summary-label { color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${getReportTitle()}</h1>
              <div class="date">Period: ${startDate} to ${endDate}</div>
            </div>
            ${generateReportHTML()}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } else if (exportFormat === 'csv') {
      // تصدير CSV
      const csv = generateCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportType}_${startDate}_${endDate}.csv`;
      a.click();
    } else if (exportFormat === 'excel') {
      // تصدير Excel (XML format)
      const excel = generateExcel();
      const blob = new Blob([excel], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportType}_${startDate}_${endDate}.xls`;
      a.click();
    }
  };

  const getReportTitle = () => {
    switch(reportType) {
      case 'appointments': return 'Appointments Report';
      case 'patients': return 'Patients Report';
      case 'doctors': return 'Doctors Performance Report';
      case 'revenue': return 'Financial Report';
      case 'queue': return 'Queue Analytics Report';
      default: return 'System Report';
    }
  };

  const generateReportHTML = () => {
    if (!reportData) return '';

    switch(reportType) {
      case 'appointments':
        return `
          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">${reportData.totalAppointments || 0}</div>
              <div class="summary-label">Total Appointments</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${reportData.completedAppointments || 0}</div>
              <div class="summary-label">Completed</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${reportData.cancelledAppointments || 0}</div>
              <div class="summary-label">Cancelled</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.appointments?.map(app => `
                <tr>
                  <td>${new Date(app.appointmentDate).toLocaleDateString()}</td>
                  <td>${app.patientName}</td>
                  <td>Dr. ${app.doctorName}</td>
                  <td>${app.status}</td>
                  <td>${app.type}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

      case 'revenue':
        return `
          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">$${reportData.totalRevenue?.toFixed(2) || 0}</div>
              <div class="summary-label">Total Revenue</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">$${reportData.averagePerDay?.toFixed(2) || 0}</div>
              <div class="summary-label">Average per Day</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${reportData.totalAppointments || 0}</div>
              <div class="summary-label">Appointments</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Appointments</th>
                <th>Completed</th>
                <th>Revenue</th>
                <th>Avg per Appointment</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.daily?.map(day => `
                <tr>
                  <td>${day.date}</td>
                  <td>${day.total}</td>
                  <td>${day.completed}</td>
                  <td>$${day.revenue?.toFixed(2)}</td>
                  <td>$${day.average?.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

      default:
        return '<p>No data available</p>';
    }
  };

  const generateCSV = () => {
    if (!reportData) return '';

    let csv = '';
    
    switch(reportType) {
      case 'appointments':
        csv = 'Date,Patient,Doctor,Status,Type\n';
        reportData.appointments?.forEach(app => {
          csv += `${app.appointmentDate},${app.patientName},Dr. ${app.doctorName},${app.status},${app.type}\n`;
        });
        break;

      case 'revenue':
        csv = 'Date,Appointments,Completed,Revenue,Average per Appointment\n';
        reportData.daily?.forEach(day => {
          csv += `${day.date},${day.total},${day.completed},${day.revenue},${day.average}\n`;
        });
        break;

      default:
        csv = 'No data';
    }

    return csv;
  };

  const generateExcel = () => {
    // Simple Excel HTML format
    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${getReportTitle()}</title>
        </head>
        <body>
          <table>
            ${generateReportHTML().replace(/<div class="summary">.*?<\/div>/s, '')}
          </table>
        </body>
      </html>
    `;
  };

  // عرض لوحة التحكم للتقرير
  const renderReportPreview = () => {
    if (loading) {
      return (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading report data...</p>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="empty-state">
          <i className="fas fa-chart-line"></i>
          <p>No data available for the selected period</p>
        </div>
      );
    }

    switch(reportType) {
      case 'appointments':
        return (
          <div className="report-preview">
            <div className="report-summary">
              <div className="summary-card">
                <span className="summary-value">{reportData.totalAppointments || 0}</span>
                <span className="summary-label">Total Appointments</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.completedAppointments || 0}</span>
                <span className="summary-label">Completed</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.cancelledAppointments || 0}</span>
                <span className="summary-label">Cancelled</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.noShowAppointments || 0}</span>
                <span className="summary-label">No Show</span>
              </div>
            </div>

            <div className="report-chart">
              <h4>Appointments by Day</h4>
              <div className="chart-bars">
                {reportData.daily?.map((day, index) => (
                  <div key={index} className="chart-bar-container">
                    <div 
                      className="chart-bar"
                      style={{ height: `${(day.count / reportData.maxDaily) * 150}px` }}
                    >
                      <span className="bar-value">{day.count}</span>
                    </div>
                    <span className="bar-label">{day.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-table">
              <h4>Appointments Details</h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.appointments?.map((app, index) => (
                    <tr key={index}>
                      <td>{new Date(app.appointmentDate).toLocaleDateString()}</td>
                      <td>{app.patientName}</td>
                      <td>Dr. {app.doctorName}</td>
                      <td>{app.department || app.specialization}</td>
                      <td>
                        <span className={`status-badge ${app.status}`}>
                          {app.status}
                        </span>
                      </td>
                      <td>{app.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'patients':
        return (
          <div className="report-preview">
            <div className="report-summary">
              <div className="summary-card">
                <span className="summary-value">{reportData.totalPatients || 0}</span>
                <span className="summary-label">Total Patients</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.newPatients || 0}</span>
                <span className="summary-label">New Patients</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.activePatients || 0}</span>
                <span className="summary-label">Active</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.pendingApprovals || 0}</span>
                <span className="summary-label">Pending</span>
              </div>
            </div>

            <div className="report-chart">
              <h4>Patient Registrations</h4>
              <div className="chart-bars">
                {reportData.registrations?.map((reg, index) => (
                  <div key={index} className="chart-bar-container">
                    <div 
                      className="chart-bar"
                      style={{ height: `${(reg.count / reportData.maxRegistrations) * 150}px` }}
                    >
                      <span className="bar-value">{reg.count}</span>
                    </div>
                    <span className="bar-label">{reg.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-table">
              <h4>Recent Patients</h4>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Registration Date</th>
                    <th>Status</th>
                    <th>Appointments</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.patients?.map((patient, index) => (
                    <tr key={index}>
                      <td>{patient.name}</td>
                      <td>{patient.email}</td>
                      <td>{patient.phone}</td>
                      <td>{new Date(patient.registeredAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge ${patient.status}`}>
                          {patient.status}
                        </span>
                      </td>
                      <td>{patient.appointmentCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'doctors':
        return (
          <div className="report-preview">
            <div className="report-summary">
              <div className="summary-card">
                <span className="summary-value">{reportData.totalDoctors || 0}</span>
                <span className="summary-label">Total Doctors</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.activeDoctors || 0}</span>
                <span className="summary-label">Active</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.totalAppointments || 0}</span>
                <span className="summary-label">Appointments</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.averageRating?.toFixed(1) || 0}</span>
                <span className="summary-label">Avg Rating</span>
              </div>
            </div>

            <div className="report-table">
              <h4>Doctor Performance</h4>
              <table>
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Specialization</th>
                    <th>Appointments</th>
                    <th>Completed</th>
                    <th>Cancelled</th>
                    <th>Rating</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.doctors?.map((doctor, index) => (
                    <tr key={index}>
                      <td>Dr. {doctor.name}</td>
                      <td>{doctor.specialization}</td>
                      <td>{doctor.totalAppointments || 0}</td>
                      <td>{doctor.completedAppointments || 0}</td>
                      <td>{doctor.cancelledAppointments || 0}</td>
                      <td>
                        <div className="rating-display">
                          <span>{doctor.rating || 0}</span>
                          <i className="fas fa-star"></i>
                        </div>
                      </td>
                      <td>${doctor.revenue?.toFixed(2) || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'revenue':
        return (
          <div className="report-preview">
            <div className="report-summary">
              <div className="summary-card highlight">
                <span className="summary-value">${reportData.totalRevenue?.toFixed(2) || 0}</span>
                <span className="summary-label">Total Revenue</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">${reportData.averagePerDay?.toFixed(2) || 0}</span>
                <span className="summary-label">Average per Day</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">${reportData.averagePerAppointment?.toFixed(2) || 0}</span>
                <span className="summary-label">Avg per Appointment</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.totalAppointments || 0}</span>
                <span className="summary-label">Appointments</span>
              </div>
            </div>

            <div className="report-chart">
              <h4>Daily Revenue</h4>
              <div className="chart-bars">
                {reportData.daily?.map((day, index) => (
                  <div key={index} className="chart-bar-container">
                    <div 
                      className="chart-bar revenue"
                      style={{ height: `${(day.revenue / reportData.maxRevenue) * 150}px` }}
                    >
                      <span className="bar-value">${day.revenue}</span>
                    </div>
                    <span className="bar-label">{day.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-table">
              <h4>Revenue Breakdown</h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Appointments</th>
                    <th>Completed</th>
                    <th>Revenue</th>
                    <th>Average per Appointment</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.daily?.map((day, index) => (
                    <tr key={index}>
                      <td>{day.date}</td>
                      <td>{day.total}</td>
                      <td>{day.completed}</td>
                      <td>${day.revenue?.toFixed(2)}</td>
                      <td>${day.average?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'queue':
        return (
          <div className="report-preview">
            <div className="report-summary">
              <div className="summary-card">
                <span className="summary-value">{reportData.totalQueue || 0}</span>
                <span className="summary-label">Total in Queue</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.averageWaitTime || 0}</span>
                <span className="summary-label">Avg Wait (mins)</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.maxWaitTime || 0}</span>
                <span className="summary-label">Max Wait (mins)</span>
              </div>
              <div className="summary-card">
                <span className="summary-value">{reportData.emergencyCases || 0}</span>
                <span className="summary-label">Emergency</span>
              </div>
            </div>

            <div className="report-chart">
              <h4>Queue Volume by Hour</h4>
              <div className="chart-bars">
                {reportData.hourly?.map((hour, index) => (
                  <div key={index} className="chart-bar-container">
                    <div 
                      className="chart-bar queue"
                      style={{ height: `${(hour.count / reportData.maxHourly) * 150}px` }}
                    >
                      <span className="bar-value">{hour.count}</span>
                    </div>
                    <span className="bar-label">{hour.hour}:00</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="report-table">
              <h4>Queue Analytics</h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total Patients</th>
                    <th>Avg Wait Time</th>
                    <th>Max Wait Time</th>
                    <th>Emergency</th>
                    <th>No Show</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.daily?.map((day, index) => (
                    <tr key={index}>
                      <td>{day.date}</td>
                      <td>{day.total}</td>
                      <td>{day.avgWait} mins</td>
                      <td>{day.maxWait} mins</td>
                      <td>{day.emergency}</td>
                      <td>{day.noShow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return <p>Select a report type to view data</p>;
    }
  };

  return (
    <div className="admin-reports-container">
      {/* Header */}
      <div className="content-header">
        <h2>
          <i className="fas fa-chart-line"></i>
          REPORTS & ANALYTICS
        </h2>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={handleExport}
            disabled={!reportData}
          >
            <i className={`fas fa-file-${exportFormat}`}></i>
            Export as {exportFormat.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="report-controls">
        <div className="control-group">
          <label>Report Type:</label>
          <select 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value)}
            className="report-select"
          >
            <option value="appointments">Appointments Report</option>
            <option value="patients">Patients Report</option>
            <option value="doctors">Doctors Performance</option>
            <option value="revenue">Financial Report</option>
            <option value="queue">Queue Analytics</option>
          </select>
        </div>

        <div className="control-group">
          <label>Date Range:</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="range-select"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {dateRange === 'custom' && (
          <>
            <div className="control-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="control-group">
              <label>End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-input"
              />
            </div>
          </>
        )}

        <div className="control-group">
          <label>Export Format:</label>
          <select 
            value={exportFormat} 
            onChange={(e) => setExportFormat(e.target.value)}
            className="format-select"
          >
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
          </select>
        </div>

        <button 
          className="btn btn-outline"
          onClick={fetchReportData}
        >
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>
      </div>

      {/* Report Preview */}
      <div className="report-preview-container">
        {renderReportPreview()}
      </div>
    </div>
  );
};

export default AdminReports;