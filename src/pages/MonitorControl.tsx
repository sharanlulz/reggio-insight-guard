// Simple Monitor Control - Debug Version
// File: src/pages/MonitorControl.tsx

import { useState } from 'react';

export default function MonitorControl() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const SUPABASE_URL = 'https://plktjrbfnzyelwkyyssz.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsa3RqcmJmbnp5ZWx3a3l5c3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDg1ODEsImV4cCI6MjA3MDQyNDU4MX0.od0uTP1PV4iALtJLB79fOCZ5g7ACJew0FzL5CJlzZ20';

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  };

  const testArchiveFunction = async () => {
    setLoading(true);
    addLog('🧪 Starting diagnostic test of historical-archive function');
    
    try {
      // Step 1: Check environment
      addLog(`🔍 SUPABASE_URL: ${SUPABASE_URL ? 'Found' : 'Missing'}`);
      addLog(`🔍 SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'Found (****)' : 'Missing'}`);
      
      const functionUrl = `${SUPABASE_URL}/functions/v1/historical-archive`;
      addLog(`🎯 Function URL: ${functionUrl}`);

      // Step 2: Test OPTIONS (CORS preflight)
      addLog('🔄 Testing CORS preflight...');
      try {
        const optionsResponse = await fetch(functionUrl, {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization, apikey'
          }
        });
        addLog(`📡 OPTIONS response: ${optionsResponse.status} ${optionsResponse.statusText}`);
      } catch (optionsError) {
        addLog(`❌ OPTIONS failed: ${optionsError.message}`);
      }

      // Step 3: Test actual POST request
      addLog('🚀 Testing POST request...');
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action: 'start' })
      });

      addLog(`📡 POST response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Function success!`);
        addLog(`📄 Message: ${data.message}`);
        
        if (data.stats) {
          addLog(`📊 Documents found: ${data.stats.documentsFound || 0}`);
          addLog(`📄 Documents stored: ${data.stats.documentsStored || 0}`);
          
          if (data.stats.tests) {
            addLog(`🧪 Test results:`);
            Object.entries(data.stats.tests).forEach(([test, result]) => {
              addLog(`  ${test}: ${result}`);
            });
          }
        }
      } else {
        const errorText = await response.text();
        addLog(`❌ Function failed: ${response.status} ${response.statusText}`);
        addLog(`📄 Error details: ${errorText}`);
      }

    } catch (error) {
      addLog(`💥 Network error: ${error.message}`);
      addLog(`🔍 This usually means the function is not deployed or network issues`);
    } finally {
      setLoading(false);
    }
  };

  const checkSupabaseDashboard = () => {
    addLog('🌐 Opening Supabase Dashboard...');
    addLog('📋 Check: Dashboard > Edge Functions > historical-archive');
    addLog('📋 Look for: Function name, deployment status, logs');
    window.open('https://supabase.com/dashboard/project/plktjrbfnzyelwkyyssz/functions', '_blank');
  };

  const testBasicConnectivity = async () => {
    setLoading(true);
    addLog('🌐 Testing basic connectivity...');
    
    try {
      // Test 1: Basic HTTP
      const testResponse = await fetch('https://httpbin.org/json');
      if (testResponse.ok) {
        addLog('✅ Basic HTTP works');
      } else {
        addLog('❌ Basic HTTP failed');
      }

      // Test 2: Supabase REST API
      const restResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      if (restResponse.ok) {
        addLog('✅ Supabase REST API accessible');
      } else {
        addLog(`❌ Supabase REST API failed: ${restResponse.status}`);
      }

      // Test 3: Functions endpoint (should 404 but be accessible)
      const functionsResponse = await fetch(`${SUPABASE_URL}/functions/v1/`);
      addLog(`📡 Functions endpoint: ${functionsResponse.status} (404 is normal)`);

    } catch (error) {
      addLog(`❌ Connectivity test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🔍 Archive Function Diagnostics
      </h2>

      {/* Debug Actions */}
      <div className="mb-6 space-y-3">
        <button
          onClick={testArchiveFunction}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <span>🧪</span>
          )}
          <span>Test Archive Function</span>
        </button>

        <button
          onClick={testBasicConnectivity}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <span>🌐</span>
          )}
          <span>Test Basic Connectivity</span>
        </button>

        <button
          onClick={checkSupabaseDashboard}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2"
        >
          <span>📋</span>
          <span>Check Supabase Dashboard</span>
        </button>
      </div>

      {/* Quick Checks */}
      <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
        <h3 className="text-lg font-semibold mb-3 text-yellow-800">
          🚨 Common Issues & Quick Fixes
        </h3>
        <div className="space-y-2 text-sm">
          <div><strong>1. Function Not Deployed:</strong> Check Supabase Dashboard → Edge Functions</div>
          <div><strong>2. No Logs Appearing:</strong> Function might not be receiving requests</div>
          <div><strong>3. CORS Errors:</strong> Function exists but has header issues</div>
          <div><strong>4. 404 Errors:</strong> Function name mismatch or wrong URL</div>
          <div><strong>5. Network Errors:</strong> Firewall or connectivity issues</div>
        </div>
      </div>

      {/* Debug Logs */}
      <div className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
        <h3 className="text-white mb-2">📝 Debug Logs:</h3>
        {logs.length === 0 ? (
          <div className="text-gray-500">No logs yet. Click a test button above.</div>
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

      {/* Manual Test */}
      <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">
          🧪 Manual Test (Browser Console)
        </h3>
        <p className="text-sm text-blue-700 mb-3">
          If the above tests fail, try this manual test in your browser console:
        </p>
        <code className="block p-3 bg-gray-800 text-green-400 rounded text-xs overflow-x-auto">
          {`fetch('https://plktjrbfnzyelwkyyssz.supabase.co/functions/v1/historical-archive', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${SUPABASE_ANON_KEY}',
    'apikey': '${SUPABASE_ANON_KEY}'
  },
  body: JSON.stringify({ action: 'start' })
}).then(r => r.json()).then(console.log).catch(console.error)`}
        </code>
      </div>
    </div>
  );
}
