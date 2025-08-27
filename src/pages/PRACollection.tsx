import React, { useState, useEffect } from 'react';

const PRACollectionDashboard = () => {
  const [stats, setStats] = useState({
    totalRegulations: 0,
    totalDocuments: 0,
    totalClauses: 0,
    rulebookSections: 0,
    supervisoryStatements: 0,
    aiAnalysisComplete: 0,
    trainingDataReady: false
  });
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/pra/status');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const startCollection = async (type) => {
    setLoading(true);
    try {
      const response = await fetch('/api/pra/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: type })
      });
      
      const data = await response.json();
      if (data.job) {
        setCurrentJob(data.job);
        alert(`Collection started! Job ID: ${data.job.id}`);
      }
    } catch (error) {
      alert(`Collection failed: ${error.message}`);
    }
    setLoading(false);
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/pra/export');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pra-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-4">PRA Collection System</h1>
        <p className="text-gray-600">Comprehensive PRA Regulatory Intelligence Platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-blue-600">Rulebook Sections</h3>
          <p className="text-3xl font-bold">{stats.rulebookSections}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-green-600">Supervisory Statements</h3>
          <p className="text-3xl font-bold">{stats.supervisoryStatements}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-purple-600">Total Documents</h3>
          <p className="text-3xl font-bold">{stats.totalDocuments}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-orange-600">AI-Analyzed Clauses</h3>
          <p className="text-3xl font-bold">{stats.totalClauses.toLocaleString()}</p>
        </div>
      </div>

      {/* Collection Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Collection Controls</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-2">PRA Rulebook</h3>
            <p className="text-sm text-blue-700 mb-4">
              Collect all current PRA Rulebook sections (~32 sections, 15-20 minutes)
            </p>
            <button
              onClick={() => startCollection('pra_rulebook')}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Collect PRA Rulebook'}
            </button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-bold text-green-900 mb-2">Supervisory Statements</h3>
            <p className="text-sm text-green-700 mb-4">
              Collect PRA Supervisory Statements 2013-2024 (~150 statements, 30-45 minutes)
            </p>
            <button
              onClick={() => startCollection('pra_supervisory_statements')}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Collect Supervisory Statements'}
            </button>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-bold text-purple-900 mb-2">Complete Collection</h3>
            <p className="text-sm text-purple-700 mb-4">
              Full PRA collection - both rulebook and statements (~200+ documents, 45-60 minutes)
            </p>
            <button
              onClick={() => startCollection('pra_complete')}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Complete PRA Collection'}
            </button>
          </div>
        </div>
      </div>

      {/* Current Job Status */}
      {currentJob && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Collection in Progress</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p><strong>Job ID:</strong> {currentJob.id}</p>
            <p><strong>Type:</strong> {currentJob.source}</p>
            <p><strong>Status:</strong> {currentJob.status}</p>
            <p><strong>Documents:</strong> {currentJob.processedDocuments} / {currentJob.totalDocuments}</p>
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Export Training Data</h2>
        <p className="text-gray-600 mb-4">
          Export collected PRA data as JSON for AI training
        </p>
        <button
          onClick={exportData}
          disabled={!stats.trainingDataReady}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Export PRA Training Data
        </button>
        {!stats.trainingDataReady && (
          <p className="text-sm text-gray-500 mt-2">Complete a collection first to enable export</p>
        )}
      </div>

      {/* Status Footer */}
      <div className="bg-gray-100 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">
          🎯 <strong>Business Value:</strong> Complete PRA regulatory intelligence foundation • 
          📈 <strong>Next Steps:</strong> Scale to FCA, EBA, ECB regulators • 
          🚀 <strong>Client Ready:</strong> Series A fundraising and pilot demos
        </p>
      </div>
    </div>
  );
};

export default PRACollectionDashboard;
