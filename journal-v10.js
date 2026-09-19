
(()=>{
 const grid=document.getElementById('journal-grid'),input=document.getElementById('journal-search'),filters=[...document.querySelectorAll('[data-filter]')];
 let pages=[],filter='all';
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(){
   const q=(input.value||'').trim().toLowerCase();
   const list=pages.filter(p=>(filter==='all'||(p.category||'').toUpperCase().includes(filter))&&(!q||`${p.title} ${p.description} ${p.category}`.toLowerCase().includes(q)));
   grid.innerHTML=list.length?list.map(p=>`<article class="journal-card"><p>${esc(p.category||'NOTE')}</p><h2>${esc(p.title.replace(/ — Moheen Mahmood$/,''))}</h2><span>${esc(p.description||'')}</span><div><small>REVIEWED NOTE</small><a href="/slime786/${esc(p.file)}">READ NOTE ↗</a></div></article>`).join(''):`<p style="color:#718b9b">No matching notes.</p>`;
 }
 fetch('/slime786/data/site-index.json',{cache:'no-store'}).then(r=>r.json()).then(d=>{pages=(d.pages||[]).filter(p=>p.kind==='article');render()}).catch(()=>{grid.innerHTML='<p style="color:#718b9b">Journal index temporarily unavailable. Refresh to try again.</p>'});
 input.addEventListener('input',render);filters.forEach(b=>b.addEventListener('click',()=>{filters.forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render()}));
})();
