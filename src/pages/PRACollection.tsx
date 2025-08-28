// pages/PRACollection.tsx - Updated to use your scraped JSON data
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PRA_RULES, PRA_INSURANCE_RULES } from '@/data/pra-rules.generated.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PRACollectionDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({
    rulebookSections: 0,
    supervisoryStatements: 0,
    totalDocuments: 0,
    totalClauses: 0,
    trainingDataReady: false
  });

  // Load stats from Supabase on mount
  useEffect(() => {
    loadStatsFromSupabase();
  }, []);

  const loadStatsFromSupabase = async () => {
    try {
      // Count processed documents
      const { count: totalDocs } = await supabase
        .from('regulation_documents')
        .select('*', { count: 'exact', head: true });

      // Count extracted clauses  
      const { count: totalClauses } = await supabase
        .from('clauses')
        .select('*', { count: 'exact', head: true });

      setStats({
        rulebookSections: PRA_RULES.length,
        supervisoryStatements: PRA_INSURANCE_RULES.length, 
        totalDocuments: totalDocs || 0,
        totalClauses: totalClauses || 0,
        trainingDataReady: (totalDocs || 0) > 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Get or create PRA regulation entry
  const ensurePRARegulation = async () => {
    const { data, error } = await supabase
      .from('regulations')
      .select('id')
      .eq('short_code', 'PRA-RULEBOOK')
      .single();

    if (data) return data.id;

    // Create new regulation entry
    const { data: newReg, error: createError } = await supabase
      .from('regulations')
      .insert({
        title: 'PRA Rulebook',
        short_code: 'PRA-RULEBOOK', 
        jurisdiction: 'UK',
        regulator: 'Prudential Regulation Authority'
        // Add org_id from your auth context if needed
      })
      .select('id')
      .single();

    if (createError) throw createError;
    return newReg.id;
  };

  // Main collection function - now uses your JSON data
  const startCollection = async (source) => {
    if (loading) return;
    
    setLoading(true);
    setMessage('🚀 Starting PRA collection with AI analysis...');
    
    try {
      const regulationId = await ensurePRARegulation();
      
      if (source === 'pra_rulebook') {
        await collectPRArulebookSections(regulationId);
      } else if (source === 'pra_insurance') {
        await collectPRAinsuranceSections(regulationId);
      } else if (source === 'pra_complete') {
        await collectPRArulebookSections(regulationId);
        await collectPRAinsuranceSections(regulationId);
      }
      
      setMessage(`🎉 Collection complete! Real PRA documents processed with full AI analysis.`);
      loadStatsFromSupabase(); // Refresh stats

    } catch (error) {
      setMessage(`❌ Collection failed: ${error.message}`);
      console.error('Collection error:', error);
    }
    
    setLoading(false);
  };

  // Process PRA Rulebook sections using your JSON data
  const collectPRArulebookSections = async (regulationId) => {
    // Use your scraped JSON data instead of hardcoded URLs
    const praSections = PRA_RULES;
    
    setCurrentJob({
      id: crypto.randomUUID(),
      source: 'pra_rulebook',
      status: 'running',
      totalDocuments: praSections.length,
      processedDocuments: 0
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < praSections.length; i++) {
      const section = praSections[i];
      
      try {
        setMessage(`🤖 AI Processing: ${section.name} (${i + 1}/${praSections.length}) - Extracting obligations, risk areas, themes...`);
        
        // Call your existing reggio-ingest function - THIS DOES THE AI ANALYSIS
        const { data, error } = await supabase.functions.invoke('reggio-ingest', {
          body: {
            regulationId: regulationId,
            source_url: section.url,
            document: {
              versionLabel: 'Current',
              docType: 'Regulation',
              language: 'en',
              source_url: section.url,
              published_at: new Date().toISOString()
            }
            // Let the function fetch and chunk the content automatically
          }
        });

        if (error) {
          console.error(`Failed to process ${section.name}:`, error);
          setMessage(`⚠️ AI Analysis Failed: ${section.name} - ${error.message}`);
          failCount++;
        } else {
          setMessage(`✅ AI Complete: ${section.name} - Obligations extracted and stored!`);
          successCount++;
        }

      } catch (error) {
        console.error(`Error processing ${section.name}:`, error);
        setMessage(`❌ Error: ${section.name} - ${error.message}`);
        failCount++;
      }

      // Update progress
      setCurrentJob(prev => prev ? {...prev, processedDocuments: i + 1} : null);

      // Rate limiting - wait 3 seconds between calls (free Groq protection)
      if (i < praSections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    setCurrentJob(null);
    setMessage(`🎉 PRA Rulebook AI Analysis Complete! ✅ ${successCount} processed, ❌ ${failCount} failed.`);
  };

  // Process PRA Insurance sections using your JSON data  
  const collectPRAinsuranceSections = async (regulationId) => {
    const praSections = PRA_INSURANCE_RULES;
    
    setCurrentJob({
      id: crypto.randomUUID(),
      source: 'pra_insurance',
      status: 'running', 
      totalDocuments: praSections.length,
      processedDocuments: 0
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < praSections.length; i++) {
      const section = praSections[i];
      
      try {
        setMessage(`🤖 AI Processing: ${section.name} (${i + 1}/${praSections.length}) - Insurance rules analysis...`);
        
        const { data, error } = await supabase.functions.invoke('reggio-ingest', {
          body: {
            regulationId: regulationId,
            source_url: section.url,
            document: {
              versionLabel: 'Current',
              docType: 'Regulation',
              language: 'en', 
              source_url: section.url,
              published_at: new Date().toISOString()
            }
          }
        });

        if (error) {
          console.error(`Failed to process ${section.name}:`, error);
          setMessage(`⚠️ AI Analysis Failed: ${section.name} - ${error.message}`);
          failCount++;
        } else {
          setMessage(`✅ AI Complete: ${section.name} - Insurance obligations extracted!`);
          successCount++;
        }

      } catch (error) {
        console.error(`Error processing ${section.name}:`, error);
        setMessage(`❌ Error: ${section.name} - ${error.message}`);
        failCount++;
      }

      // Update progress
      setCurrentJob(prev => prev ? {...prev, processedDocuments: i + 1} : null);

      // Rate limiting
      if (i < praSections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    setCurrentJob(null);
    setMessage(`🎉 PRA Insurance Rules Complete! ✅ ${successCount} processed, ❌ ${failCount} failed.`);
  };

  const exportData = async () => {
    // Export processed AI data for training/analysis
    setMessage('📊 Exporting AI training dataset...');
    
    try {
      const { data: clauses, error } = await supabase
        .from('clauses')
        .select(`
          id,
          text_raw,
          summary_plain,
          obligation_type,
          risk_area,
          themes,
          industries,
          obligations (
            description,
            due_date_estimate
          )
        `);

      if (error) throw error;

      // Create downloadable JSON
      const exportData = {
        generated_at: new Date().toISOString(),
        source: 'PRA Rulebook AI Analysis',
        total_clauses: clauses.length,
        data: clauses
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pra-ai-dataset-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      setMessage('✅ AI dataset exported successfully!');
    } catch (error) {
      setMessage(`❌ Export failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏛️ PRA Collection & AI Analysis Dashboard
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Process real PRA rulebook documents through AI analysis. Extract obligations, 
            risk areas, and regulatory themes from {PRA_RULES.length + PRA_INSURANCE_RULES.length} official PRA rules.
          </p>
        </div>

        {/* Progress Display */}
        {currentJob && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">
              🔄 AI Processing In Progress
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Progress</span>
                <span>{currentJob.processedDocuments}/{currentJob.totalDocuments}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(currentJob.processedDocuments / currentJob.totalDocuments) * 100}%` 
                  }}
                />
              </div>
              <p className="text-sm text-blue-600">
                Each document is being processed for regulatory obligations, risk classification, and thematic analysis.
              </p>
            </div>
          </div>
        )}

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-lg border ${
            message.includes('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 
            message.includes('❌') ? 'bg-red-50 border border-red-200 text-red-800' : 
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <p className="font-medium">{message}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Available Rules</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{PRA_RULES.length}</p>
            <p className="text-sm text-gray-500 mt-1">Non-insurance rules</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wide">Insurance Rules</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{PRA_INSURANCE_RULES.length}</p>
            <p className="text-sm text-gray-500 mt-1">Insurance-specific rules</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide">Processed Documents</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalDocuments}</p>
            <p className="text-sm text-gray-500 mt-1">AI analyzed</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Extracted Clauses</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClauses.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Regulatory obligations</p>
          </div>
        </div>

        {/* Collection Controls */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            🔧 Collection Controls - Process Your JSON Data
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PRA Rulebook */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl">📖</span>
                </div>
                <h3 className="font-bold text-blue-900 text-lg">PRA Non-Insurance Rules</h3>
              </div>
              <p className="text-sm text-blue-700 mb-4 text-center">
                Process {PRA_RULES.length} non-insurance PRA rules from your scraped JSON data through AI analysis.
              </p>
              <div className="text-center text-xs text-blue-600 mb-4">
                📊 {PRA_RULES.length} rules • 🤖 Full AI analysis • ⏱️ ~{Math.ceil(PRA_RULES.length * 3 / 60)} minutes
              </div>
              <button
                onClick={() => startCollection('pra_rulebook')}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? '🔄 AI Processing...' : '🚀 Process Non-Insurance Rules'}
              </button>
            </div>

            {/* Insurance Rules */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl">🏥</span>
                </div>
                <h3 className="font-bold text-green-900 text-lg">PRA Insurance Rules</h3>
              </div>
              <p className="text-sm text-green-700 mb-4 text-center">
                Process {PRA_INSURANCE_RULES.length} insurance-specific PRA rules through AI analysis.
              </p>
              <div className="text-center text-xs text-green-600 mb-4">
                📊 {PRA_INSURANCE_RULES.length} rules • 🤖 Full AI analysis • ⏱️ ~{Math.ceil(PRA_INSURANCE_RULES.length * 3 / 60)} minutes  
              </div>
              <button
                onClick={() => startCollection('pra_insurance')}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? '🔄 AI Processing...' : '🚀 Process Insurance Rules'}
              </button>
            </div>

            {/* Complete Collection */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <div className="bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-xl">🎯</span>
                </div>
                <h3 className="font-bold text-purple-900 text-lg">Complete PRA Collection</h3>
              </div>
              <p className="text-sm text-purple-700 mb-4 text-center">
                Process all {PRA_RULES.length + PRA_INSURANCE_RULES.length} PRA rules from both JSON files.
              </p>
              <div className="text-center text-xs text-purple-600 mb-4">
                📊 {PRA_RULES.length + PRA_INSURANCE_RULES.length} total rules • 🤖 Complete AI analysis • ⏱️ ~{Math.ceil((PRA_RULES.length + PRA_INSURANCE_RULES.length) * 3 / 60)} minutes
              </div>
              <button
                onClick={() => startCollection('pra_complete')}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? '🔄 AI Processing...' : '🚀 Process All PRA Rules'}
              </button>
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Export AI Dataset</h3>
              <p className="text-sm text-gray-500">
                {stats.trainingDataReady ? '✅ AI-analyzed data ready for export' : '⏳ Process rules first to enable export'}
              </p>
            </div>
            <button
              onClick={exportData}
              disabled={!stats.trainingDataReady}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📊 Export AI Dataset
            </button>
          </div>
        </div>

        {/* Test Status Footer */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
          <h3 className="text-xl font-bold mb-3">🧪 Ready to Test Your AI Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">✅ Your JSON Data:</h4>
              <ul className="space-y-1 opacity-90">
                <li>• {PRA_RULES.length} non-insurance rules loaded</li>
                <li>• {PRA_INSURANCE_RULES.length} insurance rules loaded</li>
                <li>• Clean URLs ready for processing</li>
                <li>• Connected to reggio-ingest function</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎯 What You'll Get:</h4>
              <ul className="space-y-1 opacity-90">
                <li>• AI-extracted regulatory obligations</li>
                <li>• Risk area classification</li>
                <li>• Thematic analysis of regulations</li>
                <li>• Series A demo-ready intelligence</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PRACollectionDashboard;
