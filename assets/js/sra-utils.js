// Shared state loader: pull recent Discover snapshot if present
export function loadDiscover(){ try{ return JSON.parse(localStorage.getItem('sra_discover_session'))||{} }catch(e){ return {} }
}
export function listDiscoverSessions(){ try{ return JSON.parse(localStorage.getItem('sra_discover_bank'))||[] }catch(e){ return [] }
}
export function pickSessionByName(name){ return (listDiscoverSessions().find(s=>s.name===name)||{}).state || null }

// Simple tag extract from notes
export function extractTags(notes){
  const tags = {}; Object.values(notes||{}).forEach(v=>{ (v||'').replace(/#([\w-]+)/g,(m,g)=>{tags[g]=(tags[g]||0)+1;});});
  return tags;
}

// Risk weight heuristics (shared)
export const RISK_WEIGHTS = { phone:3, address:4, email:2, message:2, photo:1, credentials:6, id:5 };
export function approximateRiskFromText(text){
  const t=(text||'').toLowerCase();
  let score=0; for(const [k,w] of Object.entries(RISK_WEIGHTS)){ if(t.includes(k)) score+=w; }
  return score;
}

// Download helper (md/json)
export function download(filename, text){ const blob=new Blob([text],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); }
