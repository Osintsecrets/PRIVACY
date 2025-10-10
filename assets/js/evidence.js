export const EKEY_PREFIX = 'sra_evidence_'; // per step: sra_evidence_{stepIndex}
export function loadEvidence(idx){ try{ return JSON.parse(localStorage.getItem(EKEY_PREFIX+idx)||'[]'); }catch(e){ return [] } }
export function saveEvidence(idx, items){ localStorage.setItem(EKEY_PREFIX+idx, JSON.stringify(items||[])); }
