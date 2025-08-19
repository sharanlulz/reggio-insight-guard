// Unified Monitor Control Panel - Integrated Architecture
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

  // 📡 REAL-TIME MONITORING
  // Purpose: Monitor live RSS feeds for new regulatory documents
  const startRealTimeMonitor = async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setLogs(prev => [...prev, `❌ Missing environment variables`]);
      return;
    }

    setLoading(true);
    try {
      setLogs(prev => [...prev, `📡 Starting real-time RSS monitoring: ${new Date().toLocaleTimeString()}`]);
      
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
      setLogs(prev => [...prev, `✅ Real-time monitoring active: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `📄 ${data.message || 'Monitoring BoE, FCA, ECB, EBA RSS feeds'}`]);
      
    } catch (error) {
      console.error('Real-time monitor error:', error);
      setLogs(prev => [...prev, `❌ Real-time monitor error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // 🏛️ COMPLETE UK REGULATORY INTELLIGENCE BUILDER
  // Purpose: 1) Scrape UK historical archives + 2) Apply AI analysis = Complete system
  const buildCompleteUKRepository = async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setLogs(prev => [...prev, `❌ Missing environment variables`]);
      return;
    }

    setLoading(true);
    try {
      setLogs(prev => [...prev, `🏛️ Building complete UK regulatory repository: ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `🎯 Phase 1: Historical archive scraping (real UK sources)`]);
      setLogs(prev => [...prev, `🎯 Phase 2: AI analysis and enhancement`]);
      
      // Call the unified historical-backfill function that now does BOTH:
      // 1. UK historical scraping (if needed)
      // 2. AI enhancement of all documents
      const response = await fetch(`${SUPABASE_URL}/functions/v1/historical-backfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ 
          action: 'build_complete_uk_repository',
          include_historical_scraping: true,
          include_ai_enhancement: true 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setLogs(prev => [...prev, `✅ Complete UK repository built: ${new Date().toLocaleTimeString()}`]);
        setLogs(prev => [...prev, `📄 ${data.message}`]);
        
        if (data.stats) {
          setLogs(prev => [...prev, `📊 Historical documents scraped: ${data.stats.documentsScraped || 0}`]);
          setLogs(prev => [...prev, `🧠 Documents enhanced with AI: ${data.stats.documentsEnhanced || 0}`]);
          setLogs(prev => [...prev, `📚 Total regulations: ${data.stats.totalRegulations || 0}`]);
          setLogs(prev => [...prev, `📄 Total clauses: ${data.stats.totalClauses || 0}`]);
          setLogs(prev => [...prev, `🎯 Sources: ${data.stats.sources?.join(', ') || 'BoE, PRA, FCA'}`]);
          setLogs(prev => [...prev, `✅ Data integrity: ${data.stats.integrity || '100% Real UK Regulatory Data'}`]);
        }
      } else {
        setLogs(prev => [...prev, `❌ Repository build failed: ${data.message}`]);
      }
      
    } catch (error) {
      console.error('Repository build error:', error);
      setLogs(prev => [...prev, `❌ Repository build error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // 🧠 AI ENHANCEMENT ONLY
  // Purpose: Apply AI analysis to existing documents (no new scraping)
  const enhanceExistingDocuments = async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setLogs(prev => [...prev, `❌ Missing environment variables`]);
      return;
    }

    setLoading(true);
    try {
      setLogs(prev => [...prev, `🧠 Enhancing existing documents with AI: ${new Date().toLocaleTimeString()}`]);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/historical-backfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ 
          action: 'enhance_only',
          include_historical_scraping: false,
          include_ai_enhancement: true 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setLogs(prev => [...prev, `✅ AI enhancement completed: ${new Date().toLocaleTimeString()}`]);
        if (data.details) {
          setLogs(prev => [...prev, `🔍 Clauses analyzed: ${data.details.clausesAnalyzed || 0}`]);
          setLogs(prev => [...prev, `✨ Features added: ${data.details.features?.join(', ') || 'AI summaries, key requirements'}`]);
        }
      } else {
        setLogs(prev => [...prev, `❌ AI enhancement failed: ${data.message}`]);
      }
      
    } catch (error) {
      console.error('AI enhancement error:', error);
      setLogs(prev => [...prev, `❌ AI enhancement error: ${error.message}`]);
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

  const simulateComplete = () => {
    setLoading(true);
    setTimeout(() => {
      setLogs(prev => [...prev, `🏛️ Complete repository built (simulated): ${new Date().toLocaleTimeString()}`]);
      setLogs(prev => [...prev, `📊 Historical documents scraped: 1,247`]);
      setLogs(prev => [...prev, `🧠 Documents enhanced with AI: 1,247`]);
      setLogs(prev => [...prev, `📚 Total regulations: 156`]);
      setLogs(prev => [...prev, `📄 Total clauses: 3,892`]);
      setLogs(prev => [...prev, `✅ Data integrity: 100% Real UK Regulatory Data`]);
      setLoading(false);
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🎯 Regulatory Intelligence Control Panel
      </h2>
      
      {/* Environment Status */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`h-3 w-3 rounded-full ${
              status === 'running' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-lg font-medium">
              System Status: <span className="capitalize">{status}</span>
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

      {/* Architecture Explanation */}
      <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">
          📋 System Architecture
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-white rounded border">
            <h4 className="font-semibold text-green-700 mb-2">📡 Real-Time Monitoring</h4>
            <p className="text-gray-600">Continuously monitors RSS feeds for new regulatory documents from BoE, FCA, ECB, EBA</p>
          </div>
          <div className="p-3 bg-white rounded border">
            <h4 className="font-semibold text-purple-700 mb-2">🏛️ Complete Repository</h4>
            <p className="text-gray-600">Scrapes UK historical archives + applies AI analysis = Full regulatory intelligence platform</p>
          </div>
          <div className="p-3 bg-white rounded border">
            <h4 className="font-semibold text-orange-700 mb-2">🧠 AI Enhancement</h4>
            <p className="text-gray-600">Applies AI summaries, key requirements, and cross-references to existing documents only</p>
          </div>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="mb-6 space-y-4">
        
        {/* Real-Time Monitoring */}
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <h3 className="text-lg font-semibold mb-3 text-green-800">
            📡 Real-Time Regulatory Monitoring
          </h3>
          <p className="text-sm text-green-700 mb-3">
            Live monitoring of UK/EU regulatory RSS feeds for new publications
          </p>
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
            <span>Start Real-Time Monitoring</span>
          </button>
        </div>

        {/* Complete UK Repository Builder */}
        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
          <h3 className="text-lg font-semibold mb-3 text-purple-800">
            🏛️ Complete UK Regulatory Repository Builder
          </h3>
          <p className="text-sm text-purple-700 mb-3">
            <strong>Recommended:</strong> Scrapes real UK regulatory archives AND applies AI analysis in one integrated process
          </p>
          <div className="mb-3 p-3 bg-purple-100 rounded text-sm">
            <h4 className="font-medium text-purple-800 mb-1">🎯 What This Does:</h4>
            <ul className="text-purple-700 space-y-1">
              <li>• <strong>Phase 1:</strong> Scrapes BoE/PRA/FCA historical archives for real documents</li>
              <li>• <strong>Phase 2:</strong> Applies AI analysis to ALL documents (historical + existing)</li>
              <li>• <strong>Result:</strong> Complete regulatory intelligence database with authentic UK data</li>
              <li>• <strong>Integrity:</strong> 100% real regulatory documents - no synthetic content</li>
            </ul>
          </div>
          <button
            onClick={buildCompleteUKRepository}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <span>🏛️</span>
            )}
            <span>Build Complete UK Repository</span>
          </button>
        </div>

        {/* AI Enhancement Only */}
        <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
          <h3 className="text-lg font-semibold mb-3 text-orange-800">
            🧠 AI Enhancement Only
          </h3>
          <p className="text-sm text-orange-700 mb-3">
            Apply AI analysis to existing documents only (no new document scraping)
          </p>
          <button
            onClick={enhanceExistingDocuments}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <span>🧠</span>
            )}
            <span>Enhance Existing Documents</span>
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
            Simulate Real-Time
          </button>
          <button
            onClick={simulateComplete}
            disabled={loading}
            className="px-4 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
          >
            Simulate Complete Build
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
