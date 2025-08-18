// Debug Enhanced Backfill Connection Issues
// File: src/components/debug/BackfillDebugger.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function BackfillDebugger() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Get environment variables using the same method as MonitorControl
  const getEnvVar = (name: string) => {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[`REACT_APP_${name}`] || process.env[`NEXT_PUBLIC_${name}`] || process.env[name];
    }
    if (typeof window !== 'undefined' && (window as any).env) {
      return (window as any).env[name];
    }
    // Check import.meta.env (Vite)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[`VITE_${name}`];
    }
    return null;
  };

  const SUPABASE_URL = getEnvVar('SUPABASE_URL');
  const SUPABASE_ANON_KEY = getEnvVar('SUPABASE_ANON_KEY');

  const debugBackfillConnection = async () => {
    setLoading(true);
    setLogs([]);
    
    try {
      addLog('🔍 Starting enhanced backfill debugging...');
      
      // 1. Check environment variables
      addLog(`📊 SUPABASE_URL: ${SUPABASE_URL ? 'Found' : 'MISSING'}`);
      addLog(`🔑 SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'Found (****)' : 'MISSING'}`);
      
      if (!SUPABASE_URL) {
        addLog('❌ SUPABASE_URL is missing. Check environment variables.');
        return;
      }
      
      if (!SUPABASE_ANON_KEY) {
        addLog('❌ SUPABASE_ANON_KEY is missing. Check environment variables.');
        return;
      }

      const functionUrl = `${SUPABASE_URL}/functions/v1/historical-backfill`;
      addLog(`🎯 Function URL: ${functionUrl}`);

      // 2. Test OPTIONS request (CORS preflight)
      addLog('🔄 Testing CORS preflight (OPTIONS)...');
      try {
        const optionsResponse = await fetch(functionUrl, {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
          }
        });
        
        addLog(`✅ OPTIONS response: ${optionsResponse.status} ${optionsResponse.statusText}`);
        addLog(`📋 CORS headers: ${JSON.stringify(Object.fromEntries(optionsResponse.headers))}`);
      } catch (optionsError) {
        addLog(`❌ OPTIONS request failed: ${optionsError}`);
      }

      // 3. Test basic connectivity
      addLog('🔄 Testing basic connectivity...');
      try {
        const basicResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ action: 'status' })
        });

        addLog(`📡 Basic connectivity: ${basicResponse.status} ${basicResponse.statusText}`);
        
        if (basicResponse.ok) {
          const responseText = await basicResponse.text();
          addLog(`📄 Response body: ${responseText}`);
          
          try {
            const responseJson = JSON.parse(responseText);
            addLog(`✅ JSON parsed successfully`);
            addLog(`📊 Response details: ${JSON.stringify(responseJson, null, 2)}`);
          } catch (parseError) {
            addLog(`❌ JSON parse failed: ${parseError}`);
          }
        } else {
          const errorText = await basicResponse.text();
          addLog(`❌ Error response: ${errorText}`);
        }

      } catch (fetchError) {
        addLog(`❌ Fetch failed: ${fetchError}`);
        addLog(`🔍 Error details: ${JSON.stringify(fetchError, Object.getOwnPropertyNames(fetchError))}`);
      }

      // 4. Test with timeout
      addLog('🔄 Testing with timeout handling...');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const timeoutResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ action: 'start' }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        addLog(`⏱️ Timeout test: ${timeoutResponse.status} ${timeoutResponse.statusText}`);

        if (timeoutResponse.ok) {
          const timeoutResponseJson = await timeoutResponse.json();
          addLog(`✅ Enhanced backfill successful!`);
          addLog(`📊 Details: ${JSON.stringify(timeoutResponseJson, null, 2)}`);
        }

      } catch (timeoutError) {
        if (timeoutError.name === 'AbortError') {
          addLog(`⏱️ Request timed out after 10 seconds`);
        } else {
          addLog(`❌ Timeout test failed: ${timeoutError}`);
        }
      }

      // 5. Test network conditions
      addLog('🌐 Testing network conditions...');
      try {
        const networkTest = await fetch('https://httpbin.org/json', { method: 'GET' });
        addLog(`🌐 External network test: ${networkTest.status} (httpbin.org)`);
      } catch (networkError) {
        addLog(`🌐 Network test failed: ${networkError}`);
      }

    } catch (error) {
      addLog(`💥 Debug session failed: ${error}`);
    } finally {
      setLoading(false);
      addLog('🔍 Debug session completed');
    }
  };

  const testDirectBackfill = async () => {
    setLoading(true);
    addLog('🚀 Testing direct backfill call...');

    try {
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

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ Direct backfill successful!`);
        addLog(`📊 Result: ${JSON.stringify(result, null, 2)}`);
      } else {
        const errorText = await response.text();
        addLog(`❌ Direct backfill failed: ${response.status} ${response.statusText}`);
        addLog(`📄 Error details: ${errorText}`);
      }
    } catch (error) {
      addLog(`💥 Direct backfill error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const fixMonitorControlCode = () => {
    addLog('🔧 Showing corrected MonitorControl code...');
    addLog('');
    addLog('// Fixed runHistoricalBackfill function:');
    addLog('const runHistoricalBackfill = async () => {');
    addLog('  setLoading(true);');
    addLog('  try {');
    addLog('    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;');
    addLog('    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;');
    addLog('    ');
    addLog('    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {');
    addLog('      throw new Error("Missing environment variables");');
    addLog('    }');
    addLog('    ');
    addLog('    const response = await fetch(`${SUPABASE_URL}/functions/v1/historical-backfill`, {');
    addLog('      method: "POST",');
    addLog('      headers: {');
    addLog('        "Content-Type": "application/json",');
    addLog('        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,');
    addLog('        "apikey": SUPABASE_ANON_KEY');
    addLog('      },');
    addLog('      body: JSON.stringify({ action: "start" })');
    addLog('    });');
    addLog('    ');
    addLog('    if (!response.ok) {');
    addLog('      const errorText = await response.text();');
    addLog('      throw new Error(`HTTP ${response.status}: ${errorText}`);');
    addLog('    }');
    addLog('    ');
    addLog('    const data = await response.json();');
    addLog('    // Handle success...');
    addLog('  } catch (error) {');
    addLog('    console.error("Enhanced backfill error:", error);');
    addLog('    // Handle error...');
    addLog('  } finally {');
    addLog('    setLoading(false);');
    addLog('  }');
    addLog('};');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">🔍 Enhanced Backfill Debugger</h2>
        <p className="text-gray-600">Diagnose connection issues between Lovable and Supabase edge function</p>
      </div>

      {/* Environment Status */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">📊 Environment Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={SUPABASE_URL ? "default" : "destructive"}>
              SUPABASE_URL
            </Badge>
            <span className="text-sm">{SUPABASE_URL ? '✅ Found' : '❌ Missing'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={SUPABASE_ANON_KEY ? "default" : "destructive"}>
              SUPABASE_ANON_KEY
            </Badge>
            <span className="text-sm">{SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing'}</span>
          </div>
        </div>
        {SUPABASE_URL && (
          <div className="mt-3 text-sm text-gray-600">
            Function URL: <code className="bg-gray-100 px-2 py-1 rounded">{SUPABASE_URL}/functions/v1/historical-backfill</code>
          </div>
        )}
      </Card>

      {/* Debug Actions */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">🔧 Debug Actions</h3>
        <div className="flex gap-3 flex-wrap">
          <Button 
            onClick={debugBackfillConnection} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Debugging...' : '🔍 Full Connection Debug'}
          </Button>
          
          <Button 
            onClick={testDirectBackfill} 
            disabled={loading}
            variant="outline"
          >
            🚀 Test Direct Backfill
          </Button>
          
          <Button 
            onClick={fixMonitorControlCode} 
            disabled={loading}
            variant="outline"
          >
            🔧 Show Fixed Code
          </Button>
        </div>
      </Card>

      {/* Common Issues & Solutions */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">💡 Common Issues & Solutions</h3>
        <div className="space-y-3">
          <Alert>
            <AlertDescription>
              <strong>Issue:</strong> "Failed to fetch" error in Lovable but function works directly
              <br />
              <strong>Solution:</strong> Usually a CORS or environment variable issue. Check that:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Environment variables are properly set in Lovable</li>
                <li>Function URL is correct (check for /functions/v1/ path)</li>
                <li>CORS headers are properly set in the edge function</li>
                <li>No network/firewall blocking the request</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertDescription>
              <strong>Issue:</strong> Environment variables not found
              <br />
              <strong>Solution:</strong> In Lovable, make sure you have:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code>VITE_SUPABASE_URL</code> set to your Supabase project URL</li>
                <li><code>VITE_SUPABASE_ANON_KEY</code> set to your anon key</li>
                <li>Or use the fallback method in getEnvVar function</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert>
            <AlertDescription>
              <strong>Issue:</strong> Function responds with 0 results
              <br />
              <strong>Solution:</strong> This is actually working correctly! The function found:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>8 existing regulations (already in database)</li>
                <li>216 existing clauses (already analyzed)</li>
                <li>The function only adds NEW regulations/clauses</li>
                <li>To see enhanced analysis, try ingesting a new regulation first</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </Card>

      {/* Debug Logs */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">📝 Debug Logs</h3>
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Run a debug action to see logs.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
