// Fixed MonitorControl Component
// File: src/pages/MonitorControl.tsx

import { useState } from 'react';

export default function MonitorControlPanel() {
  const [status, setStatus] = useState('stopped');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // FIXED: Use import.meta.env directly for Vite/Lovable
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Add debugging function
  const debugEnvironment = () => {
    console.log('🔍 Environment Debug:');
    console.log('SUPABASE_URL:', SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Found (*****)' : 'Missing');
    console.log('import.meta.env:', import.meta.env);
    
    setLogs(prev => [...prev, `🔍 SUPABASE_URL: ${SUPABASE_URL ? 'Found' : 'MISSING'}`]);
    setLogs(prev => [...prev, `🔍 SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'Found' : 'MISSING'}`]);
  };

  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/realtime-monitor`;
  const BACKFILL_URL = `${SUPABASE_URL}/functions/v1/historical-backfill`;

  const callMonitorFunction = async (action) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }

    setLoading(true);
    try {
      const response = await fetch(`${FUNCTION_URL}?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`Error calling ${action}:`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const startMonitor = async () => {
    try {
      const result = await callMonitorFunction('start');
      setStatus('running');
      setLogs(prev => [...prev, `✅ Monitor started: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `📄 Response: ${result.message}`]);
    } catch (error) {
      setLogs(prev => [...prev, `❌ Error starting: ${error.message}`]);
    }
  };

  const stopMonitor = async () => {
    try {
      const result = await callMonitorFunction('stop');
      setStatus('stopped');
      setLogs(prev => [...prev, `🛑 Monitor stopped: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `📄 Response: ${result.message}`]);
    } catch (error) {
      setLogs(prev => [...prev, `❌ Error stopping: ${error.message}`]);
    }
  };

  const checkStatus = async () => {
    try {
      const result = await callMonitorFunction('status');
      setLogs(prev => [...prev, `📊 Status check: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `📄 Feeds monitored: ${result.status?.feedsMonitored || 0}`]);
      setLogs(prev => [...prev, `📄 Is running: ${result.status?.isRunning ? 'Yes' : 'No'}`]);
      
      if (result.status?.isRunning) {
        setStatus('running');
      } else {
        setStatus('stopped');
      }
    } catch (error) {
      setLogs(prev => [...prev, `❌ Error checking status: ${error.message}`]);
    }
  };

  // FIXED: Enhanced backfill function with proper error handling
  const runHistoricalBackfill = async () => {
    setLoading(true);
    
    try {
      // Check environment variables first
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Environment variables missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Lovable settings.');
      }

      setLogs(prev => [...prev, `🧠 Starting enhanced backfill: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `🎯 Function URL: ${BACKFILL_URL}`]);

      const response = await fetch(BACKFILL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ 
          action: 'start',
          debug: true // Enable debug mode
        })
      });

      // Log response details for debugging
      setLogs(prev => [...prev, `📡 Response status: ${response.status} ${response.statusText}`]);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      setLogs(prev => [...prev, `✅ Enhanced backfill completed: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `📄 ${data.message}`]);
      
      if (data.details) {
        setLogs(prev => [...prev, `📊 Regulations added: ${data.details.regulationsAdded}`]);
        setLogs(prev => [...prev, `🔍 Clauses analyzed: ${data.details.clausesAnalyzed}`]);
        setLogs(prev => [...prev, `📚 Existing regulations: ${data.details.existingRegulations}`]);
        setLogs(prev => [...prev, `📄 Existing clauses: ${data.details.existingClauses}`]);
        setLogs(prev => [...prev, `✨ Features: ${data.details.features?.join(', ')}`]);
      }

      if (data.details.regulationsAdded === 0 && data.details.clausesAnalyzed === 0) {
        setLogs(prev => [...prev, `ℹ️ No new data to process. Database already contains analyzed clauses.`]);
        setLogs(prev => [...prev, `💡 To see enhanced analysis, try ingesting a new regulation first.`]);
      }

    } catch (error) {
      console.error('Enhanced backfill error:', error);
      setLogs(prev => [...prev, `❌ Enhanced backfill error: ${error.message}`]);
      
      // Add helpful debugging info
      if (error.message.includes('Failed to fetch')) {
        setLogs(prev => [...prev, `🔍 Network error - check environment variables and function deployment`]);
        setLogs(prev => [...prev, `🔧 Try the debug button to diagnose the issue`]);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkBackfillStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(BACKFILL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action: 'status' })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      setLogs(prev => [...prev, `📊 Enhanced status: ${new Date().toLocaleTimeString()}`]);
      if (data.status) {
        setLogs(prev => [...prev, `📚 Total regulations: ${data.status.totalRegulations || 0}`]);
        setLogs(prev => [...prev, `📄 Total clauses: ${data.status.totalClauses || 0}`]);
        setLogs(prev => [...prev, `🧠 AI summaries: ${data.status.withAISummaries || 0}`]);
        setLogs(prev => [...prev, `🚨 Critical clauses: ${data.status.criticalClauses || 0}`]);
      }
    } catch (error) {
      setLogs(prev => [...prev, `❌ Status check error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

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

      <div className="flex space-x-4 mb-6">
        <button
          onClick={startMonitor}
          disabled={loading || status === 'running'}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <span>▶️</span>
          )}
          <span>Start Monitoring</span>
        </button>

        <button
          onClick={stopMonitor}
          disabled={loading || status === 'stopped'}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <span>⏹️</span>
          )}
          <span>Stop Monitoring</span>
        </button>

        <button
          onClick={checkStatus}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <span>📊</span>
          )}
          <span>Check Status</span>
        </button>
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

      {/* Enhanced Historical Repository Builder */}
      <div className="mb-6 p-4 rounded-lg bg-purple-50 border border-purple-200">
        <h3 className="text-sm font-semibold mb-2 text-purple-800">
          🧠 Enhanced Historical Repository Builder:
        </h3>
        <p className="text-sm text-purple-700 mb-3">
          Build a complete regulatory database with AI-analyzed clauses, cross-reference resolution, and plain English summaries
        </p>
        <div className="mb-3 p-3 bg-purple-100 rounded text-sm">
          <h4 className="font-medium text-purple-800 mb-1">✨ Enhanced Features:</h4>
          <ul className="text-purple-700 space-y-1">
            <li>• AI summaries for every clause in simple English</li>
            <li>• Key requirements extracted and highlighted</li>
            <li>• Cross-references resolved (no jumping between sections)</li>
            <li>• Financial impact keywords identified</li>
            <li>• Compliance deadlines extracted</li>
            <li>• Critical vs. standard importance levels</li>
          </ul>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={runHistoricalBackfill}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Start Enhanced Backfill'}
          </button>
          <button
            onClick={checkBackfillStatus}
            disabled={loading}
            className="px-3 py-2 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 disabled:opacity-50"
          >
            Check Status
          </button>
        </div>
      </div>

      {/* Monitoring Sources */}
      <div className="mb-6 p-4 rounded-lg bg-blue-50">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">
          📡 Monitoring Sources:
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-700">🇬🇧 UK Sources:</h4>
            <ul className="text-sm text-blue-600 ml-4">
              <li>• Bank of England (PRA)</li>
              <li>• Financial Conduct Authority (FCA)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-700">🇪🇺 EU Sources:</h4>
            <ul className="text-sm text-blue-600 ml-4">
              <li>• European Central Bank (ECB)</li>
              <li>• European Banking Authority (EBA)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="p-4 rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">
          📝 Activity Log:
        </h3>
        <div className="h-40 overflow-y-auto bg-white p-3 rounded border">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity yet. Start monitoring to see logs.</p>
          ) : (
            <div className="space-y-1">
              {logs.slice(-15).reverse().map((log, index) => (
                <div key={index} className="text-sm font-mono text-gray-700">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-200">
        <h3 className="text-lg font-semibold mb-2 text-green-800">
          🚀 Quick Start & Troubleshooting:
        </h3>
        <ol className="text-sm text-green-700 space-y-1">
          <li>1. Check environment status above - should show "Connected"</li>
          <li>2. If missing config, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Lovable</li>
          <li>3. Try "Simulate Start" to test the interface</li>
          <li>4. Deploy edge functions to your Supabase project</li>
          <li>5. Use "Start Enhanced Backfill" for AI analysis of existing clauses</li>
          <li>6. Check logs above for detailed error messages</li>
        </ol>
        
        {!SUPABASE_URL && (
          <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded">
            <p className="text-red-800 font-medium">❌ Environment Setup Required:</p>
            <p className="text-red-700 text-sm mt-1">
              In Lovable, go to Settings → Environment Variables and add:
              <br />• VITE_SUPABASE_URL = your-project-url.supabase.co
              <br />• VITE_SUPABASE_ANON_KEY = your-anon-key
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
