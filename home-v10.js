
(()=>{
  const $=s=>document.querySelector(s);
  const safe=(fn)=>{try{return fn()}catch{return null}};
  const cache={
    get(k){return safe(()=>JSON.parse(localStorage.getItem('mm-v10-'+k)||'null'))},
    set(k,v){safe(()=>localStorage.setItem('mm-v10-'+k,JSON.stringify({v,t:Date.now()})))}
  };
  const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  const fmtGBP=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:n>100?0:2}).format(n);
  const age=t=>{const s=Math.max(0,Math.floor((Date.now()-t)/1000));if(s<60)return s+'s ago';const m=Math.floor(s/60);if(m<60)return m+'m ago';return Math.floor(m/60)+'h ago'};
  let synced=[];

  function network(){
    const on=navigator.onLine;
    set('#network-label',on?'LIVE':'OFFLINE');
    const d=$('#network-dot'); if(d)d.style.background=on?'#53e39e':'#ff7f91';
  }
  network(); addEventListener('online',network); addEventListener('offline',network);

  function clock(){
    set('#v10-clock',new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()));
  }
  clock(); setInterval(clock,1000);

  function applyMarket(d){
    if(!d?.bitcoin||!d?.ethereum)return;
    set('#v10-btc',fmtGBP(d.bitcoin.gbp)); set('#v10-eth',fmtGBP(d.ethereum.gbp));
    [['#v10-btc-change',d.bitcoin.gbp_24h_change],['#v10-eth-change',d.ethereum.gbp_24h_change]].forEach(([id,n])=>{
      const e=$(id); if(!e||!Number.isFinite(n))return; e.textContent=(n>=0?'+':'')+n.toFixed(2)+'%';e.classList.toggle('up',n>=0);e.classList.toggle('down',n<0);
    });
  }
  async function markets(){
    const c=cache.get('market'); if(c){applyMarket(c.v)}
    try{
      const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=gbp&include_24hr_change=true',{cache:'no-store'});
      if(!r.ok)throw 0;const d=await r.json();applyMarket(d);cache.set('market',d);synced.push('markets');syncStamp();
    }catch(e){}
  }

  function applySignal(s){
    if(!s)return;set('#v10-signal-title',s.title||'Technology signal unavailable');set('#v10-signal-source',(s.source||'TECH SIGNAL').toUpperCase());
    const a=$('#v10-signal-link');if(a)a.href=s.url||'https://news.ycombinator.com/';
  }
  async function signal(){
    const c=cache.get('signal');if(c)applySignal(c.v);
    try{
      const ids=await fetch('https://hacker-news.firebaseio.com/v0/topstories.json',{cache:'no-store'}).then(r=>r.json());
      const items=await Promise.all(ids.slice(0,18).map(id=>fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`,{cache:'no-store'}).then(r=>r.json())));
      const best=items.filter(x=>x&&x.title).sort((a,b)=>((b.score||0)+(b.descendants||0)*1.2)-((a.score||0)+(a.descendants||0)*1.2))[0];
      if(best){let source='news.ycombinator.com';safe(()=>{if(best.url)source=new URL(best.url).hostname.replace(/^www\./,'')});const s={title:best.title,url:best.url||`https://news.ycombinator.com/item?id=${best.id}`,source};applySignal(s);cache.set('signal',s);synced.push('signal');syncStamp()}
    }catch(e){}
  }

  function applyGithub(e,t){
    if(!e)return;
    const type=(e.type||'Activity').replace('Event','').replace(/([a-z])([A-Z])/g,'$1 $2');
    set('#v10-github',type.toUpperCase());
    set('#v10-github-time',t?age(t):'@slime786');
    set('#v10-activity-title',githubDescription(e));
    set('#v10-activity-meta',t?`${type} · ${age(t)}`:`@slime786`);
  }
  function githubDescription(e){
    const repo=e?.repo?.name?.split('/').pop()||'GitHub';
    if(e.type==='PushEvent'){const n=e.payload?.size||e.payload?.commits?.length||1;return `${n} push${n===1?'':'es'} to ${repo}`;}
    if(e.type==='CreateEvent')return `Created ${e.payload?.ref_type||'activity'} in ${repo}`;
    if(e.type==='WatchEvent')return `Starred ${repo}`;
    if(e.type==='ForkEvent')return `Forked ${repo}`;
    return `${(e.type||'Activity').replace('Event','')} · ${repo}`;
  }
  async function github(){
    const c=cache.get('github');if(c)applyGithub(c.v.event,c.v.time);
    try{
      const r=await fetch('https://api.github.com/users/slime786/events/public?per_page=6',{headers:{Accept:'application/vnd.github+json'}});
      if(!r.ok)throw 0;const arr=await r.json();const e=arr[0];if(e){const t=new Date(e.created_at).getTime();applyGithub(e,t);cache.set('github',{event:e,time:t});synced.push('github');syncStamp()}
    }catch(e){}
  }

  async function siteIndex(){
    try{
      const d=await fetch('/slime786/data/site-index.json',{cache:'no-store'}).then(r=>r.json());
      const n=(d.pages||[]).filter(x=>x.kind==='article').length; if(n)set('#v10-note-count',String(n).padStart(2,'0'));
    }catch(e){}
  }

  function syncStamp(){
    set('#v10-sync','AUTO SYNC · '+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date()));
  }

  const hero=$('.v10-hero');
  if(hero&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();hero.style.setProperty('--mx',((e.clientX-r.left)/r.width-.5).toFixed(2));hero.style.setProperty('--my',((e.clientY-r.top)/r.height-.5).toFixed(2))});
  }

  const menu=$('#v10-menu'),mt=$('#v10-menu-toggle');
  mt?.addEventListener('click',()=>{const o=menu.classList.toggle('open');mt.setAttribute('aria-expanded',String(o));mt.textContent=o?'Close':'Menu'});
  menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');if(mt){mt.setAttribute('aria-expanded','false');mt.textContent='Menu'}}));

  const cmd=$('#v10-command'),trigger=$('#v10-command-trigger');
  const close=()=>{cmd?.classList.remove('open');cmd?.setAttribute('aria-hidden','true')};
  const open=()=>{cmd?.classList.add('open');cmd?.setAttribute('aria-hidden','false')};
  trigger?.addEventListener('click',open);document.querySelectorAll('[data-v10-close]').forEach(x=>x.addEventListener('click',close));
  addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()}if(e.key==='Escape')close()});

  markets();signal();github();siteIndex();
  setInterval(markets,60000); setInterval(signal,300000); setInterval(github,180000);
})();
