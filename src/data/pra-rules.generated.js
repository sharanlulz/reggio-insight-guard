// src/data/pra-rules.generated.js
// Exports two arrays with base URLs (no /dd-mm-yyyy suffix).
// Assumes the two JSON files below are present in the same folder.

import NON_INSURANCE from './pra-rules.non-insurance.json';
import INSURANCE_ONLY from './pra-rules.insurance-only.json';

// Helper: remove trailing /dd-mm-yyyy if present
const stripDate = (url) => url.replace(/\/\d{2}-\d{2}-\d{4}$/, '');

export const PRA_RULES = (NON_INSURANCE || []).map(({ name, url }) => ({
  name,
  url: stripDate(url),
}));

export const PRA_INSURANCE_RULES = (INSURANCE_ONLY || []).map(({ name, url }) => ({
  name,
  url: stripDate(url),
}));

export default { PRA_RULES, PRA_INSURANCE_RULES };
