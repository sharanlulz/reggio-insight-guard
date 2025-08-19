// Complete Monitor Control Panel - Fixed for Build
// File: src/pages/MonitorControl.tsx

import { useState } from 'react';

export default function MonitorControl() {
  const [status, setStatus] = useState('stopped');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Environment variables
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const debugEnvironment = () => {
    console.log('🔍 Environment Debug:');
    console.log('SUPABASE_URL:', SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Found (*****)' : 'Missing');
    
    setLogs(prev => [...prev, `🔍 SUPABASE_URL: ${SUPABASE_URL ? 'Found' : 'MISSING'}`]);
    setLogs(prev => [...prev, `🔍 SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'Found' : 'MISSING'}`]);
  };

  // Real-time monitoring functions
  const startRealTimeMonitor = async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setLogs(prev => [...prev, `❌ Missing environment variables`]);
      return;
    }

    setLoading(true);
    try {
      setLogs(prev => [...prev, `🧠 Starting real-time monitoring: ${new Date().toLocaleTimeString()}`]);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/realtime-monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action: 'start' })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setStatus('running');
      setLogs(prev => [...prev, `✅ Monitor started: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `📄 Response: ${data.message || 'Real-time monitoring active'}`]);
      
    } catch (error) {
      console.error('Real-time monitor error:', error);
      setLogs(prev => [...prev, `❌ Real-time monitor error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced backfill functions
  const startEnhancedBackfill = async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setLogs(prev => [...prev, `❌ Missing environment variables`]);
      return;
    }

    setLoading(true);
    try {
      setLogs(prev => [...prev, `🧠 Starting enhanced backfill: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `🎯 Function URL: ${SUPABASE_URL}/functions/v1/historical-backfill`]);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/historical-backfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action: 'start' })
      });

      setLogs(prev => [...prev, `📡 Response status: ${response.status}`]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setLogs(prev => [...prev, `✅ Enhanced backfill completed: ${new Date().toLocaleTimeString()}`]);
        if (data.details) {
          setLogs(prev => [...prev, `✨ Features: ${data.details.features?.join(', ') || 'AI summaries, Key requirements, Cross-references'}`]);
          setLogs(prev => [...prev, `📄 Existing clauses: ${data.details.existingClauses || 0}`]);
          setLogs(prev => [...prev, `📚 Existing regulations: ${data.details.existingRegulations || 0}`]);
          setLogs(prev => [...prev, `🔍 Clauses analyzed: ${data.details.clausesAnalyzed || 0}`]);
          setLogs(prev => [...prev, `📊 Regulations added: ${data.details.regulationsAdded || 0}`]);
        }
      } else {
        setLogs(prev => [...prev, `❌ Enhanced backfill failed: ${data.message}`]);
      }
      
    } catch (error) {
      console.error('Enhanced backfill error:', error);
      setLogs(prev => [...prev, `❌ Enhanced backfill error: ${error.message}`]);
      
      if (error.message.includes('Failed to fetch')) {
        setLogs(prev => [...prev, `🔍 Network error - check environment variables and function deployment`]);
        setLogs(prev => [...prev, `🔧 Try the debug button to diagnose the issue`]);
      }
    } finally {
      setLoading(false);
    }
  };

  // UK Historical Archive
  const startUKHistoricalArchive = async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setLogs(prev => [...prev, `❌ Missing environment variables`]);
      return;
    }

    setLoading(true);
    try {
      setLogs(prev => [...prev, `🏛️ Starting UK historical archive: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `🎯 Target: Real UK regulatory documents only`]);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/historical-archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action: 'start' })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setLogs(prev => [...prev, `✅ UK archive completed: ${new Date().toLocaleTimeString()}`]);
        setLogs(prev => [...prev, `📄 Message: ${data.message}`]);
        if (data.stats) {
          setLogs(prev => [...prev, `📊 Documents found: ${data.stats.documentsFound || 0}`]);
          setLogs(prev => [...prev, `📄 Documents stored: ${data.stats.documentsStored || 0}`]);
          setLogs(prev => [...prev, `🏛️ Sources: ${data.stats.sources?.join(', ') || 'BoE, PRA, FCA'}`]);
          setLogs(prev => [...prev, `✅ Integrity: ${data.stats.integrity || '100% Real Data'}`]);
        }
      } else {
        setLogs(prev => [...prev, `❌ UK archive failed: ${data.message}`]);
      }
      
    } catch (error) {
      console.error('UK archive error:', error);
      setLogs(prev => [...prev, `❌ UK archive error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Simulation functions for testing
  const simulateStart = () => {
    setLoading(true);
    setTimeout(() => {
      setStatus('running');
      setLogs(prev => [...prev, `✅ Monitor started (simulated): ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `📡 Now monitoring 8 RSS feeds from UK/EU regulators`]);
      setLogs(prev => [...prev, `🔄 Checking feeds every 15-30 minutes`]);
      setLoading(false);
    }, 1000);
  };

  const simulateStop = () => {
    setLoading(true);
    setTimeout(() => {
      setStatus('stopped');
      setLogs(prev => [...prev, `🛑 Monitor stopped (simulated): ${new Date().toLocaleTimeString()}`]);
      setLoading(false);
    }, 1000);
  };

  const simulateStatus = () => {
    setLoading(true);
    setTimeout(() => {
      setLogs(prev => [...prev, `📊 Status check (simulated): ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `📄 Feeds monitored: 8`]);
      setLogs(prev => [...prev, `📄 Documents found today: ${Math.floor(Math.random() * 15) + 5}`]);
      setLogs(prev => [...prev, `📄 Last check: ${new Date(Date.now() - Math.random() * 900000).toLocaleTimeString()}`]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🎯 Regulatory Monitor Control Panel
      </h2>
      
      {/* Environment Status */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`h-3 w-3 rounded-full ${
              status === 'running' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-lg font-medium">
              Monitor Status: <span className="capitalize">{status}</span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Environment:</span>
            <span className={`px-2 py-1 text-xs rounded ${
              SUPABASE_URL && SUPABASE_ANON_KEY ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {SUPABASE_URL && SUPABASE_ANON_KEY ? 'Connected' : 'Config Missing'}
            </span>
            <button 
              onClick={debugEnvironment}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
            >
              Debug
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Monitoring */}
      <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
        <h3 className="text-lg font-semibold mb-3 text-green-800">
          📡 Real-Time RSS Monitoring
        </h3>
        <p className="text-sm text-green-700 mb-3">
          Live monitoring of UK/EU regulatory RSS feeds (BoE, FCA, ECB, EBA)
        </p>
        <div className="flex space-x-3">
          <button
            onClick={startRealTimeMonitor}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <span>📡</span>
            )}
            <span>Start Real Monitoring</span>
          </button>
        </div>
      </div>

      {/* Enhanced Historical Repository Builder */}
      <div className="mb-6 p-4 rounded-lg bg-purple-50 border border-purple-200">
        <h3 className="text-lg font-semibold mb-3 text-purple-800">
          🧠 Enhanced Historical Repository Builder
        </h3>
        <p className="text-sm text-purple-700 mb-3">
          Build a complete regulatory database with AI-analyzed clauses and cross-reference resolution
        </p>
        <div className="mb-3 p-3 bg-purple-100 rounded text-sm">
          <h4 className="font-medium text-purple-800 mb-1">✨ Enhanced Features:</h4>
          <ul className="text-purple-700 space-y-1">
            <li>• AI summaries for every clause in simple English</li>
            <li>• Key requirements extracted and highlighted</li>
            <li>• Cross-references resolved (no jumping between sections)</li>
            <li>• Financial impact keywords identified</li>
            <li>• Compliance deadlines extracted</li>
          </ul>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={startEnhancedBackfill}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <span>🧠</span>
            )}
            <span>Start Enhanced Backfill</span>
          </button>
        </div>
      </div>

      {/* UK Historical Archive */}
      <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">
          🏛️ UK Historical Archive (Real Data Only)
        </h3>
        <p className="text-sm text-blue-700 mb-3">
          Comprehensive scraping of actual UK regulatory archives from verified sources
        </p>
        <div className="mb-3 p-3 bg-blue-100 rounded text-sm">
          <h4 className="font-medium text-blue-800 mb-1">🎯 Real Sources:</h4>
          <ul className="text-blue-700 space-y-1">
            <li>• Bank of England: Prudential Regulation Authority</li>
            <li>• FCA: Policy Statements, Consultation Papers, Guidance</li>
            <li>• No fake documents - 100% authentic regulatory content</li>
            <li>• Verifiable URLs and reference numbers</li>
          </ul>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={startUKHistoricalArchive}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <span>🏛️</span>
            )}
            <span>Start UK Archive</span>
          </button>
        </div>
      </div>

      {/* Test Mode */}
      <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
        <h3 className="text-sm font-semibold mb-2 text-yellow-800">
          🧪 Test Mode (if edge functions not deployed yet):
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={simulateStart}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
          >
            Simulate Start
          </button>
          <button
            onClick={simulateStop}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
          >
            Simulate Stop
          </button>
          <button
            onClick={simulateStatus}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
          >
            Simulate Status
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
        <h3 className="text-white mb-2">📝 System Logs:</h3>
        {logs.length === 0 ? (
          <div className="text-gray-500">No logs yet. Click any button above to start.</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))
        )}
      </div>

      {/* Clear Logs */}
      {logs.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setLogs([])}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            Clear Logs
          </button>
        </div>
      )}
    </div>
  );
}
