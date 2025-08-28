// src/pages/PRACollection.tsx - Fixed imports for Vercel deployment
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Import JSON files directly (Vercel/Vite compatible)
import NON_INSURANCE_DATA from '@/data/pra-rules.non-insurance.json';
import INSURANCE_DATA from '@/data/pra-rules.insurance-only.json';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Process data inline to avoid import issues
const stripDate = (url: string) => url.replace(/\/\d{2}-\d{2}-\d{4}$/, '');

const PRA_RULES = (NON_INSURANCE_DATA || []).map(({ name, url }: any) => ({
  name,
  url: stripDate(url),
}));

const PRA_INSURANCE_RULES = (INSURANCE_DATA || []).map(({ name, url }: any) => ({
  name,
  url: stripDate(url),
}));

interface ProcessingJob {
  id: string;
  regulation_id: string;
  status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  total_chunks: number;
  processed_chunks: number;
  error_message?: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  progress_percentage: number;
  duration_seconds: number;
}

interface AsyncJobResult {
  success: boolean;
  processing_type: 'synchronous' | 'asynchronous';
  job_id?: string;
  regulation_document_id?: string;
  total_chunks: number;
  chunks_processed?: number;
  message: string;
}

export default function PRACollection() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);
  const [stats, setStats] = useState({ processed: 0, failed: 0, total: 0 });

  // Poll for async job updates every 10 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (processingJobs.some(job => job.status === 'STARTED' || job.status === 'IN_PROGRESS')) {
        await refreshProcessingJobs();
      }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [processingJobs]);

  // Load existing processing jobs on mount
  useEffect(() => {
    refreshProcessingJobs();
  }, []);

  async function refreshProcessingJobs() {
    try {
      const { data, error } = await supabase
        .from('processing_jobs_status_v')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setProcessingJobs(data || []);
    } catch (error) {
      console.error('Failed to refresh processing jobs:', error);
    }
  }

  async function processRule(rule: any, regulationId: string, ruleType: string): Promise<AsyncJobResult> {
    console.log(`Processing ${ruleType} rule: ${rule.name}`);
    
    const { data, error } = await supabase.functions.invoke('reggio-ingest', {
      body: {
        regulationId: regulationId,
        source_url: rule.url,
        document: {
          versionLabel: rule.reference || rule.name,
          docType: 'Regulation',
          language: 'en',
          source_url: rule.url,
          published_at: new Date().toISOString()
        }
      }
    });

    if (error) {
      console.error(`Failed to process ${rule.name}:`, error);
      throw new Error(`Processing failed: ${error.message}`);
    }

    return data as AsyncJobResult;
  }

  async function startCollection(type: 'non_insurance' | 'insurance' | 'complete') {
    if (loading) return;
    
    setLoading(true);
    setMessage('Starting PRA collection with GPT-5 Mini analysis...');
    
    try {
      // Get the regulation ID for PRA rules (you'll need to create this regulation first)
      const { data: regulation, error: regError } = await supabase
        .from('regulations')
        .select('id')
        .eq('short_code', 'PRA-LIQ-TEST') // Adjust this to your actual regulation
        .single();

      if (regError || !regulation) {
        throw new Error('PRA regulation not found. Please create the regulation first.');
      }

      const regulationId = regulation.id;
      let rulesToProcess: any[] = [];
      let totalRules = 0;

      // Determine which rules to process
      switch (type) {
        case 'non_insurance':
          rulesToProcess = PRA_RULES;
          totalRules = PRA_RULES.length;
          setMessage(`🚀 Starting Non-Insurance PRA Collection: ${totalRules} rules`);
          break;
          
        case 'insurance':
          rulesToProcess = PRA_INSURANCE_RULES;
          totalRules = PRA_INSURANCE_RULES.length;
          setMessage(`🚀 Starting Insurance PRA Collection: ${totalRules} rules`);
          break;
          
        case 'complete':
          rulesToProcess = [...PRA_RULES, ...PRA_INSURANCE_RULES];
          totalRules = PRA_RULES.length + PRA_INSURANCE_RULES.length;
          setMessage(`🚀 Starting Complete PRA Collection: ${totalRules} total rules`);
          break;
      }

      // Process rules and track sync vs async
      let processedCount = 0;
      let failedCount = 0;
      const activeJobs: string[] = [];
      
      setStats({ processed: 0, failed: 0, total: totalRules });

      for (let i = 0; i < rulesToProcess.length; i++) {
        const rule = rulesToProcess[i];
        
        try {
          setMessage(`📄 Processing ${rule.name} (${i + 1}/${totalRules})`);
          
          const result = await processRule(rule, regulationId, type);
          
          if (result.processing_type === 'synchronous') {
            // Immediate completion
            processedCount++;
            setMessage(`✅ Completed: ${rule.name} - ${result.chunks_processed} chunks analyzed`);
            
          } else if (result.processing_type === 'asynchronous') {
            // Async job queued
            activeJobs.push(result.job_id!);
            setMessage(`🔄 Queued: ${rule.name} - Job ${result.job_id} (${result.total_chunks} chunks)`);
          }

        } catch (error: any) {
          failedCount++;
          console.error(`Error processing ${rule.name}:`, error);
          setMessage(`❌ Failed: ${rule.name} - ${error.message}`);
        }

        // Update stats
        setStats(prev => ({
          ...prev,
          processed: processedCount,
          failed: failedCount
        }));

        // Short delay between requests
        if (i < rulesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Final status message
      if (activeJobs.length > 0) {
        setMessage(`🎯 Collection Started: ${processedCount} completed immediately, ${activeJobs.length} processing in background, ${failedCount} failed`);
      } else {
        setMessage(`🎉 Collection Complete: ${processedCount} processed, ${failedCount} failed`);
      }

      // Refresh processing jobs to show new async jobs
      await refreshProcessingJobs();

    } catch (error: any) {
      console.error('Collection error:', error);
      setMessage(`❌ Collection Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Single document test function
  async function testSingleDocument() {
    if (loading) return;
    
    setLoading(true);
    setMessage('Testing single document processing...');
    
    try {
      const testRule = PRA_RULES[0]; // Use first rule for testing
      
      const { data: regulation } = await supabase
        .from('regulations')
        .select('id')
        .eq('short_code', 'PRA-LIQ-TEST')
        .single();

      if (!regulation) {
        throw new Error('PRA regulation not found');
      }

      const result = await processRule(testRule, regulation.id, 'test');
      
      if (result.processing_type === 'synchronous') {
        setMessage(`✅ Test Complete: ${result.chunks_processed} chunks processed synchronously`);
      } else {
        setMessage(`🔄 Test Queued: Job ${result.job_id} processing ${result.total_chunks} chunks asynchronously`);
      }
      
      await refreshProcessingJobs();
      
    } catch (error: any) {
      console.error('Test error:', error);
      setMessage(`❌ Test Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function getStatusEmoji(status: string) {
    switch (status) {
      case 'COMPLETED': return '✅';
      case 'FAILED': return '❌';
      case 'IN_PROGRESS': return '🔄';
      case 'STARTED': return '🚀';
      default: return '⏳';
    }
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          PRA Collection + GPT-5 Mini Analysis
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Comprehensive collection and AI analysis of PRA regulatory documents. 
          Small documents process immediately, large documents queue for background processing.
        </p>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-blue-800">Total Rules</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
          <div className="text-sm text-green-800">Processed</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-sm text-red-800">Failed</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{processingJobs.filter(j => j.status === 'STARTED' || j.status === 'IN_PROGRESS').length}</div>
          <div className="text-sm text-gray-800">Active Jobs</div>
        </div>
      </div>

      {/* Processing Jobs Status */}
      {processingJobs.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Processing Jobs Status</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {processingJobs.map((job) => (
              <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {getStatusEmoji(job.status)} Job {job.id.slice(0, 8)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDuration(job.duration_seconds)}
                  </span>
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{job.processed_chunks}/{job.total_chunks} chunks</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        job.status === 'COMPLETED' ? 'bg-green-500' : 
                        job.status === 'FAILED' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${job.progress_percentage}%` }}
                    />
                  </div>
                </div>

                {job.error_message && (
                  <div className="text-sm text-red-600 mt-2">
                    Error: {job.error_message}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  Started: {new Date(job.started_at).toLocaleString()}
                  {job.completed_at && (
                    <> • Completed: {new Date(job.completed_at).toLocaleString()}</>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Message */}
      {message && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
          <div className="text-sm font-mono text-gray-700">
            {message}
          </div>
        </div>
      )}

      {/* Collection Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">
          Collection Controls - Async Processing Ready
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Test Single Document */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="bg-yellow-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-xl">🧪</span>
              </div>
              <h3 className="font-bold text-yellow-900 text-lg">Test Single</h3>
            </div>
            <p className="text-sm text-yellow-700 mb-4 text-center">
              Test the processing pipeline with one PRA rule. Good for verifying the system before bulk processing.
            </p>
            <button
              onClick={testSingleDocument}
              disabled={loading}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? '🔄 Testing...' : '🧪 Test Single Document'}
            </button>
          </div>

          {/* Non-Insurance Rules */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-xl">🏦</span>
              </div>
              <h3 className="font-bold text-blue-900 text-lg">Non-Insurance Rules</h3>
            </div>
            <p className="text-sm text-blue-700 mb-4 text-center">
              Process {PRA_RULES.length} non-insurance PRA rules. Mix of sync/async processing based on document size.
            </p>
            <div className="text-center text-xs text-blue-600 mb-4">
              📊 {PRA_RULES.length} rules • 🤖 GPT-5 Mini analysis • ⏱️ 15-25 mins
            </div>
            <button
              onClick={() => startCollection('non_insurance')}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? '🔄 Processing...' : '🚀 Process Non-Insurance Rules'}
            </button>
          </div>

          {/* Insurance Rules */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-white text-xl">🛡️</span>
              </div>
              <h3 className="font-bold text-green-900 text-lg">Insurance Rules</h3>
            </div>
            <p className="text-sm text-green-700 mb-4 text-center">
              Process {PRA_INSURANCE_RULES.length} insurance-specific PRA rules with specialized analysis.
            </p>
            <div className="text-center text-xs text-green-600 mb-4">
              📊 {PRA_INSURANCE_RULES.length} rules • 🤖 Insurance focus • ⏱️ 10-15 mins
            </div>
            <button
              onClick={() => startCollection('insurance')}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? '🔄 Processing...' : '🛡️ Process Insurance Rules'}
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
              Full collection of all {PRA_RULES.length + PRA_INSURANCE_RULES.length} PRA rules with comprehensive analysis.
            </p>
            <div className="text-center text-xs text-purple-600 mb-4">
              📊 {PRA_RULES.length + PRA_INSURANCE_RULES.length} total rules • 🤖 Complete analysis • ⏱️ 30-40 mins
            </div>
            <button
              onClick={() => startCollection('complete')}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? '🔄 Processing...' : '🎯 Complete Collection'}
            </button>
          </div>
        </div>
      </div>

      {/* Data Quality Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Enhanced Processing Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2">🤖 GPT-5 Mini Analysis Extracts:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Mathematical formulas and calculations</li>
              <li>• Cross-reference resolution (272K context)</li>
              <li>• Stress testing methodologies</li>
              <li>• Quantitative thresholds and ratios</li>
              <li>• Regulatory obligations and timelines</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">⚡ Async Processing Benefits:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• No 30-second timeout limits</li>
              <li>• Real-time progress tracking</li>
              <li>• Background processing for large docs</li>
              <li>• Immediate processing for small docs</li>
              <li>• Error isolation and recovery</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
