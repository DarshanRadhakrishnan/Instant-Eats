import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Service {
  name: string;
  port: number;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastChecked: Date;
}

export default function ServicesHealth() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get('/api/dashboard/services');
      setServices(response.data.services);
      setSummary(response.data.summary);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading services...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">🔧 Services Health</h2>
        <div className="metrics-container">
          <div className="metric-card">
            <div className="metric-label">Total Services</div>
            <div className="metric-value">{summary?.total || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Running</div>
            <div className="metric-value" style={{ color: '#28a745' }}>
              {summary?.up || 0}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Down</div>
            <div className="metric-value" style={{ color: '#dc3545' }}>
              {summary?.down || 0}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Degraded</div>
            <div className="metric-value" style={{ color: '#ffc107' }}>
              {summary?.degraded || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Service Details</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Port</th>
              <th>Status</th>
              <th>Response Time</th>
              <th>Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.name}>
                <td><strong>{service.name}</strong></td>
                <td>{service.port}</td>
                <td>
                  <span className={`status-badge status-${service.status}`}>
                    {service.status}
                  </span>
                </td>
                <td>{service.responseTime}ms</td>
                <td>{new Date(service.lastChecked).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
