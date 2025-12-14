import React, { useState, useEffect } from 'react';
import './App.css';
import DashboardOverview from './components/DashboardOverview';
import ServicesHealth from './components/ServicesHealth';
import ShardsOverview from './components/ShardsOverview';
import CircuitBreakerStatus from './components/CircuitBreakerStatus';
import CacheAnalytics from './components/CacheAnalytics';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="app">
      <header className="header">
        <h1>📊 Instant Eats Admin Dashboard</h1>
        <div className="header-info">
          <span>Region-wise Monitoring & Management</span>
          <span className="timestamp">{new Date().toLocaleString()}</span>
        </div>
      </header>

      <nav className="navigation">
        <button
          className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button
          className={`nav-btn ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          🔧 Services
        </button>
        <button
          className={`nav-btn ${activeTab === 'shards' ? 'active' : ''}`}
          onClick={() => setActiveTab('shards')}
        >
          🗄️ Shards
        </button>
        <button
          className={`nav-btn ${activeTab === 'circuit-breaker' ? 'active' : ''}`}
          onClick={() => setActiveTab('circuit-breaker')}
        >
          ⚡ Circuit Breakers
        </button>
        <button
          className={`nav-btn ${activeTab === 'cache' ? 'active' : ''}`}
          onClick={() => setActiveTab('cache')}
        >
          💾 Cache
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'overview' && <DashboardOverview />}
        {activeTab === 'services' && <ServicesHealth />}
        {activeTab === 'shards' && <ShardsOverview />}
        {activeTab === 'circuit-breaker' && <CircuitBreakerStatus />}
        {activeTab === 'cache' && <CacheAnalytics />}
      </main>

      <footer className="footer">
        <p>✅ Instant Eats Admin Dashboard v1.0.0 | Last updated: {new Date().toLocaleTimeString()}</p>
      </footer>
    </div>
  );
}

export default App;
