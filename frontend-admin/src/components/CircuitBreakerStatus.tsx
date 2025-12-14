import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface CircuitBreaker {
  serviceName: string;
  state: string;
  stats: {
    fires: number;
    failures: number;
    successes: number;
    timeouts: number;
    fallbacks: number;
  };
}

export default function CircuitBreakerStatus() {
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchCircuitBreakers();
    const interval = setInterval(fetchCircuitBreakers, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCircuitBreakers = async () => {
    try {
      const response = await axios.get('/api/dashboard/circuit-breakers');
      setCircuitBreakers(response.data.circuitBreakers);
      setSummary(response.data.summary);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch circuit breakers:', error);
    }
  };

  const resetCircuitBreaker = async (serviceName: string) => {
    try {
      await axios.post('/api/dashboard/circuit-breaker/reset', { serviceName });
      alert(`Circuit breaker reset for ${serviceName}`);
      fetchCircuitBreakers();
    } catch (error) {
      alert('Failed to reset circuit breaker');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading circuit breakers...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">⚡ Circuit Breaker Status</h2>
        <p className="card-subtitle">
          Monitor service health and automatic failure recovery
        </p>
        <div className="metrics-container">
          <div className="metric-card">
            <div className="metric-label">Total Services</div>
            <div className="metric-value">{summary?.total || 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">CLOSED (Healthy)</div>
            <div className="metric-value" style={{ color: '#28a745' }}>
              {summary?.closed || 0}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">OPEN (Down)</div>
            <div className="metric-value" style={{ color: '#dc3545' }}>
              {summary?.open || 0}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">HALF-OPEN (Testing)</div>
            <div className="metric-value" style={{ color: '#ffc107' }}>
              {summary?.halfOpen || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Service Circuit Breakers</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Service</th>
              <th>State</th>
              <th>Fires</th>
              <th>Failures</th>
              <th>Successes</th>
              <th>Timeouts</th>
              <th>Fallbacks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {circuitBreakers.map((cb) => (
              <tr key={cb.serviceName}>
                <td><strong>{cb.serviceName}</strong></td>
                <td>
                  <span className={`status-badge status-${cb.state.toLowerCase()}`}>
                    {cb.state}
                  </span>
                </td>
                <td>{cb.stats.fires}</td>
                <td style={{ color: '#dc3545' }}><strong>{cb.stats.failures}</strong></td>
                <td style={{ color: '#28a745' }}><strong>{cb.stats.successes}</strong></td>
                <td>{cb.stats.timeouts}</td>
                <td>{cb.stats.fallbacks}</td>
                <td>
                  <button
                    className="btn btn-sm"
                    onClick={() => resetCircuitBreaker(cb.serviceName)}
                    disabled={cb.state === 'CLOSED'}
                  >
                    Reset
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="card-title">Circuit Breaker States</h2>
        <div className="grid">
          <div className="grid-item">
            <h3>🟢 CLOSED</h3>
            <p>Service is healthy and accepting requests</p>
            <div className="metric-value" style={{ color: '#28a745' }}>
              {summary?.closed || 0}
            </div>
          </div>
          <div className="grid-item">
            <h3>🔴 OPEN</h3>
            <p>Service is down, rejecting requests</p>
            <div className="metric-value" style={{ color: '#dc3545' }}>
              {summary?.open || 0}
            </div>
          </div>
          <div className="grid-item">
            <h3>🟡 HALF-OPEN</h3>
            <p>Testing if service is back online</p>
            <div className="metric-value" style={{ color: '#ffc107' }}>
              {summary?.halfOpen || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
