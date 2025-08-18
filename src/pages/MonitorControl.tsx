import { useState } from 'react';

export default function MonitorControlPanel() {
  const [status, setStatus] = useState('stopped');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // Replace with your actual Supabase project URL
  const SUPABASE_URL = 'https://plktjrbfnzyelwkyyssz.supabase.co';
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/realtime-monitor`;

  const callMonitorFunction = async (action) => {
    setLoading(true);
    try {
      const response = await fetch(`${FUNCTION_URL}?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Function call failed');
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
          <div className="text-sm text-gray-600">
            Monitoring UK/EU Regulatory Sources
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

      <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
        <h3 className="text-sm font-semibold mb-2 text-yellow-800">
          🧪 Test Mode (if edge function not deployed yet):
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

      <div className="p-4 rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">
          📝 Activity Log:
        </h3>
        <div className="h-40 overflow-y-auto bg-white p-3 rounded border">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity yet. Start monitoring to see logs.</p>
          ) : (
            <div className="space-y-1">
              {logs.slice(-10).reverse().map((log, index) => (
                <div key={index} className="text-sm font-mono text-gray-700">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-200">
        <h3 className="text-lg font-semibold mb-2 text-green-800">
          🚀 Quick Start:
        </h3>
        <ol className="text-sm text-green-700 space-y-1">
          <li>1. Try "Simulate Start" to test the interface</li>
          <li>2. Deploy realtime-monitor edge function to your Supabase</li>
          <li>3. Update SUPABASE_URL in the code with your project URL</li>
          <li>4. Use "Start Monitoring" for real regulatory feeds</li>
        </ol>
      </div>
    </div>
  );
}
