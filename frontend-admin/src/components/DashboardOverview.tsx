import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface DashboardData {
  shards: any[];
  services: any[];
  circuitBreakers: any[];
  cache: any;
  summary: any;
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get('/api/dashboard/overview');
      setData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!data) {
    return <div className="error">No data available</div>;
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">📊 System Overview</h2>
        <div className="metrics-container">
          <div className="metric-card">
            <div className="metric-label">Total Shards</div>
            <div className="metric-value">{data.summary.totalShards}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Healthy Services</div>
            <div className="metric-value">
              {data.summary.healthyServices}/{data.summary.totalServices}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Open Circuits</div>
            <div className="metric-value" style={{ color: data.summary.openCircuitBreakers > 0 ? '#dc3545' : '#28a745' }}>
              {data.summary.openCircuitBreakers}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Cache Hit Rate</div>
            <div className="metric-value">{(data.summary.cacheHitRate * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">🗄️ Shards (Region-wise)</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Region</th>
              <th>Shard ID</th>
              <th>Host</th>
              <th>Database</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.shards.map((shard) => (
              <tr key={shard.id}>
                <td>{shard.region}</td>
                <td>{shard.id}</td>
                <td>{shard.host}</td>
                <td>{shard.database}</td>
                <td>
                  <span className={`status-badge status-${shard.status}`}>
                    {shard.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="card-title">🔧 Services Status</h2>
        <div className="grid">
          {data.services.map((service) => (
            <div key={service.name} className="grid-item">
              <h3>{service.name}</h3>
              <span className={`status-badge status-${service.status}`}>
                {service.status}
              </span>
              <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>
                Response: {service.responseTime}ms
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">⚡ Circuit Breaker Status</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Service</th>
              <th>State</th>
              <th>Fires</th>
              <th>Failures</th>
              <th>Successes</th>
            </tr>
          </thead>
          <tbody>
            {data.circuitBreakers.map((cb) => (
              <tr key={cb.serviceName}>
                <td>{cb.serviceName}</td>
                <td>
                  <span className={`status-badge status-${cb.state.toLowerCase()}`}>
                    {cb.state}
                  </span>
                </td>
                <td>{cb.stats.fires}</td>
                <td>{cb.stats.failures}</td>
                <td>{cb.stats.successes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
