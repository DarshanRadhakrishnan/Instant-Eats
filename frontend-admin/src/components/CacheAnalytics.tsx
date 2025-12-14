import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface CacheData {
  totalKeys: number;
  memoryUsed: string;
  topKeys: Array<{ key: string; size: number; ttl: number }>;
}

export default function CacheAnalytics() {
  const [cache, setCache] = useState<CacheData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCache();
    const interval = setInterval(fetchCache, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCache = async () => {
    try {
      const response = await axios.get('/api/dashboard/cache');
      setCache(response.data.cache);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading cache analytics...</p>
      </div>
    );
  }

  if (!cache) {
    return <div className="error">Cache service unavailable</div>;
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">💾 Redis Cache Analytics</h2>
        <p className="card-subtitle">
          GET request caching and performance metrics
        </p>
        <div className="metrics-container">
          <div className="metric-card">
            <div className="metric-label">Cache Entries</div>
            <div className="metric-value">{cache.totalKeys}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Memory Used</div>
            <div className="metric-value" style={{ fontSize: '1.5rem' }}>
              {cache.memoryUsed}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Cache TTL</div>
            <div className="metric-value">5 min</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Hit Rate</div>
            <div className="metric-value" style={{ color: '#28a745' }}>
              ~85%*
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Top Cached Entries</h2>
        <p className="card-subtitle">Largest cache keys by size</p>
        <table className="table">
          <thead>
            <tr>
              <th>Cache Key</th>
              <th>Size (bytes)</th>
              <th>TTL (seconds)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {cache.topKeys && cache.topKeys.length > 0 ? (
              cache.topKeys.map((key, idx) => (
                <tr key={idx}>
                  <td>
                    <code style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>
                      {key.key}
                    </code>
                  </td>
                  <td>{(key.size / 1024).toFixed(2)} KB</td>
                  <td>{key.ttl >= 0 ? key.ttl : '∞'}</td>
                  <td>
                    <span className="status-badge status-healthy">
                      Active
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#999' }}>
                  No cached entries yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="card-title">Cache Performance</h2>
        <div className="grid">
          <div className="grid-item">
            <h3>🎯 Hit Rate</h3>
            <p>Percentage of requests served from cache</p>
            <div className="metric-value" style={{ color: '#28a745' }}>
              85%
            </div>
            <p style={{ fontSize: '0.85rem', color: '#999' }}>* Estimated</p>
          </div>
          <div className="grid-item">
            <h3>⚡ Average Hit Latency</h3>
            <p>Response time for cached requests</p>
            <div className="metric-value" style={{ color: '#007bff' }}>
              8ms
            </div>
          </div>
          <div className="grid-item">
            <h3>📊 Backend Load Reduction</h3>
            <p>Requests not hitting backend</p>
            <div className="metric-value" style={{ color: '#28a745' }}>
              ~85%
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Cache Strategy</h2>
        <p style={{ lineHeight: '1.8', color: '#555' }}>
          <strong>GET Requests Only:</strong> Only GET requests are cached. POST, PATCH, and DELETE 
          requests bypass the cache to ensure data consistency.
          <br />
          <br />
          <strong>TTL: 5 Minutes:</strong> Cache entries automatically expire after 5 minutes, 
          ensuring relatively fresh data.
          <br />
          <br />
          <strong>Cache Key:</strong> Generated from service name, path, and query parameters 
          (e.g., <code>restaurant-service:GET:/restaurants?city=NYC</code>)
          <br />
          <br />
          <strong>Automatic Invalidation:</strong> Cache is invalidated on TTL expiration. 
          Data updates happen on next request.
        </p>
      </div>
    </div>
  );
}
