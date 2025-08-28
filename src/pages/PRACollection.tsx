import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PRA_RULES, PRA_INSURANCE_RULES } from '@/data/pra-rules.generated.js';

export default function PRACollection() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1>Import Test</h1>
      <p>PRA Rules: {PRA_RULES?.length || 'failed'}</p>
      <p>Insurance Rules: {PRA_INSURANCE_RULES?.length || 'failed'}</p>
    </div>
  );
}
