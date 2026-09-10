const q=s=>document.querySelector(s), qa=s=>document.querySelectorAll(s);

// Navigation
const toggle=q('.nav-toggle'), nav=q('#nav-links');
toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))});
qa('#nav-links a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));

// Custom cursor
const dot=q('.cursor-dot'), ring=q('.cursor-ring');
window.addEventListener('mousemove',e=>{
  if(!dot)return;
  dot.style.left=e.clientX+'px'; dot.style.top=e.clientY+'px';
  requestAnimationFrame(()=>{ring.style.left=e.clientX+'px';ring.style.top=e.clientY+'px'});
});
qa('a,button,.focus-grid article').forEach(el=>{
  el.addEventListener('mouseenter',()=>document.body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave',()=>document.body.classList.remove('cursor-hover'));
});

// Cinematic entrance parallax
const intro=q('#cinematic-intro'), heroImage=q('.hero-image');
window.addEventListener('scroll',()=>{
  const y=window.scrollY;
  if(intro && y<window.innerHeight*1.15){
    const p=Math.min(1,y/window.innerHeight);
    q('.intro-center').style.transform=`translateY(${p*45}px)`;
    q('.intro-glow').style.transform=`translate(${p*-25}px,${p*30}px) scale(${1+p*.035})`;
  }
  if(heroImage){
    const r=q('.space-hero').getBoundingClientRect();
    if(r.top<innerHeight && r.bottom>0) heroImage.style.backgroundPosition=`center ${50+(r.top/innerHeight)*3}%`;
  }
},{passive:true});

// London clock + market status
const londonClock=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
const londonDate=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',day:'numeric',month:'short',year:'numeric'});
function updateClocks(){
  const now=new Date();
  q('#live-clock').textContent=londonClock.format(now);
  q('#live-date').textContent=londonDate.format(now);
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(now);
  const day=parts.find(x=>x.type==='weekday')?.value;
  const h=Number(parts.find(x=>x.type==='hour')?.value),m=Number(parts.find(x=>x.type==='minute')?.value),mins=h*60+m;
  const open=!['Sat','Sun'].includes(day)&&mins>=570&&mins<960;
  q('#market-status').textContent=open?'US MARKET OPEN':'US MARKET CLOSED';
  q('#market-note').textContent=open?'Regular session':'Outside regular session';
  q('#hub-us-status').textContent=open?'OPEN':'CLOSED';
  q('#hub-us-time').textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} NY`;
}
updateClocks(); setInterval(updateClocks,1000);

// Crypto pricing
let latestCrypto=null;
const gbp=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(n);
const change=n=>`${n>=0?'+':''}${n.toFixed(2)}%`;
async function updateCrypto(){
  try{
    const res=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=gbp&include_24hr_change=true',{cache:'no-store'});
    if(!res.ok)throw new Error();
    latestCrypto=await res.json();
    const b=latestCrypto.bitcoin,e=latestCrypto.ethereum;
    q('#btc-price').textContent=gbp(b.gbp); q('#btc-change').textContent=change(b.gbp_24h_change);
    q('#eth-price').textContent=gbp(e.gbp); q('#eth-change').textContent=change(e.gbp_24h_change);
    q('#hub-btc').textContent=gbp(b.gbp); q('#hub-btc-change').textContent=change(b.gbp_24h_change);
    q('#hub-eth').textContent=gbp(e.gbp); q('#hub-eth-change').textContent=change(e.gbp_24h_change);
  }catch(e){
    if(!latestCrypto){q('#btc-price').textContent='Unavailable';q('#eth-price').textContent='Unavailable'}
  }
}
updateCrypto(); setInterval(updateCrypto,60000);

// Tech pulse
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
async function loadTech(){
  const feed=q('#tech-feed');
  try{
    const ids=await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r=>r.json());
    const stories=await Promise.all(ids.slice(0,5).map(id=>fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r=>r.json())));
    feed.innerHTML=stories.filter(s=>s?.title).map((s,i)=>{
      const url=s.url||`https://news.ycombinator.com/item?id=${s.id}`;
      let host='news.ycombinator.com'; try{if(s.url)host=new URL(s.url).hostname.replace(/^www\./,'')}catch{}
      return `<article class="news-item"><span>0${i+1}</span><div><a href="${esc(url)}" target="_blank" rel="noopener">${esc(s.title)}</a><span class="news-meta">${esc(host)} · ${s.score||0} points</span></div></article>`;
    }).join('');
  }catch{feed.innerHTML='<p class="loading">Technology feed temporarily unavailable.</p>'}
}
loadTech(); setInterval(loadTech,300000);

// GitHub public activity
const GITHUB_USERNAME='slime786';
const eventLabels={PushEvent:'PUSHED CODE',CreateEvent:'CREATED',IssuesEvent:'ISSUE ACTIVITY',PullRequestEvent:'PULL REQUEST',WatchEvent:'STARRED REPOSITORY',ForkEvent:'FORKED REPOSITORY'};
async function loadGitHub(){
  const feed=q('#github-feed'),status=q('#github-status');
  try{
    const res=await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/events/public`,{headers:{Accept:'application/vnd.github+json'}});
    if(!res.ok)throw new Error();
    const events=await res.json(), useful=events.filter(e=>eventLabels[e.type]).slice(0,6);
    status.textContent='Recent public activity from @slime786, refreshed automatically.';
    feed.innerHTML=useful.map(e=>`<div class="gh-event"><i>GH</i><span><b>${eventLabels[e.type]}</b><small>${esc(e.repo?.name||'GitHub')}</small></span><time>${new Date(e.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</time></div>`).join('')||'<p class="loading">No recent public activity found.</p>';
  }catch{status.textContent='GitHub activity is temporarily unavailable.';feed.innerHTML='<p class="loading">Open @slime786 on GitHub for the latest activity.</p>'}
}
loadGitHub(); setInterval(loadGitHub,600000);

// Rocket game: steering, boost, lives, scoring, energy collectibles
(()=>{
  const game=q('#rocket-game'),rocket=q('#rocket'),objects=q('#game-objects'),msg=q('#game-message');
  const scoreEl=q('#rocket-score'),bestEl=q('#rocket-best'),livesEl=q('#rocket-lives'),energyFill=q('#energy-fill');
  const statBest=q('#stat-best'),statLast=q('#stat-last');
  const starts=[q('#start-game'),q('#start-game-top')];
  if(!game)return;

  let running=false,x=.5,score=0,speed=3.1,last=0,spawnTimer=0,coreTimer=0,lives=3,energy=100,keys={},invincible=0;
  let best=Number(localStorage.getItem('mm-cosmic-best')||0);
  bestEl.textContent=statBest.textContent=String(best).padStart(4,'0');

  function reset(){
    running=true;x=.5;score=0;speed=3.1;spawnTimer=0;coreTimer=0;lives=3;energy=100;invincible=0;objects.innerHTML='';
    scoreEl.textContent='0000';livesEl.textContent='♥ ♥ ♥';energyFill.style.width='100%';msg.style.display='none';last=performance.now();game.focus();requestAnimationFrame(loop);
  }
  function finish(){
    running=false;
    const final=Math.floor(score);statLast.textContent=String(final).padStart(4,'0');
    best=Math.max(best,final);localStorage.setItem('mm-cosmic-best',best);bestEl.textContent=statBest.textContent=String(best).padStart(4,'0');
    msg.querySelector('.micro').textContent='MISSION COMPLETE';msg.querySelector('h3').innerHTML='FLIGHT<br>ENDED';msg.querySelector('span').textContent=`SCORE ${final} · BEST ${best}`;q('#start-game').innerHTML='LAUNCH AGAIN <b>→</b>';msg.style.display='flex';
  }
  function spawnMeteor(){
    const m=document.createElement('i');m.className='meteor';const z=25+Math.random()*44;m.style.width=z+'px';m.style.height=z+'px';m.style.left=(3+Math.random()*92)+'%';m.style.top='-70px';m.dataset.kind='meteor';objects.appendChild(m);
  }
  function spawnCore(){
    const c=document.createElement('i');c.className='energy-core';c.style.left=(8+Math.random()*84)+'%';c.style.top='-30px';c.dataset.kind='core';objects.appendChild(c);
  }
  function collision(a,b,pad=4){const A=a.getBoundingClientRect(),B=b.getBoundingClientRect();return !(A.right<B.left+pad||A.left>B.right-pad||A.bottom<B.top+pad||A.top>B.bottom-pad)}
  function damage(){
    if(invincible>0)return;lives--;invincible=1200;rocket.style.opacity='.35';livesEl.textContent=Array(lives).fill('♥').join(' ');
    setTimeout(()=>rocket.style.opacity='1',350);if(lives<=0)finish();
  }
  function loop(now){
    if(!running)return;
    const dt=Math.min(32,now-last);last=now;if(invincible>0)invincible-=dt;
    const move=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0), boosting=!!(keys.Space||keys.ArrowUp);
    x=Math.max(.035,Math.min(.965,x+move*dt*.00145*(boosting?1.45:1)));rocket.style.left=(x*100)+'%';rocket.style.transform=`translateX(-50%) rotate(${move*8}deg) scale(${boosting?1.04:1})`;
    energy=Math.max(0,Math.min(100,energy+(boosting?-dt*.016:dt*.009)));energyFill.style.width=energy+'%';
    const boost=boosting&&energy>1?1.45:1;
    spawnTimer+=dt;coreTimer+=dt;if(spawnTimer>Math.max(350,880-speed*64)){spawnMeteor();spawnTimer=0}if(coreTimer>3500+Math.random()*2300){spawnCore();coreTimer=0}
    [...objects.children].forEach(o=>{
      const top=parseFloat(o.style.top||'-50'),mult=o.dataset.kind==='core'?.72:1;o.style.top=(top+speed*dt*.07*boost*mult)+'px';
      if(collision(rocket,o,o.dataset.kind==='core'?0:7)){
        if(o.dataset.kind==='core'){score+=75;energy=Math.min(100,energy+35);o.remove()}else{damage();o.remove()}
      }else if(top>620){if(o.dataset.kind==='meteor')score+=12;o.remove()}
    });
    score+=dt*.009*boost;speed=Math.min(8.6,speed+dt*.00011);scoreEl.textContent=String(Math.floor(score)).padStart(4,'0');requestAnimationFrame(loop);
  }
  window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','Space'].includes(e.code)){e.preventDefault();keys[e.code]=true}if(e.code==='Space'&&!running)reset()});
  window.addEventListener('keyup',e=>keys[e.code]=false);
  qa('.game-controls button').forEach(b=>{const key=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();keys[key]=true;if(!running)reset()});b.addEventListener('pointerup',()=>keys[key]=false);b.addEventListener('pointerleave',()=>keys[key]=false)});
  starts.forEach(b=>b?.addEventListener('click',reset));
})();

// Easter egg
q('#easter-trigger')?.addEventListener('click',()=>{
  const modal=document.createElement('div');modal.className='easter-modal';modal.innerHTML='<div class="easter-box"><p class="micro">TRANSMISSION RECEIVED</p><h3>STAY <span>CURIOUS.</span></h3><p>You found the hidden signal. Keep exploring — the interesting things are usually just beyond the obvious.</p><button>RETURN TO ORBIT ↗</button></div>';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal||e.target.tagName==='BUTTON')modal.remove()});
});

// Reveal animation
const reveal=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});reveal.unobserve(e.target)}}),{threshold:.08});
qa('.focus-grid article,.terminal-card,.github-terminal,.about-metrics div').forEach(el=>{el.style.opacity='0';reveal.observe(el)});
