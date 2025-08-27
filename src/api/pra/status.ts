import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple response for testing
    const stats = {
      totalRegulations: 0,
      totalDocuments: 0,
      totalClauses: 0,
      rulebookSections: 0,
      supervisoryStatements: 0,
      lastUpdated: new Date(),
      aiAnalysisComplete: 0,
      trainingDataReady: false
    };

    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
