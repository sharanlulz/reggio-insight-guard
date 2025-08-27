import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: regulations } = await supabase
      .from('regulations')
      .select(`
        *,
        regulation_documents(*),
        clauses(*)
      `)
      .eq('regulator', 'PRA');

    const trainingData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalRegulations: regulations?.length || 0,
        dataSource: 'PRA Complete Collection',
        version: '1.0'
      },
      regulations: regulations?.map(reg => ({
        id: reg.id,
        title: reg.title,
        shortCode: reg.short_code,
        praReference: reg.pra_reference,
        praCategory: reg.pra_category,
        publicationDate: reg.publication_date,
        documentCount: reg.regulation_documents?.length || 0,
        clauseCount: reg.clauses?.length || 0
      })) || []
    };

    const jsonString = JSON.stringify(trainingData, null, 2);
    
    return new Response(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="pra-training-data-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
