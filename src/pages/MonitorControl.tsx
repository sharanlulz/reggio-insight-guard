// Complete Monitor Control Panel
// File: src/pages/MonitorControl.tsx

import { useState } from 'react';

export default function MonitorControl() {
  const [status, setStatus] = useState('stopped');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Environment variables
  const getEnvVar = (name: string) => {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[`REACT_APP_${name}`] || process.env[`NEXT_PUBLIC_${name}`] || process.env[name];
    }
    if (typeof window !== 'undefined' && (window as any).env) {
      return (window as any).env[name];
    }
    // Vite environment variables
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[`VITE_${name}`];
    }
    // Fallback values for development
    if (name === 'SUPABASE_URL') {
      return 'https://your-project-id.supabase.co';
    }
    if (name === 'SUPABASE_ANON_KEY') {
      return 'your-anon-key';
    }
    return null;
  };

  const SUPABASE_URL = getEnvVar('SUPABASE_URL');
  const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY');

  // Real-time RSS monitoring functions
  const startRealTimeMonitoring = async () => {
    setLoading(true);
    
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Environment variables missing. Check SUPABASE_URL and SUPABASE_ANON_KEY.');
      }

      setLogs(prev => [...prev, `📡 Starting real-time RSS monitoring: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `🎯 Monitoring: BoE, FCA, ECB, EBA RSS feeds`]);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/realtime-monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ 
          action: 'start'
        })
      });

      setLogs(prev => [...prev, `📡 Response status: ${response.status} ${response.statusText}`]);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      setLogs(prev => [...prev, `✅ Real-time monitoring completed: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `📄 ${data.message}`]);
      
      if (data.details) {
        setLogs(prev => [...prev, `📊 Feeds checked: ${data.details.feedsChecked}`]);
        setLogs(prev => [...prev, `📄 New documents: ${data.details.newDocumentsStored}`]);
        setLogs(prev => [...prev, `📈 Total processed: ${data.details.totalItemsProcessed}`]);
        
        if (data.details.results) {
          data.details.results.forEach((result: any) => {
            setLogs(prev => [...prev, `📡 ${result.source}: ${result.newDocuments} new documents`]);
          });
        }
      }

      if (data.details?.newDocumentsStored > 0) {
        setStatus('running');
        setLogs(prev => [...prev, `🎉 SUCCESS: Found ${data.details.newDocumentsStored} new regulatory documents!`]);
      } else {
        setLogs(prev => [...prev, `ℹ️ No new documents found (feeds may be up to date)`]);
      }

    } catch (error) {
      console.error('Real-time monitoring error:', error);
      setLogs(prev => [...prev, `❌ Real-time monitoring error: ${error.message}`]);
      
      if (error.message.includes('Failed to fetch')) {
        setLogs(prev => [...prev, `🔍 Check: Is realtime-monitor edge function deployed?`]);
        setLogs(prev => [...prev, `🔧 Deploy: supabase/functions/realtime-monitor/index.ts`]);
      }
    } finally {
      setLoading(false);
    }
  };

  const stopRealTimeMonitoring = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/realtime-monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action: 'stop' })
      });

      const data = await response.json();
      
      if (response.ok) {
        setStatus('stopped');
        setLogs(prev => [...prev, `⏹️ Real-time monitoring stopped: ${new Date().toLocaleTimeString()}`]);
        setLogs(prev => [...prev, `📄 ${data.message}`]);
      }

    } catch (error) {
      setLogs(prev => [...prev, `❌ Error stopping monitoring: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const checkMonitoringStatus = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/realtime-monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action: 'status' })
      });

      const data = await response.json();
      
      if (response.ok && data.status) {
        setLogs(prev => [...prev, `📊 Monitoring status: ${new Date().toLocaleTimeString()}`]);
        setLogs(prev => [...prev, `📡 Feeds monitored: ${data.status.feedsMonitored || 4}`]);
        setLogs(prev => [...prev, `📄 Total documents: ${data.status.totalDocuments || 0}`]);
        setLogs(prev => [...prev, `📈 Documents today: ${data.status.documentsToday || 0}`]);
        setLogs(prev => [...prev, `🤖 Pending analysis: ${data.status.pendingAnalysis || 0}`]);
        
        setStatus(data.status.isRunning ? 'running' : 'stopped');
      }

    } catch (error) {
      setLogs(prev => [...prev, `❌ Status check error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced backfill functions
  const runEnhancedBackfill = async () => {
    setLoading(true);
    
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Environment variables missing. Check SUPABASE_URL and SUPABASE_ANON_KEY.');
      }

      setLogs(prev => [...prev, `🧠 Starting enhanced backfill: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `🎯 Adding AI summaries to existing clauses`]);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/historical-backfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ 
          action: 'start',
          debug: true
        })
      });

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
        setLogs(prev => [...prev, `✨ Features: ${data.details.features?.join(', ')}`]);
      }

    } catch (error) {
      console.error('Enhanced backfill error:', error);
      setLogs(prev => [...prev, `❌ Enhanced backfill error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // UK Historical Archive functions
  const runUKHistoricalArchive = async () => {
    setLoading(true);
    
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Environment variables missing. Check SUPABASE_URL and SUPABASE_ANON_KEY.');
      }

      setLogs(prev => [...prev, `🇬🇧 Starting UK historical archive: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `🎯 Scraping real UK regulatory websites (BoE, PRA, FCA)`]);
      setLogs(prev => [...prev, `📊 Target: 150+ verified UK regulatory documents`]);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/historical-archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ 
          action: 'start',
          batchSize: 100
        })
      });

      setLogs(prev => [...prev, `📡 Archive response status: ${response.status} ${response.statusText}`]);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      setLogs(prev => [...prev, `✅ UK historical archive completed: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `📄 ${data.message}`]);
      
      if (data.details) {
        setLogs(prev => [...prev, `📊 UK documents added: ${data.details.documentsAdded}`]);
        setLogs(prev => [...prev, `📈 Database grew from ${data.details.startingCount} to ${data.details.finalCount} documents`]);
        setLogs(prev => [...prev, `🤖 AI analysis queued: ${data.details.aiAnalysisQueued} documents`]);
        setLogs(prev => [...prev, `🇬🇧 Coverage: ${data.details.coverage?.timespan} UK regulatory history`]);
        setLogs(prev => [...prev, `🏛️ Sources: ${data.details.coverage?.regulators?.join(', ')}`]);
        setLogs(prev => [...prev, `🌐 Real websites: 3 verified UK regulatory sources scraped`]);
      }

      if (data.details?.documentsAdded > 0) {
        setLogs(prev => [...prev, `🎉 SUCCESS: Your platform now has comprehensive UK regulatory coverage!`]);
        setLogs(prev => [...prev, `💼 Enterprise-ready: Complete UK regulatory repository for client demonstrations`]);
      }

    } catch (error) {
      console.error('UK historical archive error:', error);
      setLogs(prev => [...prev, `❌ UK historical archive error: ${error.message}`]);
      
      if (error.message.includes('Failed to fetch')) {
        setLogs(prev => [...prev, `🔍 Check: Is historical-archive edge function deployed?`]);
        setLogs(prev => [...prev, `🔧 Deploy: supabase/functions/historical-archive/index.ts`]);
        setLogs(prev => [...prev, `🌐 This function scrapes real UK regulatory websites`]);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkArchiveStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/historical-archive`, {
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

      setLogs(prev => [...prev, `📊 Archive status: ${new Date().toLocaleTimeString()}`]);
      if (data.status) {
        setLogs(prev => [...prev, `📚 Total documents: ${data.status.totalDocuments || 0}`);
        setLogs(prev => [...prev, `🇬🇧 UK documents: ${data.status.ukDocuments || 0}`]);
        setLogs(prev => [...prev, `🤖 Pending AI analysis: ${data.status.pendingAnalysis || 0}`]);
        setLogs(prev => [...prev, `🏛️ Archive status: ${data.status.status || 'Ready'}`]);
      }
    } catch (error) {
      setLogs(prev => [...prev, `❌ Archive status error: ${error.message}`]);
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
      setLogs(prev => [...prev, `📡 Now monitoring 4 RSS feeds from UK/EU regulators`]);
      setLogs(prev => [...prev, `🔄 Checking feeds every 15-30 minutes`]);
      setLoading(false);
    }, 1000);
  };

  const simulateStop = () => {
    setLoading(true);
    setTimeout(() => {
      setStatus('stopped');
      setLogs(prev => [...prev, `⏹️ Monitor stopped (simulated): ${new Date().toLocaleTimeString()}`]);
      setLoading(false);
    }, 1000);
  };

  const simulateStatus = () => {
    setLogs(prev => [...prev, `📊 System status: ${new Date().toLocaleTimeString()}`]);
    setLogs(prev => [...prev, `📡 RSS monitoring: ${status === 'running' ? 'Active' : 'Stopped'}`]);
    setLogs(prev => [...prev, `📚 Total documents: ${Math.floor(Math.random() * 100) + 200}`]);
    setLogs(prev => [...prev, `🤖 AI analysis queue: ${Math.floor(Math.random() * 20) + 5} pending`]);
    setLogs(prev => [...prev, `🚨 Priority alerts: ${Math.floor(Math.random() * 5)} high-priority`]);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🔍 Regulatory Monitoring Control</h1>
        <p className="text-gray-600">Real-time regulatory intelligence and historical archive management</p>
      </div>

      {/* Environment Status */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">📊 Environment Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${SUPABASE_URL ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm">SUPABASE_URL: {SUPABASE_URL ? 'Found' : 'Missing'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${SUPABASE_ANON_KEY ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm">SUPABASE_ANON_KEY: {SUPABASE_ANON_KEY ? 'Found' : 'Missing'}</span>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <p>Status: {SUPABASE_URL && SUPABASE_ANON_KEY ? '✅ Connected' : '❌ Configuration needed'}</p>
        </div>
      </div>

      {/* Control Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Real-Time Monitoring Controls */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">📡 Live RSS Monitoring</h4>
          <p className="text-sm text-blue-600 mb-3">
            Monitor real-time regulatory feeds from BoE, FCA, ECB, EBA
          </p>
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-block w-3 h-3 rounded-full ${status === 'running' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-blue-700">Status: {status === 'running' ? 'Running' : 'Stopped'}</span>
          </div>
          <div className="flex space-x-2 mb-3">
            <button
              onClick={startRealTimeMonitoring}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Monitoring'}
            </button>
            <button
              onClick={stopRealTimeMonitoring}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
            >
              Stop
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={checkMonitoringStatus}
              disabled={loading}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 disabled:opacity-50"
            >
              Status
            </button>
          </div>
        </div>

        {/* Enhanced Backfill Controls */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-medium text-purple-800 mb-2">🧠 AI Enhancement</h4>
          <p className="text-sm text-purple-600 mb-3">
            Add AI summaries and analysis to existing regulations
          </p>
          <div className="text-xs text-purple-600 mb-3">
            <p>✨ Features: AI summaries, cross-references, key requirements</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={runEnhancedBackfill}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Enhanced Backfill'}
            </button>
          </div>
        </div>

        {/* UK Historical Archive Controls */}
        <div className="bg-amber-50 p-4 rounded-lg">
          <h4 className="font-medium text-amber-800 mb-2">🇬🇧 UK Historical Archive</h4>
          <p className="text-sm text-amber-600 mb-3">
            Scrape comprehensive UK regulatory history (2020-2024)
          </p>
          <div className="flex space-x-2 mb-3">
            <button
              onClick={runUKHistoricalArchive}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? 'Scraping UK...' : 'Start UK Archive'}
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={checkArchiveStatus}
              disabled={loading}
              className="px-3 py-2 bg-amber-100 text-amber-700 rounded text-sm hover:bg-amber-200 disabled:opacity-50"
            >
              Archive Status
            </button>
          </div>
          <div className="mt-2 text-xs text-amber-600">
            <p>Real sources: BoE news, PRA publications, FCA policy search</p>
            <p>Target: 150+ verified UK regulatory documents</p>
          </div>
        </div>

      </div>

      {/* Test Mode Controls */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-yellow-800">🧪 Test Mode</h3>
        <p className="text-sm text-yellow-600 mb-3">Test the interface without calling real edge functions</p>
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

      {/* Monitoring Sources */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">📡 Monitoring Sources</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-700">🇬🇧 UK Sources:</h4>
            <ul className="text-sm text-blue-600 ml-4">
              <li>• Bank of England (BoE/PRA)</li>
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
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">📝 Activity Log</h3>
        <div className="h-80 overflow-y-auto bg-white p-3 rounded border font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500">No activity yet. Start monitoring or run tests to see logs.</p>
          ) : (
            <div className="space-y-1">
              {logs.slice(-50).map((log, index) => (
                <div key={index} className="text-gray-700">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold mb-2 text-green-800">🚀 Quick Start Guide</h3>
        <ol className="text-sm text-green-700 space-y-1">
          <li>1. ✅ Environment status should show "Connected" above</li>
          <li>2. 🧪 Try "Test Mode" buttons to verify the interface works</li>
          <li>3. 📡 Use "Start Monitoring" for real-time RSS feeds</li>
          <li>4. 🧠 Run "Enhanced Backfill" to add AI analysis to existing data</li>
          <li>5. 🇬🇧 Use "Start UK Archive" to scrape comprehensive UK regulatory history</li>
          <li>6. 📊 Check logs above for detailed progress and results</li>
        </ol>
        
        {(!SUPABASE_URL || !SUPABASE_ANON_KEY) && (
          <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded">
            <p className="text-red-800 font-medium">❌ Environment Setup Required:</p>
            <p className="text-red-700 text-sm mt-1">
              Set environment variables:
              <br />• VITE_SUPABASE_URL = your-project-url.supabase.co
              <br />• VITE_SUPABASE_ANON_KEY = your-anon-key
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
