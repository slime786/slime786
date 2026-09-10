const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#nav-links');

toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});

document.querySelectorAll('#nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.08 });

document.querySelectorAll('.project-card, .interest-list > div, .focus-grid > div').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(18px)';
  el.style.transition = 'opacity .7s ease, transform .7s ease';
  observer.observe(el);
});

document.addEventListener('scroll', () => {
  document.querySelectorAll('.visible').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}, { passive: true });

// Theme cursor
const cursorDot = document.createElement('div');
const cursorRing = document.createElement('div');
cursorDot.className = 'cursor-dot';
cursorRing.className = 'cursor-ring';
document.body.append(cursorDot, cursorRing);

window.addEventListener('mousemove', (e) => {
  cursorDot.style.left = `${e.clientX}px`;
  cursorDot.style.top = `${e.clientY}px`;
  requestAnimationFrame(() => {
    cursorRing.style.left = `${e.clientX}px`;
    cursorRing.style.top = `${e.clientY}px`;
  });
});
document.querySelectorAll('a,button,.project-card,.interest-list>div').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

// Live London clock
const clockEl = document.getElementById('live-clock');
const dateEl = document.getElementById('live-date');
const londonFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
});
const londonDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});
function updateClock(){
  const now = new Date();
  if(clockEl) clockEl.textContent = londonFormatter.format(now);
  if(dateEl) dateEl.textContent = londonDateFormatter.format(now);
}
updateClock();
setInterval(updateClock, 1000);

// US market status from London time. This is an indicative clock, not an exchange feed.
function updateMarketStatus(){
  const status = document.getElementById('market-status');
  const note = document.getElementById('market-note');
  if(!status) return;
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US',{
    timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false
  }).formatToParts(now);
  const day = parts.find(p=>p.type==='weekday')?.value;
  const hour = Number(parts.find(p=>p.type==='hour')?.value);
  const minute = Number(parts.find(p=>p.type==='minute')?.value);
  const mins = hour * 60 + minute;
  const weekday = !['Sat','Sun'].includes(day);
  const open = weekday && mins >= 570 && mins < 960;
  status.textContent = open ? 'OPEN' : 'CLOSED';
  note.textContent = open ? 'Regular US session · New York time' : 'Outside regular US session · New York time';
}
updateMarketStatus();
setInterval(updateMarketStatus, 30000);

// Crypto prices from CoinGecko. If the provider is unavailable, the UI keeps its last good state.
let lastCrypto = null;
async function updateCrypto(){
  try{
    const url='https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=gbp&include_24hr_change=true&include_last_updated_at=true';
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error('API unavailable');
    const data=await res.json();
    lastCrypto=data;
    const formatGBP = n => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(n);
    document.getElementById('btc-price').textContent=formatGBP(data.bitcoin.gbp);
    document.getElementById('eth-price').textContent=formatGBP(data.ethereum.gbp);
    const formatChange = n => `${n >= 0 ? '+' : ''}${n.toFixed(2)}% · 24h`;
    const btcChange=document.getElementById('btc-change');
    const ethChange=document.getElementById('eth-change');
    btcChange.textContent=formatChange(data.bitcoin.gbp_24h_change);
    ethChange.textContent=formatChange(data.ethereum.gbp_24h_change);
    btcChange.style.color=data.bitcoin.gbp_24h_change>=0?'#5d8222':'#9b4b45';
    ethChange.style.color=data.ethereum.gbp_24h_change>=0?'#5d8222':'#9b4b45';
    document.getElementById('last-refresh').textContent=new Date().toLocaleTimeString('en-GB');
  }catch(e){
    if(!lastCrypto){
      document.getElementById('btc-price').textContent='Unavailable';
      document.getElementById('eth-price').textContent='Unavailable';
      document.getElementById('btc-change').textContent='Live provider unavailable';
      document.getElementById('eth-change').textContent='Try again later';
    }
  }
}
updateCrypto();
setInterval(updateCrypto, 60000);

// Rocket game
(() => {
  const game=document.getElementById('rocket-game');
  const rocket=document.getElementById('rocket');
  const scoreEl=document.getElementById('rocket-score');
  const bestEl=document.getElementById('rocket-best');
  const message=document.getElementById('game-message');
  const start=document.getElementById('start-game');
  const obstacles=document.getElementById('game-obstacles');
  if(!game) return;

  let playing=false, score=0, x=.5, speed=3, spawnTimer=0, last=0, keys={};
  let best=Number(localStorage.getItem('mmRocketBest')||0);
  bestEl.textContent=String(best).padStart(4,'0');

  function reset(){
    playing=true; score=0; x=.5; speed=3; spawnTimer=0; last=performance.now();
    scoreEl.textContent='0000'; message.style.display='none'; obstacles.innerHTML='';
    requestAnimationFrame(loop);
    game.focus();
  }
  function end(){
    playing=false;
    best=Math.max(best,Math.floor(score));
    localStorage.setItem('mmRocketBest',best);
    bestEl.textContent=String(best).padStart(4,'0');
    message.querySelector('b').textContent='MISSION COMPLETE';
    message.querySelector('span').textContent=`Score ${Math.floor(score)} · Try to beat your best`;
    start.textContent='Launch again ↗';
    message.style.display='flex';
  }
  function spawn(){
    const m=document.createElement('i');
    m.className='meteor';
    const size=24+Math.random()*42;
    m.style.width=`${size}px`; m.style.height=`${size}px`;
    m.style.left=`${Math.random()*92+4}%`; m.style.top='-60px';
    obstacles.appendChild(m);
  }
  function collision(a,b){
    const r1=a.getBoundingClientRect(), r2=b.getBoundingClientRect();
    return !(r1.right<r2.left+5||r1.left>r2.right-5||r1.bottom<r2.top+5||r1.top>r2.bottom-5);
  }
  function loop(now){
    if(!playing) return;
    const dt=Math.min(32,now-last); last=now;
    const move=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0);
    x=Math.max(.035,Math.min(.965,x+move*dt*.0015*(keys.Space?1.8:1)));
    rocket.style.left=`${x*100}%`;
    rocket.style.transform=`translateX(-50%) rotate(${move*8}deg)`;
    if(keys.Space) rocket.style.bottom='82px'; else rocket.style.bottom='70px';

    spawnTimer+=dt;
    if(spawnTimer>Math.max(380,900-speed*70)){spawn();spawnTimer=0}
    obstacles.querySelectorAll('.meteor').forEach(m=>{
      const top=parseFloat(m.style.top||'-60');
      m.style.top=`${top+speed*dt*.07*(keys.Space?1.45:1)}px`;
      if(collision(rocket,m)){end()}
      if(top>560){m.remove();score+=10;scoreEl.textContent=String(Math.floor(score)).padStart(4,'0')}
    });
    score+=dt*.008; speed=Math.min(8,speed+dt*.00012);
    scoreEl.textContent=String(Math.floor(score)).padStart(4,'0');
    requestAnimationFrame(loop);
  }
  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(e.code)) e.preventDefault();
    if(e.code==='ArrowUp') keys.ArrowUp=true;
    if(e.code==='ArrowLeft') keys.ArrowLeft=true;
    if(e.code==='ArrowRight') keys.ArrowRight=true;
    if(e.code==='Space') keys.Space=true;
    if(e.code==='Space' && !playing) reset();
  });
  window.addEventListener('keyup',e=>{
    if(e.code==='ArrowUp') keys.ArrowUp=false;
    if(e.code==='ArrowLeft') keys.ArrowLeft=false;
    if(e.code==='ArrowRight') keys.ArrowRight=false;
    if(e.code==='Space') keys.Space=false;
  });
  document.querySelectorAll('.game-touch button').forEach(btn=>{
    const key=btn.dataset.key;
    const down=e=>{e.preventDefault();keys[key]=true;if(!playing)reset()};
    const up=e=>{e.preventDefault();keys[key]=false};
    btn.addEventListener('pointerdown',down); btn.addEventListener('pointerup',up); btn.addEventListener('pointerleave',up);
  });
  start.addEventListener('click',reset);
})();

// V3 LIVE HUB
const GITHUB_USERNAME='slime786';
const v3esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function v3sync(){let b=document.getElementById('btc-price'),e=document.getElementById('eth-price'),u=document.getElementById('market-status');if(b)document.getElementById('v3-btc').textContent=b.textContent;if(e)document.getElementById('v3-eth').textContent=e.textContent;if(u)document.getElementById('v3-us').textContent=u.textContent}v3sync();setInterval(v3sync,3000);
async function v3news(){let f=document.getElementById('v3-news');if(!f)return;try{let ids=await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r=>r.json()),ss=await Promise.all(ids.slice(0,5).map(id=>fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r=>r.json())));f.innerHTML=ss.filter(Boolean).map((s,i)=>`<div class="v3-story"><span>0${i+1}</span><a href="${v3esc(s.url||`https://news.ycombinator.com/item?id=${s.id}`)}" target="_blank" rel="noopener">${v3esc(s.title)}</a></div>`).join('')}catch(e){f.textContent='Technology feed temporarily unavailable.'}}v3news();setInterval(v3news,300000);
async function v3github(){if(GITHUB_USERNAME==='YOUR_GITHUB_USERNAME')return;let f=document.getElementById('v3-gh-feed'),s=document.getElementById('v3-gh-status');try{let es=await fetch(`https://api.github.com/users/${encodeURIComponent(GITHUB_USERNAME)}/events/public`).then(r=>{if(!r.ok)throw 0;return r.json()});s.textContent='Recent public GitHub activity, refreshed automatically.';f.innerHTML=es.slice(0,5).map(e=>`<div class="v3-gh-event"><b>${v3esc(e.type.replace('Event',''))}</b> · ${v3esc(e.repo?.name||'GitHub')}</div>`).join('')}catch(e){s.textContent='GitHub activity temporarily unavailable.'}}v3github();setInterval(v3github,600000);
document.getElementById('v3-egg')?.addEventListener('click',()=>{let m=document.createElement('div');m.className='v3-modal';m.innerHTML='<div class="v3-box"><h3>Stay curious.</h3><p>You found the hidden corner. There is always another idea worth exploring.</p><button>Back to exploring ↗</button></div>';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m||e.target.tagName==='BUTTON')m.remove()})});

// V4 cinematic scroll polish
window.addEventListener('scroll',()=>{
  document.body.classList.toggle('scrolled',window.scrollY>40);
},{passive:true});

const intro = document.getElementById('intro-screen');
if(intro){
  window.addEventListener('scroll',()=>{
    const progress=Math.min(1,window.scrollY/window.innerHeight);
    intro.style.opacity=String(1-progress*.75);
    intro.style.transform=`translateY(${progress*28}px)`;
  },{passive:true});
}

const revealObserver = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.animate([
        {opacity:0,transform:'translateY(30px)'},
        {opacity:1,transform:'translateY(0)'}
      ],{duration:700,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});
      revealObserver.unobserve(e.target);
    }
  });
},{threshold:.12});

document.querySelectorAll('.future-cards article,.colour-card').forEach(el=>{
  el.style.opacity='0';
  revealObserver.observe(el);
});
