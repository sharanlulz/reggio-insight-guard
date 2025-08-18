import { useState, useEffect } from 'react';

export default function RegulatoryIntelligence() {
  const [selectedRegulation, setSelectedRegulation] = useState(null);
  const [analysisResults, setAnalysisResults] = useState([]);

  // Mock data for regulatory changes and their financial impact
  const mockRegulatoryChanges = [
    {
      id: '1',
      title: 'PRA Policy Statement PS15/25: LCR Requirements Update',
      source: 'PRA',
      jurisdiction: 'UK',
      publishDate: '2025-08-15',
      status: 'Active',
      priority: 'High',
      summary: 'Updates to Liquidity Coverage Ratio requirements for UK banks',
      financialImpact: {
        estimatedCost: '£45,000,000',
        affectedRatios: ['LCR', 'NSFR'],
        complianceDeadline: '2025-12-31',
        confidence: 85
      },
      aiAnalysis: {
        keyChanges: [
          'LCR minimum increased from 100% to 105%',
          'Enhanced reporting requirements for HQLA composition',
          'New stress scenario parameters'
        ],
        recommendations: [
          'Increase HQLA portfolio by £50M',
          'Review funding strategy for retail deposits',
          'Update internal stress testing models'
        ],
        implementationSteps: [
          'Immediate: Review current LCR position',
          'Month 1: Identify HQLA gap and funding sources', 
          'Month 2: Execute portfolio rebalancing',
          'Month 3: Update reporting systems'
        ]
      }
    },
    {
      id: '2',
      title: 'ECB Guide on Operational Resilience',
      source: 'ECB',
      jurisdiction: 'EU',
      publishDate: '2025-08-12',
      status: 'Consultation',
      priority: 'Medium',
      summary: 'New guidance on operational resilience framework for EU banks',
      financialImpact: {
        estimatedCost: '£12,500,000',
        affectedRatios: ['Operational Risk Capital'],
        complianceDeadline: '2026-06-30',
        confidence: 70
      },
      aiAnalysis: {
        keyChanges: [
          'Enhanced business continuity requirements',
          'New operational risk assessment framework',
          'Increased outsourcing oversight'
        ],
        recommendations: [
          'Establish dedicated operational resilience team',
          'Review third-party dependencies',
          'Enhance business continuity testing'
        ],
        implementationSteps: [
          'Immediate: Gap analysis of current framework',
          'Month 1: Design enhanced operational resilience framework',
          'Month 3: Implement new processes and controls',
          'Month 6: Complete staff training and testing'
        ]
      }
    },
    {
      id: '3',
      title: 'EBA Guidelines on SREP Methodology',
      source: 'EBA',
      jurisdiction: 'EU',
      publishDate: '2025-08-10',
      status: 'Active',
      priority: 'High',
      summary: 'Updated Supervisory Review and Evaluation Process methodology',
      financialImpact: {
        estimatedCost: '£25,000,000',
        affectedRatios: ['Tier 1 Capital', 'Total Capital'],
        complianceDeadline: '2025-11-30',
        confidence: 90
      },
      aiAnalysis: {
        keyChanges: [
          'Enhanced capital planning requirements',
          'New stress testing scenarios',
          'Updated governance expectations'
        ],
        recommendations: [
          'Strengthen capital planning process',
          'Enhance risk appetite framework',
          'Update ICAAP documentation'
        ],
        implementationSteps: [
          'Immediate: Review current ICAAP against new requirements',
          'Month 1: Update capital planning models',
          'Month 2: Enhance governance framework',
          'Month 3: Submit updated ICAAP to supervisor'
        ]
      }
    }
  ];

  const mockAnalysisQueue = [
    { regulation: 'FCA Consultation CP25/15', status: 'Processing', priority: 'High' },
    { regulation: 'BoE Discussion Paper DP3/25', status: 'Pending', priority: 'Medium' },
    { regulation: 'EBA Report on NPLs', status: 'Completed', priority: 'Low' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧠 Regulatory Intelligence Center
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered regulatory change analysis with financial impact assessment
          </p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Regulations Analyzed</p>
                <p className="text-2xl font-bold text-gray-900">247</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <span className="text-2xl">🚨</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">12</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Impact (Est.)</p>
                <p className="text-2xl font-bold text-yellow-600">£125M</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <span className="text-2xl">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Auto-Analysis Queue</p>
                <p className="text-2xl font-bold text-green-600">{mockAnalysisQueue.filter(a => a.status === 'Pending').length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Regulatory Changes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  📋 Recent Regulatory Changes
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {mockRegulatoryChanges.map((reg) => (
                    <div
                      key={reg.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedRegulation?.id === reg.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedRegulation(reg)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              reg.priority === 'High' ? 'bg-red-100 text-red-800' :
                              reg.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {reg.priority}
                            </span>
                            <span className="text-sm text-gray-500">{reg.source}</span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">{reg.jurisdiction}</span>
                          </div>
                          <h3 className="font-medium text-gray-900 mb-1">{reg.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{reg.summary}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-500">Published: {reg.publishDate}</span>
                            <span className="text-red-600 font-medium">Impact: {reg.financialImpact.estimatedCost}</span>
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${
                          reg.status === 'Active' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Queue & Actions */}
          <div className="space-y-6">
            {/* AI Analysis Queue */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  🤖 AI Analysis Queue
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {mockAnalysisQueue.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.regulation}</p>
                        <p className={`text-xs ${
                          item.status === 'Processing' ? 'text-blue-600' :
                          item.status === 'Pending' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {item.status}
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        item.status === 'Processing' ? 'bg-blue-500 animate-pulse' :
                        item.status === 'Pending' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  ⚡ Quick Actions
                </h2>
              </div>
              <div className="p-6 space-y-3">
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  Generate Executive Report
                </button>
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                  Export Financial Impact Summary
                </button>
                <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                  Schedule Board Briefing
                </button>
                <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm">
                  Connect to Portfolio Model
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analysis Panel */}
        {selectedRegulation && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                📊 Detailed Analysis: {selectedRegulation.title}
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Financial Impact */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">💰 Financial Impact Assessment</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600">Estimated Implementation Cost</p>
                      <p className="text-2xl font-bold text-red-600">{selectedRegulation.financialImpact.estimatedCost}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Affected Ratios:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedRegulation.financialImpact.affectedRatios.map((ratio, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            {ratio}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Compliance Deadline:</p>
                      <p className="text-lg font-semibold text-orange-600">{selectedRegulation.financialImpact.complianceDeadline}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">AI Confidence Level:</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${selectedRegulation.financialImpact.confidence}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600">{selectedRegulation.financialImpact.confidence}%</p>
                    </div>
                  </div>
                </div>

                {/* AI Analysis & Recommendations */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">🧠 AI Analysis & Recommendations</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Key Changes Identified:</h4>
                      <ul className="space-y-1">
                        {selectedRegulation.aiAnalysis.keyChanges.map((change, index) => (
                          <li key={index} className="text-sm text-gray-600">• {change}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Strategic Recommendations:</h4>
                      <ul className="space-y-1">
                        {selectedRegulation.aiAnalysis.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600">✓ {rec}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Implementation Timeline:</h4>
                      <ul className="space-y-1">
                        {selectedRegulation.aiAnalysis.implementationSteps.map((step, index) => (
                          <li key={index} className="text-sm text-gray-600">
                            <span className="font-medium">{index + 1}.</span> {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
