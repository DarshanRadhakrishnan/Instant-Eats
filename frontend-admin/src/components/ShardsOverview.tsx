import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Shard {
  id: string;
  region: string;
  host: string;
  port: number;
  database: string;
  status: string;
}

export default function ShardsOverview() {
  const [shards, setShards] = useState<Shard[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchShards();
    const interval = setInterval(fetchShards, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchShards = async () => {
    try {
      const response = await axios.get('/api/dashboard/shards');
      setShards(response.data.shards);
      setSummary(response.data.summary);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch shards:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading shards...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">🗄️ Database Shards Overview</h2>
        <p className="card-subtitle">
          Multi-region sharding strategy for horizontal scaling
        </p>
        <div className="metrics-container">
          <div className="metric-card">
            <div className="metric-label">Total Shards</div>
            <div className="metric-value">{summary?.total || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Healthy</div>
            <div className="metric-value" style={{ color: '#28a745' }}>
              {summary?.healthy || 0}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Degraded</div>
            <div className="metric-value" style={{ color: '#ffc107' }}>
              {summary?.degraded || 0}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Offline</div>
            <div className="metric-value" style={{ color: '#dc3545' }}>
              {summary?.offline || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Region Distribution</h2>
        <div className="grid">
          {shards.map((shard) => (
            <div key={shard.id} className="grid-item">
              <h3>{shard.region}</h3>
              <p style={{ fontSize: '0.9rem', color: '#999' }}>Shard: {shard.id}</p>
              <span className={`status-badge status-${shard.status}`}>
                {shard.status}
              </span>
              <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '1rem' }}>
                {shard.host}:{shard.port}
                <br />
                DB: {shard.database}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Shard Details</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Shard ID</th>
              <th>Region</th>
              <th>Host</th>
              <th>Port</th>
              <th>Database</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {shards.map((shard) => (
              <tr key={shard.id}>
                <td><strong>{shard.id}</strong></td>
                <td>{shard.region}</td>
                <td>{shard.host}</td>
                <td>{shard.port}</td>
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
    </div>
  );
}
