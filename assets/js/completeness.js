import { loadDiscover } from './sra-utils.js';
async function loadSteps(){ const r=await fetch('../assets/data/platform-steps.json'); return await r.json(); }
function percent(a,b){ return b? Math.round(a/b*100):0 }
function renderCard(host, title, pct){
  const card=document.createElement('div'); card.className='card';
  const h=document.createElement('h3'); h.textContent=title; const bar=document.createElement('div'); bar.className='bar'; const i=document.createElement('i'); i.style.width=pct+'%'; bar.appendChild(i);
  const p=document.createElement('p'); p.textContent=pct+'%'; card.append(h,bar,p); host.appendChild(card);
}
(async function(){
  const host=document.getElementById('report'); const data=await loadSteps(); const sess=loadDiscover();
  if(!sess.platform){ renderCard(host,'No active session',0); return; }
  const plat=sess.platform; const map=data[plat]; if(!map){ renderCard(host,plat+': no template',0); return; }
  const categories=Object.entries(map);
  const totalSteps=categories.reduce((n,[,arr])=> n+arr.length,0);
  const done=(sess.steps||[]).filter(s=>s.done).length; renderCard(host, plat+': overall', percent(done,totalSteps));
  // category-wise: approximate by splitting steps by cat in state
  categories.forEach(([cat,arr])=>{
    const catCount=arr.length; const doneCat=(sess.steps||[]).filter(s=>s.cat===cat && s.done).length; renderCard(host, cat, percent(doneCat,catCount));
  });
})();
