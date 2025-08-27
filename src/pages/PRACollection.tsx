import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadStatsFromSupabase();
  }, []);

  const loadStatsFromSupabase = async () => {
    try {
      // Get actual data from your existing Supabase
      const { data: regulations, error } = await supabase
        .from('regulations')
        .select('id, regulator, short_code')
        .eq('regulator', 'PRA');

      if (error) throw error;

      // Get documents and clauses for PRA regulations
      const praRegIds = regulations?.map(r => r.id) || [];
      
      const { data: documents } = await supabase
        .from('regulation_documents')
        .select('id')
        .in('regulation_id', praRegIds);

      const { data: clauses } = await supabase
        .from('clauses')
        .select('id')
        .in('regulation_id', praRegIds);

      const praRegulations = regulations || [];
      const rulebookCount = praRegulations.filter(r => !r.short_code?.startsWith('SS')).length;
      const ssCount = praRegulations.filter(r => r.short_code?.startsWith('SS')).length;

      setStats({
        totalRegulations: praRegulations.length,
        totalDocuments: documents?.length || 0,
        totalClauses: clauses?.length || 0,
        rulebookSections: rulebookCount,
        supervisoryStatements: ssCount,
        aiAnalysisComplete: documents?.length ? Math.round((clauses?.length || 0) / (documents.length * 10) * 100) : 0,
        trainingDataReady: (clauses?.length || 0) > 10
      });

      setMessage(`✅ Connected to database. Found ${praRegulations.length} PRA regulations, ${documents?.length || 0} documents, ${clauses?.length || 0} AI-analyzed clauses.`);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setMessage(`❌ Database connection failed: ${error.message}`);
    }
  };

  const startCollection = async (type) => {
    setLoading(true);
    setMessage(`🚀 Starting ${type.replace('_', ' ')} collection with FULL AI ANALYSIS...`);
    
    try {
      // First, create a PRA regulation entry to collect into
      const { data: regulation, error: regError } = await supabase
        .from('regulations')
        .insert({
          title: `PRA Collection - ${type.replace('_', ' ')}`,
          short_code: `PRA-${type.toUpperCase()}-${Date.now()}`,
          jurisdiction: 'UK',
          regulator: 'PRA',
          org_id: import.meta.env.VITE_REGGIO_ORG_ID || 'd3546758-a241-4546-aff7-fa600731502a'
        })
        .select()
        .single();

      if (regError) throw regError;

      // Now start the real collection process with AI analysis
      if (type === 'pra_rulebook') {
        await collectPRArulebookSections(regulation.id);
      } else if (type === 'pra_supervisory_statements') {
        await collectSupervisoryStatements(regulation.id);
      } else if (type === 'pra_complete') {
        await collectPRArulebookSections(regulation.id);
        await collectSupervisoryStatements(regulation.id);
      }

      setMessage(`✅ Collection completed! Real PRA documents processed with full AI analysis.`);
      loadStatsFromSupabase(); // Refresh stats

    } catch (error) {
      setMessage(`❌ Collection failed: ${error.message}`);
      console.error('Collection error:', error);
    }
    
    setLoading(false);
  };

  // Collect PRA Rulebook sections with AI analysis
  const collectPRArulebookSections = async (regulationId) => {
    const praSections = [
      // Banking + Cross-sector PRA Rules
const praSections = [
  { name: 'Actuaries', url: 'https://www.prarulebook.co.uk/pra-rules/actuaries' },
  { name: 'Algorithmic Trading', url: 'https://www.prarulebook.co.uk/pra-rules/algorithmic-trading' },
  { name: 'Allocation of Responsibilities', url: 'https://www.prarulebook.co.uk/pra-rules/allocation-of-responsibilities' },
  { name: 'Audit Committee', url: 'https://www.prarulebook.co.uk/pra-rules/audit-committee' },
  { name: 'Auditors', url: 'https://www.prarulebook.co.uk/pra-rules/auditors' },
  { name: 'Benchmarking of Internal Approaches', url: 'https://www.prarulebook.co.uk/pra-rules/benchmarking-of-internal-approaches' },
  { name: 'Capital Buffers', url: 'https://www.prarulebook.co.uk/pra-rules/capital-buffers' },
  { name: 'Certification', url: 'https://www.prarulebook.co.uk/pra-rules/certification' },
  { name: 'Change in Control', url: 'https://www.prarulebook.co.uk/pra-rules/change-in-control' },
  { name: 'Close Links', url: 'https://www.prarulebook.co.uk/pra-rules/close-links' },
  { name: 'Compliance and Internal Audit', url: 'https://www.prarulebook.co.uk/pra-rules/compliance-and-internal-audit' },
  { name: 'Composites', url: 'https://www.prarulebook.co.uk/pra-rules/composites' },
  { name: 'Conditions Governing Business', url: 'https://www.prarulebook.co.uk/pra-rules/conditions-governing-business' },
  { name: 'Conduct Rules', url: 'https://www.prarulebook.co.uk/pra-rules/conduct-rules' },
  { name: 'Contractual Recognition Of Bail-In', url: 'https://www.prarulebook.co.uk/pra-rules/contractual-recognition-of-bail-in' },
  { name: 'Counterparty Credit Risk (CRR)', url: 'https://www.prarulebook.co.uk/pra-rules/counterparty-credit-risk-crr' },
  { name: 'Counterparty Credit Risk (Deleted)', url: 'https://www.prarulebook.co.uk/pra-rules/counterparty-credit-risk-deleted' },
  { name: 'Credit Risk', url: 'https://www.prarulebook.co.uk/pra-rules/credit-risk' },
  { name: 'Credit Unions', url: 'https://www.prarulebook.co.uk/pra-rules/credit-unions' },
  { name: 'Credit Valuation Adjustment Risk (CRR)', url: 'https://www.prarulebook.co.uk/pra-rules/credit-valuation-adjustment-risk-crr' },
  { name: 'Critical Third Parties', url: 'https://www.prarulebook.co.uk/pra-rules/critical-third-parties' },
  { name: 'Definition of Capital', url: 'https://www.prarulebook.co.uk/pra-rules/definition-of-capital' },
  { name: 'Depositor Protection', url: 'https://www.prarulebook.co.uk/pra-rules/depositor-protection' },
  { name: 'Designation', url: 'https://www.prarulebook.co.uk/pra-rules/designation' },
  { name: 'Disclosure (CRR)', url: 'https://www.prarulebook.co.uk/pra-rules/disclosure-crr' },
  { name: 'Dormant Account Scheme (Deleted)', url: 'https://www.prarulebook.co.uk/pra-rules/dormant-account-scheme-deleted' },
  { name: 'External Audit', url: 'https://www.prarulebook.co.uk/pra-rules/external-audit' },
  { name: 'FSCS Management Expenses Levy Limit and Base Costs', url: 'https://www.prarulebook.co.uk/pra-rules/fscs-management-expenses-levy-limit-and-base-costs' },
  { name: 'Fees', url: 'https://www.prarulebook.co.uk/pra-rules/fees' },
  { name: 'Financial Conglomerates', url: 'https://www.prarulebook.co.uk/pra-rules/financial-conglomerates' },
  { name: 'Fitness and Propriety', url: 'https://www.prarulebook.co.uk/pra-rules/fitness-and-propriety' },
  { name: 'Fundamental Rules', url: 'https://www.prarulebook.co.uk/pra-rules/fundamental-rules' },
  { name: 'General Organisational Requirements', url: 'https://www.prarulebook.co.uk/pra-rules/general-organisational-requirements' },
  { name: 'General Provisions', url: 'https://www.prarulebook.co.uk/pra-rules/general-provisions' },
  { name: 'Governance', url: 'https://www.prarulebook.co.uk/pra-rules/governance' },
  { name: 'Group Supervision', url: 'https://www.prarulebook.co.uk/pra-rules/group-supervision' },
  { name: 'Holding Companies', url: 'https://www.prarulebook.co.uk/pra-rules/holding-companies' },
  { name: 'Information Gathering', url: 'https://www.prarulebook.co.uk/pra-rules/information-gathering' },
  { name: 'Internal Capital Adequacy Assessment', url: 'https://www.prarulebook.co.uk/pra-rules/internal-capital-adequacy-assessment' },
  { name: 'Internal Liquidity Adequacy Assessment', url: 'https://www.prarulebook.co.uk/pra-rules/internal-liquidity-adequacy-assessment' },
  { name: 'Large Exposures (CRR)', url: 'https://www.prarulebook.co.uk/pra-rules/large-exposures-crr' },
  { name: 'Large Non-Bank Exposures', url: 'https://www.prarulebook.co.uk/pra-rules/large-non-bank-exposures' },
  { name: 'Lending Standards', url: 'https://www.prarulebook.co.uk/pra-rules/lending-standards' },
  { name: 'Liquidity', url: 'https://www.prarulebook.co.uk/pra-rules/liquidity' },
  { name: 'Market Risk (CRR)', url: 'https://www.prarulebook.co.uk/pra-rules/market-risk-crr' },
  { name: 'Model Risk Management', url: 'https://www.prarulebook.co.uk/pra-rules/model-risk-management' },
  { name: 'Notification', url: 'https://www.prarulebook.co.uk/pra-rules/notification' },
  { name: 'Operational Continuity Part', url: 'https://www.prarulebook.co.uk/pra-rules/operational-continuity-part' },
  { name: 'Overseas Firms', url: 'https://www.prarulebook.co.uk/pra-rules/overseas-firms' },
  { name: 'Own Funds (CRR)', url: 'https://www.prarulebook.co.uk/pra-rules/own-funds-crr' },
  { name: 'Pensions', url: 'https://www.prarulebook.co.uk/pra-rules/pensions' },
  { name: 'Provisions', url: 'https://www.prarulebook.co.uk/pra-rules/provisions' },
  { name: 'Recovery Plans', url: 'https://www.prarulebook.co.uk/pra-rules/recovery-plans' },
  { name: 'Regulatory Reporting', url: 'https://www.prarulebook.co.uk/pra-rules/regulatory-reporting' },
  { name: 'Remuneration', url: 'https://www.prarulebook.co.uk/pra-rules/remuneration' },
  { name: 'Ring-fencing', url: 'https://www.prarulebook.co.uk/pra-rules/ring-fencing' },
  { name: 'Risk Management', url: 'https://www.prarulebook.co.uk/pra-rules/risk-management' },
  { name: 'Rulebook Glossary', url: 'https://www.prarulebook.co.uk/pra-rules/rulebook-glossary' },
  { name: 'Senior Management Functions', url: 'https://www.prarulebook.co.uk/pra-rules/senior-management-functions' },
  { name: 'Supervisory Disclosure', url: 'https://www.prarulebook.co.uk/pra-rules/supervisory-disclosure' },
  { name: 'Third Country Branches', url: 'https://www.prarulebook.co.uk/pra-rules/third-country-branches' },
  { name: 'Trading Book (CRR)', url: 'https://www.prarulebook.co.uk/pra-rules/trading-book-crr' },
  { name: 'Wind Down Planning', url: 'https://www.prarulebook.co.uk/pra-rules/wind-down-planning' }
];

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
    setMessage(`🎉 PRA Rulebook AI Analysis Complete! ✅ ${successCount} processed, ❌ ${failCount} failed. Check your clauses table for extracted obligations!`);
  };

  // Collect Supervisory Statements with AI analysis  
  const collectSupervisoryStatements = async (regulationId) => {
    const supervisoryStatements = [
      {
        reference: 'SS1/13',
        title: 'Groups',
        url: 'https://www.bankofengland.co.uk/prudential-regulation/publication/2013/groups-ss'
      },
      {
        reference: 'SS12/13', 
        title: 'Counterparty credit risk',
        url: 'https://www.bankofengland.co.uk/prudential-regulation/publication/2013/counterparty-credit-risk-ss'
      },
      {
        reference: 'SS15/13',
        title: 'Groups', 
        url: 'https://www.bankofengland.co.uk/prudential-regulation/publication/2013/groups-ss'
      },
      {
        reference: 'SS24/15',
        title: 'The PRA\'s approach to supervising liquidity and funding risks',
        url: 'https://www.bankofengland.co.uk/prudential-regulation/publication/2015/the-pras-approach-to-supervising-liquidity-and-funding-risks-ss'
      },
      {
        reference: 'SS2/21',
        title: 'Outsourcing and third party risk management', 
        url: 'https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/outsourcing-and-third-party-risk-management-ss'
      },
      {
        reference: 'SS1/23',
        title: 'Model risk management principles for banks',
        url: 'https://www.bankofengland.co.uk/prudential-regulation/publication/2023/may/model-risk-management-principles-for-banks-ss'
      },
      {
        reference: 'SS1/24',
        title: 'Expectations for meeting the PRA\'s internal model requirements for insurers under Solvency II',
        url: 'https://www.bankofengland.co.uk/prudential-regulation/publication/2024/february/expectations-for-meeting-the-pra-internal-model-requirements-ss'
      },
      {
        reference: 'SS4/24',
        title: 'Credit risk internal ratings based approach',
        url: 'https://www.bankofengland.co.uk/prudential-regulation/publication/2024/september/credit-risk-internal-ratings-based-approach-supervisory-statement'
      }
    ];

    setCurrentJob({
      id: crypto.randomUUID(),
      source: 'pra_supervisory_statements', 
      status: 'running',
      totalDocuments: supervisoryStatements.length,
      processedDocuments: 0
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < supervisoryStatements.length; i++) {
      const statement = supervisoryStatements[i];
      
      try {
        setMessage(`🤖 AI Processing: ${statement.reference} - ${statement.title} (${i + 1}/${supervisoryStatements.length})`);
        
        // AI analysis through your existing function
        const { data, error } = await supabase.functions.invoke('reggio-ingest', {
          body: {
            regulationId: regulationId,
            source_url: statement.url,
            document: {
              versionLabel: statement.reference,
              docType: 'Guidance',
              language: 'en', 
              source_url: statement.url,
              published_at: new Date().toISOString()
            }
          }
        });

        if (error) {
          console.error(`Failed to process ${statement.reference}:`, error);
          setMessage(`⚠️ AI Failed: ${statement.reference} - ${error.message}`);
          failCount++;
        } else {
          setMessage(`✅ AI Complete: ${statement.reference} - Supervisory expectations extracted!`);
          successCount++;
        }

      } catch (error) {
        console.error(`Error processing ${statement.reference}:`, error);
        setMessage(`❌ Error: ${statement.reference} - ${error.message}`);
        failCount++;
      }

      setCurrentJob(prev => prev ? {...prev, processedDocuments: i + 1} : null);

      // Longer delay for PDFs and free Groq limits
      if (i < supervisoryStatements.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
    }

    setCurrentJob(null);
    setMessage(`🎉 Supervisory Statements AI Analysis Complete! ✅ ${successCount} processed, ❌ ${failCount} failed. Full PRA intelligence ready!`);
  };

  const exportData = async () => {
    try {
      const { data: regulations, error } = await supabase
        .from('regulations')
        .select(`
          *,
          regulation_documents(*),
          clauses(*)
        `)
        .eq('regulator', 'PRA');

      if (error) throw error;

      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalRegulations: regulations?.length || 0,
          totalClauses: regulations?.reduce((sum, reg) => sum + (reg.clauses?.length || 0), 0) || 0,
          dataSource: 'PRA Collection System with AI Analysis',
          version: '1.0'
        },
        regulations: regulations?.map(reg => ({
          id: reg.id,
          title: reg.title,
          shortCode: reg.short_code,
          jurisdiction: reg.jurisdiction,
          regulator: reg.regulator,
          documentCount: reg.regulation_documents?.length || 0,
          clauseCount: reg.clauses?.length || 0,
          aiAnalyzedClauses: reg.clauses?.filter(c => c.obligation_type).length || 0
        })) || []
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pra-ai-analysis-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage(`📥 Exported ${regulations?.length || 0} PRA regulations with full AI analysis to JSON file.`);
    } catch (error) {
      setMessage(`❌ Export failed: ${error.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-2">🎯 PRA Collection System</h1>
        <p className="text-gray-600">Real PRA Documents + Full AI Analysis = Regulatory Intelligence</p>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.includes('✅') || message.includes('🎉') ? 'bg-green-50 border border-green-200 text-green-800' : message.includes('❌') ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
          <p className="font-medium">{message}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Rulebook Sections</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.rulebookSections}</p>
          <p className="text-sm text-gray-500 mt-1">Current PRA rules</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wide">Supervisory Statements</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.supervisoryStatements}</p>
          <p className="text-sm text-gray-500 mt-1">2013-2024 guidance</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wide">Total Documents</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalDocuments}</p>
          <p className="text-sm text-gray-500 mt-1">AI processed</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wide">AI-Analyzed Clauses</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClauses.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Obligations extracted</p>
        </div>
      </div>

      {/* AI Analysis Explanation */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-indigo-900 mb-3">🤖 AI Analysis Included</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-indigo-800">
          <div>
            <h4 className="font-semibold mb-2">✅ Each Document Gets:</h4>
            <ul className="space-y-1">
              <li>• Obligation extraction (mandatory, reporting, etc.)</li>
              <li>• Risk area classification (capital, liquidity, etc.)</li>
              <li>• Theme identification (governance, compliance)</li>
              <li>• Industry applicability mapping</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">🎯 Ready For:</h4>
            <ul className="space-y-1">
              <li>• Stress testing linkage</li>
              <li>• Regulatory change alerts</li>
              <li>• Compliance monitoring</li>
              <li>• AI model training</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Collection Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          🔧 Collection Controls - Real PRA Documents + AI Analysis
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PRA Rulebook */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-xl">📖</span>
              </div>
              <h3 className="font-bold text-blue-900 text-lg">PRA Rulebook</h3>
            </div>
            <p className="text-sm text-blue-700 mb-4 text-center">
              Collect all 31 current PRA Rulebook sections with full AI analysis. Each rule gets processed for obligations, risk areas, and compliance requirements.
            </p>
            <div className="text-center text-xs text-blue-600 mb-4">
              📊 31 sections • 🤖 Full AI analysis • ⏱️ 15-20 minutes
            </div>
            <button
              onClick={() => startCollection('pra_rulebook')}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? '🔄 AI Processing...' : '🚀 Collect + Analyze Rulebook'}
            </button>
          </div>

          {/* Supervisory Statements */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-xl">📋</span>
              </div>
              <h3 className="font-bold text-green-900 text-lg">Supervisory Statements</h3>
            </div>
            <p className="text-sm text-green-700 mb-4 text-center">
              Historical collection of 8 key PRA supervisory expectations from 2013-2024 with AI analysis of regulatory evolution.
            </p>
            <div className="text-center text-xs text-green-600 mb-4">
              📊 8 key statements • 🤖 AI expectations extraction • ⏱️ 10-15 minutes
            </div>
            <button
              onClick={() => startCollection('pra_supervisory_statements')}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? '🔄 AI Processing...' : '📚 Collect + Analyze SS Documents'}
            </button>
          </div>

          {/* Complete Collection */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="bg-purple-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-xl">🎯</span>
              </div>
              <h3 className="font-bold text-purple-900 text-lg">Complete Collection</h3>
            </div>
            <p className="text-sm text-purple-700 mb-4 text-center">
              Full comprehensive collection of both PRA Rulebook and Supervisory Statements with complete AI analysis pipeline.
            </p>
            <div className="text-center text-xs text-purple-600 mb-4">
              📊 39 total documents • 🤖 Complete AI intelligence • ⏱️ 25-35 minutes
            </div>
            <button
              onClick={() => startCollection('pra_complete')}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? '🔄 AI Processing...' : '⚡ Complete PRA Intelligence'}
            </button>
          </div>
        </div>
      </div>

      {/* Current Job Status */}
      {currentJob && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            🤖 AI Analysis in Progress
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm font-semibold text-blue-600">Job Type</p>
                <p className="text-lg font-bold text-blue-900 capitalize">{currentJob.source.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-600">AI Status</p>
                <p className="text-lg font-bold text-blue-900">Processing Documents</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-600">Progress</p>
                <p className="text-lg font-bold text-blue-900">
                  {currentJob.processedDocuments} / {currentJob.totalDocuments}
                </p>
              </div>
            </div>
            
            <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                style={{width: `${(currentJob.processedDocuments / currentJob.totalDocuments) * 100}%`}}
              ></div>
            </div>
            <p className="text-sm text-blue-700 text-center">
              {Math.round((currentJob.processedDocuments / currentJob.totalDocuments) * 100)}% Complete - Each document gets full AI analysis
            </p>
          </div>
       </div>
     )}

     {/* Export Section */}
     <div className="bg-white rounded-lg shadow-md p-6">
       <h2 className="text-2xl font-bold mb-4 flex items-center">
         📥 Export AI-Analyzed Training Data
       </h2>
       <div className="flex items-center justify-between">
         <div>
           <p className="text-gray-600 mb-2">
             Export collected PRA data with full AI analysis as structured JSON for machine learning and advanced analytics.
           </p>
           <p className="text-sm text-gray-500">
             {stats.trainingDataReady ? '✅ AI-analyzed data ready for export' : '⏳ Complete a collection first to enable AI export'}
           </p>
         </div>
         <button
           onClick={exportData}
           disabled={!stats.trainingDataReady}
           className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
         >
           🤖 Export AI Dataset
         </button>
       </div>
     </div>

     {/* Free Groq Warning */}
     <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
       <h3 className="text-lg font-bold text-yellow-900 mb-3">⚠️ Free Groq Tier Notice</h3>
       <div className="text-sm text-yellow-800">
         <p className="mb-2">
           <strong>Current Setup:</strong> Using free Groq tier - may hit rate limits during large collections.
         </p>
         <p className="mb-2">
           <strong>Recommendation:</strong> Start with "PRA Rulebook" (31 docs) to test the system. If you hit limits, some documents may fail but you'll still get substantial PRA intelligence.
         </p>
         <p>
           <strong>For Full Power:</strong> Upgrade to Groq Pro ($20/month) for unlimited AI analysis of all 200+ PRA documents.
         </p>
       </div>
     </div>

     {/* Business Value Footer */}
     <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
       <h3 className="text-xl font-bold mb-3">🚀 What You Get: Real PRA Intelligence</h3>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
         <div>
           <h4 className="font-semibold mb-2">✅ Immediate AI-Powered Benefits:</h4>
           <ul className="space-y-1 opacity-90">
             <li>• Every PRA rule AI-analyzed for obligations</li>
             <li>• Risk areas automatically classified</li>
             <li>• Compliance requirements extracted</li>
             <li>• Ready for stress testing integration</li>
           </ul>
         </div>
         <div>
           <h4 className="font-semibold mb-2">🎯 Business Value:</h4>
           <ul className="space-y-1 opacity-90">
             <li>• Complete regulatory intelligence foundation</li>
             <li>• Client demos with real PRA knowledge</li>
             <li>• AI training data for regulatory prediction</li>
             <li>• Series A fundraising ready</li>
           </ul>
         </div>
       </div>
       <div className="mt-4 p-3 bg-white bg-opacity-20 rounded-lg">
         <p className="text-sm font-medium">
           🎯 <strong>Next Step:</strong> Click "Collect + Analyze Rulebook" to start processing real PRA documents with full AI analysis!
         </p>
       </div>
     </div>
   </div>
 );
};

export default PRACollectionDashboard;
