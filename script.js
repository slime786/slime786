const q=s=>document.querySelector(s),qa=s=>document.querySelectorAll(s);
const dot=q('.cursor-dot'),ring=q('.cursor-ring');window.addEventListener('mousemove',e=>{if(dot){dot.style.left=e.clientX+'px';dot.style.top=e.clientY+'px';ring.style.left=e.clientX+'px';ring.style.top=e.clientY+'px'}});qa('a,button').forEach(el=>{el.addEventListener('mouseenter',()=>document.body.classList.add('cursor-hover'));el.addEventListener('mouseleave',()=>document.body.classList.remove('cursor-hover'))});
function clocks(){const n=new Date();q('#clock').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(n);q('#date').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(n);const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(n),d=p.find(x=>x.type==='weekday').value,h=+p.find(x=>x.type==='hour').value,m=+p.find(x=>x.type==='minute').value;const open=!['Sat','Sun'].includes(d)&&h*60+m>=570&&h*60+m<960;q('#us-status').textContent=open?'OPEN':'CLOSED'}clocks();setInterval(clocks,1000);
const gbp=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(n),chg=n=>(n>=0?'+':'')+n.toFixed(2)+'% (24h)';
async function crypto(){try{const d=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=gbp&include_24hr_change=true',{cache:'no-store'}).then(r=>r.json());q('#btc').textContent=q('#btc2').textContent=gbp(d.bitcoin.gbp);q('#eth').textContent=q('#eth2').textContent=gbp(d.ethereum.gbp);q('#btc-change').textContent=chg(d.bitcoin.gbp_24h_change);q('#eth-change').textContent=chg(d.ethereum.gbp_24h_change)}catch{q('#btc').textContent='Unavailable';q('#eth').textContent='Unavailable'}}crypto();setInterval(crypto,60000);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
async function news(){const f=q('#news');try{const ids=await fetch('https://hacker-news.firebaseio.com/v0/topstories.json').then(r=>r.json()),ss=await Promise.all(ids.slice(0,5).map(id=>fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r=>r.json())));f.innerHTML=ss.filter(Boolean).map(s=>`<div class='news-item'><a href='${esc(s.url||`https://news.ycombinator.com/item?id=${s.id}`)}' target='_blank' rel='noopener'>${esc(s.title)}</a><small>${s.score||0} points</small></div>`).join('')}catch{f.textContent='Technology feed temporarily unavailable.'}}news();setInterval(news,300000);
(()=>{const g=q('#game-shell'),r=q('#rocket'),o=q('#objects'),m=q('#game-message'),scoreE=q('#score'),livesE=q('#lives'),bestE=q('#best'),lastE=q('#last');let run=false,x=.5,score=0,speed=3,last=0,spawn=0,lives=3,k={},best=+localStorage.getItem('mm-v5-best')||0;bestE.textContent=String(best).padStart(4,'0');function start(){run=true;x=.5;score=0;speed=3;spawn=0;lives=3;o.innerHTML='';scoreE.textContent='0000';livesE.textContent='♥ ♥ ♥';m.style.display='none';last=performance.now();requestAnimationFrame(loop)}function end(){run=false;lastE.textContent=String(Math.floor(score)).padStart(4,'0');best=Math.max(best,Math.floor(score));localStorage.setItem('mm-v5-best',best);bestE.textContent=String(best).padStart(4,'0');m.querySelector('h3').textContent='Mission complete';m.querySelector('p').textContent='Score '+Math.floor(score);m.style.display='flex'}function meteor(){const a=document.createElement('i'),z=26+Math.random()*45;a.className='meteor';a.style.width=z+'px';a.style.height=z+'px';a.style.left=(3+Math.random()*92)+'%';a.style.top='-70px';o.appendChild(a)}function hit(a,b){const A=a.getBoundingClientRect(),B=b.getBoundingClientRect();return !(A.right<B.left+6||A.left>B.right-6||A.bottom<B.top+6||A.top>B.bottom-6)}function loop(n){if(!run)return;const dt=Math.min(32,n-last);last=n;const mv=(k.ArrowRight?1:0)-(k.ArrowLeft?1:0),boost=k.Space?1.45:1;x=Math.max(.04,Math.min(.96,x+mv*dt*.0015*boost));r.style.left=x*100+'%';r.style.transform=`translateX(-50%) rotate(${mv*8}deg)`;spawn+=dt;if(spawn>Math.max(380,900-speed*65)){meteor();spawn=0}o.querySelectorAll('.meteor').forEach(a=>{const t=parseFloat(a.style.top);a.style.top=t+speed*dt*.07*boost+'px';if(hit(r,a)){a.remove();lives--;livesE.textContent=Array(lives).fill('♥').join(' ');if(lives<=0)end()}else if(t>590){a.remove();score+=10}});score+=dt*.008;speed=Math.min(8,speed+dt*.00012);scoreE.textContent=String(Math.floor(score)).padStart(4,'0');requestAnimationFrame(loop)}window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();k[e.code]=true;if(e.code==='Space'&&!run)start()});window.addEventListener('keyup',e=>k[e.code]=false);q('#launch').addEventListener('click',start)})();

// V6 watchlist sync
function syncV6Watchlist(){
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};
  set('watch-btc',document.getElementById('btc')?.textContent||'—');
  set('watch-btc-change',document.getElementById('btc-change')?.textContent||'—');
  set('watch-eth',document.getElementById('eth')?.textContent||'—');
  set('watch-eth-change',document.getElementById('eth-change')?.textContent||'—');
  set('watch-us',document.getElementById('us-status')?.textContent||'—');
  set('watch-time',document.getElementById('clock')?.textContent||'—');
}
syncV6Watchlist(); setInterval(syncV6Watchlist,2000);

// Active navigation highlight
const navLinks=[...document.querySelectorAll('.nav nav a[href^="#"]')];
const navSections=navLinks.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
const navObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      navLinks.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+entry.target.id));
    }
  });
},{rootMargin:'-35% 0px -55% 0px',threshold:0});
navSections.forEach(s=>navObserver.observe(s));

// V6 card reveal
const v6Reveal=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.animate(
        [{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],
        {duration:650,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'}
      );
      v6Reveal.unobserve(entry.target);
    }
  });
},{threshold:.08});
document.querySelectorAll('.now-grid article,.idea-card,.project-card,.timeline>div').forEach(el=>{
  el.style.opacity='0'; v6Reveal.observe(el);
});

// V7 Observatory reactions are local-only on this static GitHub Pages site.
document.querySelectorAll('.signal-votes').forEach(group=>{
  const poll=group.dataset.poll;
  group.querySelectorAll('button').forEach(btn=>{
    const choice=btn.dataset.choice,key=`mm-v7-poll-${poll}-${choice}`,selectedKey=`mm-v7-poll-selected-${poll}`;
    btn.querySelector('b').textContent=Number(localStorage.getItem(key)||0);
    if(localStorage.getItem(selectedKey)===choice) btn.classList.add('selected');
    btn.addEventListener('click',()=>{
      const prior=localStorage.getItem(selectedKey); if(prior===choice)return;
      if(prior){const pb=group.querySelector(`[data-choice="${prior}"]`);if(pb){const pk=`mm-v7-poll-${poll}-${prior}`,n=Math.max(0,Number(localStorage.getItem(pk)||0)-1);localStorage.setItem(pk,n);pb.querySelector('b').textContent=n;pb.classList.remove('selected')}}
      const n=Number(localStorage.getItem(key)||0)+1;localStorage.setItem(key,n);localStorage.setItem(selectedKey,choice);btn.querySelector('b').textContent=n;btn.classList.add('selected');
    });
  });
});
const cf=document.getElementById('contact-form');
if(cf)cf.addEventListener('submit',e=>{e.preventDefault();const n=document.getElementById('cf-name').value.trim(),em=document.getElementById('cf-email').value.trim(),s=document.getElementById('cf-subject').value.trim(),m=document.getElementById('cf-message').value.trim(),body=`Hi Moheen,\n\n${m}\n\nFrom: ${n}\nEmail: ${em}`;location.href=`mailto:moheenmahmood@hotmail.co.uk?subject=${encodeURIComponent(s)}&body=${encodeURIComponent(body)}`});

// V7.1 automatic weekly technology brief
function isoWeekInfo(date=new Date()){
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const day=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-day);
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const week=Math.ceil((((d-yearStart)/86400000)+1)/7);
  return {year:d.getUTCFullYear(),week};
}
async function weeklyBrief(){
  const ed=document.getElementById('weekly-edition'); if(!ed)return;
  const info=isoWeekInfo(), dateEl=document.getElementById('weekly-date');
  ed.textContent=`W${String(info.week).padStart(2,'0')} / ${info.year}`;
  dateEl.textContent=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date());
  try{
    const ids=await fetch('https://hacker-news.firebaseio.com/v0/topstories.json',{cache:'no-store'}).then(r=>r.json());
    const items=await Promise.all(ids.slice(0,24).map(id=>fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r=>r.json())));
    const tech=items.filter(x=>x&&x.title&&x.type==='story').slice(0,6);
    document.getElementById('weekly-title').textContent=`Six technology stories on the radar — Week ${info.week}`;
    document.getElementById('weekly-summary').textContent='A live weekly reading list for keeping the command centre current. New stories appear automatically as the source feed changes.';
    document.getElementById('weekly-stories').innerHTML=tech.map((s,i)=>{
      const u=s.url||`https://news.ycombinator.com/item?id=${s.id}`;
      const host=(()=>{try{return new URL(u).hostname.replace('www.','')}catch{return 'news.ycombinator.com'}})();
      const safe=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
      return `<div class="weekly-story"><span>0${i+1}</span><a href="${safe(u)}" target="_blank" rel="noopener">${safe(s.title)}</a><small>${safe(host)}</small></div>`;
    }).join('');
  }catch(e){
    document.getElementById('weekly-title').textContent='Weekly brief temporarily offline.';
    document.getElementById('weekly-summary').textContent='The live source could not be reached. My authored journal notes are still available below.';
  }
}
weeklyBrief();

// V8 Market Radar
(function(){
 const clock=document.getElementById('radar-clock');
 if(clock){
   const tick=()=>{const d=new Date();clock.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d);document.getElementById('radar-date').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(d).toUpperCase();
   const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d),o=Object.fromEntries(parts.map(p=>[p.type,p.value])),mins=Number(o.hour)*60+Number(o.minute),wd=!['Sat','Sun'].includes(o.weekday);document.getElementById('radar-london').textContent=wd&&mins>=480&&mins<990?'OPEN':'CLOSED';
   const ny=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d).map(p=>[p.type,p.value])),nm=Number(ny.hour)*60+Number(ny.minute),nwd=!['Sat','Sun'].includes(ny.weekday);document.getElementById('radar-us').textContent=nwd&&nm>=570&&nm<960?'OPEN':'CLOSED';};tick();setInterval(tick,1000);
   fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=gbp&include_24hr_change=true').then(r=>r.json()).then(d=>{const f=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:n>100?0:2}).format(n);document.getElementById('radar-btc').textContent=f(d.bitcoin.gbp);document.getElementById('radar-eth').textContent=f(d.ethereum.gbp);document.getElementById('radar-btc-c').textContent=`${d.bitcoin.gbp_24h_change>=0?'+':''}${d.bitcoin.gbp_24h_change.toFixed(2)}% / 24H`;document.getElementById('radar-eth-c').textContent=`${d.ethereum.gbp_24h_change>=0?'+':''}${d.ethereum.gbp_24h_change.toFixed(2)}% / 24H`;}).catch(()=>{});
 }
})();

// V8 Journal search/filter
(function(){
 const input=document.getElementById('journal-search'); if(!input)return;
 const cards=[...document.querySelectorAll('.journal-card')],buttons=[...document.querySelectorAll('.journal-tools button')];let filter='all';
 const apply=()=>{const q=input.value.toLowerCase().trim();cards.forEach(c=>{const text=c.dataset.search.toLowerCase(),okF=filter==='all'||text.includes(filter.toLowerCase()),okQ=!q||text.includes(q);c.style.display=okF&&okQ?'flex':'none';});};
 input.addEventListener('input',apply);buttons.forEach(b=>b.addEventListener('click',()=>{buttons.forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;apply();}));
})();

// V8 Command Centre search
(function(){
 const trigger=document.getElementById('command-trigger'),palette=document.getElementById('command-palette');if(!trigger||!palette)return;
 const input=palette.querySelector('#command-input'),results=palette.querySelector('#command-results');
 const base='/slime786/';
 const items=[
  ['Home','Command Centre',base+'index.html'],['Market Radar','Project',base+'market-radar.html'],['Journal','Writing',base+'journal.html'],
  ['Weekly Brief','Live',base+'index.html#weekly'],['The Observatory','Community',base+'index.html#observatory'],['Projects','Builds',base+'index.html#projects'],
  ['Technology Pulse','Live',base+'index.html#tech-feed'],['Rocket Game','Play',base+'index.html#game'],['About Moheen','Profile',base+'index.html#about'],['Contact','Connect',base+'index.html#contact'],
  ['AI is becoming an interface','Article',base+'article-ai-interface.html'],['AI infrastructure','Article',base+'article-ai-infrastructure.html'],['Market noise vs business progress','Article',base+'article-market-noise.html'],['Agents and the next interface shift','Article',base+'article-agents-interface.html']
 ];let selected=0,visible=[];
 const render=()=>{const q=input.value.toLowerCase();visible=items.filter(x=>(x[0]+' '+x[1]).toLowerCase().includes(q));selected=Math.min(selected,Math.max(0,visible.length-1));results.innerHTML=visible.map((x,i)=>`<a class="command-result ${i===selected?'selected':''}" href="${x[2]}"><span>${x[0]}</span><small>${x[1].toUpperCase()}</small></a>`).join('')||'<div class="command-result"><span>No results</span></div>';};
 const open=()=>{palette.classList.add('open');palette.setAttribute('aria-hidden','false');input.value='';selected=0;render();setTimeout(()=>input.focus(),20)};
 const close=()=>{palette.classList.remove('open');palette.setAttribute('aria-hidden','true')};
 trigger.addEventListener('click',open);palette.querySelector('[data-command-close]').addEventListener('click',close);
 document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()}if(!palette.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='ArrowDown'){e.preventDefault();selected=Math.min(selected+1,visible.length-1);render()}if(e.key==='ArrowUp'){e.preventDefault();selected=Math.max(selected-1,0);render()}if(e.key==='Enter'&&visible[selected])location.href=visible[selected][2];});
 input.addEventListener('input',()=>{selected=0;render()});
})();

// V8.3 premium ticker
(function(){
 const g=id=>document.getElementById(id),root=document.querySelector('.command-ticker');if(!root)return;
 let headlines=[],hi=0;
 function sync(){
   const btc=g('btc')?.textContent||'—',eth=g('eth')?.textContent||'—',bc=g('btc-change')?.textContent||'—',ec=g('eth-change')?.textContent||'—',time=g('clock')?.textContent||'—',us=g('us-status')?.textContent||'—';
   g('ticker-btc').textContent=btc;g('ticker-eth').textContent=eth;g('ticker-btc-change').textContent=bc;g('ticker-eth-change').textContent=ec;g('ticker-london-time').textContent=time;g('ticker-us').textContent=us;
   [[g('ticker-btc-change'),bc],[g('ticker-eth-change'),ec]].forEach(([el,t])=>{const n=parseFloat(String(t).replace(/[^0-9+.-]/g,''));el.classList.toggle('positive',n>=0);el.classList.toggle('negative',n<0)});
   g('ticker-updated').textContent='UPDATED '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
 }
 async function load(){
   try{const ids=await fetch('https://hacker-news.firebaseio.com/v0/topstories.json',{cache:'no-store'}).then(r=>r.json());const s=await Promise.all(ids.slice(0,8).map(id=>fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r=>r.json())));headlines=s.filter(x=>x&&x.title).map(x=>({title:x.title,source:(()=>{try{return x.url?new URL(x.url).hostname.replace(/^www\./,''):'news.ycombinator.com'}catch{return 'TECH'}})()}));rotate()}catch{}}
 function rotate(){if(!headlines.length)return;const h=headlines[hi++%headlines.length];g('ticker-headline').textContent=h.title;g('ticker-headline-source').textContent=h.source.toUpperCase()}
 g('ticker-pause')?.addEventListener('click',e=>{const p=root.classList.toggle('paused');e.currentTarget.textContent=p?'▶':'Ⅱ';e.currentTarget.setAttribute('aria-pressed',String(p))});
 sync();setInterval(sync,2000);load();setInterval(rotate,6500);setInterval(load,300000);
})();

// V8.4 — near-real-time live ticker, sparklines, continuous motion and high-signal stories
(function(){
 const $=id=>document.getElementById(id);
 if(!$('ticker-btc')) return;

 let prevB=null,prevE=null,stories=[],storyIndex=0;

 function setAll(ids,value){ids.forEach(id=>{const el=$(id);if(el)el.textContent=value})}
 function numeric(v){return parseFloat(String(v).replace(/[^0-9.]/g,''))}
 function flash(ids,oldV,newV){
   if(oldV==null||oldV===newV)return;
   const up=numeric(newV)>=numeric(oldV);
   ids.forEach(id=>{const el=$(id);if(!el)return;el.classList.remove('price-tick-up','price-tick-down');void el.offsetWidth;el.classList.add(up?'price-tick-up':'price-tick-down')});
 }

 async function refreshPrices(){
   try{
     const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=gbp&include_24hr_change=true',{cache:'no-store'});
     if(!r.ok)throw new Error();
     const d=await r.json();
     const fmt=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:n>100?0:2}).format(n);
     const b=fmt(d.bitcoin.gbp),e=fmt(d.ethereum.gbp);
     const bc=`${d.bitcoin.gbp_24h_change>=0?'+':''}${d.bitcoin.gbp_24h_change.toFixed(2)}%`;
     const ec=`${d.ethereum.gbp_24h_change>=0?'+':''}${d.ethereum.gbp_24h_change.toFixed(2)}%`;
     flash(['ticker-btc','ticker-btc-2'],prevB,b);flash(['ticker-eth','ticker-eth-2'],prevE,e);
     setAll(['ticker-btc','ticker-btc-2'],b);setAll(['ticker-eth','ticker-eth-2'],e);
     setAll(['ticker-btc-change','ticker-btc-change-2'],bc);setAll(['ticker-eth-change','ticker-eth-change-2'],ec);
     [['ticker-btc-change',bc],['ticker-btc-change-2',bc],['ticker-eth-change',ec],['ticker-eth-change-2',ec]].forEach(([id,t])=>{const el=$(id),n=parseFloat(t);if(el){el.classList.toggle('positive',n>=0);el.classList.toggle('negative',n<0)}});
     prevB=b;prevE=e;
     $('ticker-updated').textContent='UPDATED '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
   }catch(e){}
 }

 async function spark(coin,canvasId){
   const c=$(canvasId); if(!c)return;
   try{
     const d=await fetch(`https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=gbp&days=1`,{cache:'no-store'}).then(r=>r.json());
     const vals=(d.prices||[]).map(x=>x[1]).filter(Number.isFinite); if(vals.length<2)return;
     const ctx=c.getContext('2d'),w=c.width,h=c.height,min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;
     ctx.clearRect(0,0,w,h);ctx.lineWidth=2;ctx.strokeStyle=vals.at(-1)>=vals[0]?'#2bef8b':'#ff6680';ctx.beginPath();
     vals.forEach((v,i)=>{const x=i/(vals.length-1)*w,y=h-3-(v-min)/span*(h-6);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
   }catch(e){}
 }

 function syncClock(){
   const d=new Date(),lt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d);
   setAll(['ticker-london-time','ticker-london-time-2'],lt);
   const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d).map(x=>[x.type,x.value]));
   const mins=+p.hour*60 + +p.minute,open=!['Sat','Sun'].includes(p.weekday)&&mins>=570&&mins<960;
   setAll(['ticker-us','ticker-us-2'],open?'OPEN':'CLOSED');
 }

 async function loadStories(){
   try{
     const ids=await fetch('https://hacker-news.firebaseio.com/v0/topstories.json',{cache:'no-store'}).then(r=>r.json());
     const arr=await Promise.all(ids.slice(0,18).map(id=>fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`,{cache:'no-store'}).then(r=>r.json())));
     stories=arr.filter(s=>s&&s.title).map(s=>{
       let source='news.ycombinator.com';try{if(s.url)source=new URL(s.url).hostname.replace(/^www\./,'')}catch{}
       return {...s,source,signal:(s.score||0)+(s.descendants||0)*1.25};
     }).sort((a,b)=>b.signal-a.signal);
     storyIndex=0;rotateStory();importantStory();
   }catch(e){}
 }

 function rotateStory(){
   if(!stories.length)return;const s=stories[storyIndex++%stories.length];
   setAll(['ticker-headline','ticker-headline-2'],s.title);setAll(['ticker-headline-source','ticker-headline-source-2'],s.source.toUpperCase());
 }

 function importantStory(){
   if(!stories.length)return;const s=stories[0];
   setAll(['signal-title','signal-title-2'],s.title);
   setAll(['signal-score','signal-score-2'],`${s.score||0} PTS · ${s.descendants||0} COMMENTS`);
   if($('important-title'))$('important-title').textContent=s.title;
   if($('important-meta'))$('important-meta').textContent=`High activity signal: ${s.score||0} points · ${s.descendants||0} comments · ${s.source}`;
   if($('important-link'))$('important-link').href=s.url||`https://news.ycombinator.com/item?id=${s.id}`;
 }

 $('ticker-pause')?.addEventListener('click',e=>{
   const root=document.querySelector('.command-ticker'),p=root.classList.toggle('paused');
   e.currentTarget.textContent=p?'▶':'Ⅱ';e.currentTarget.setAttribute('aria-pressed',String(p));
 });

 refreshPrices();spark('bitcoin','btc-spark');spark('ethereum','eth-spark');syncClock();loadStories();
 setInterval(syncClock,1000);
 setInterval(refreshPrices,30000);
 setInterval(()=>{spark('bitcoin','btc-spark');spark('ethereum','eth-spark')},300000);
 setInterval(rotateStory,7000);
 setInterval(loadStories,300000);
})();


// V8.4.1 — ticker mirror synchronisation
(function(){
  const one=(s)=>document.querySelector(s);
  const all=(s)=>document.querySelectorAll(s);

  function syncMirrors(){
    const copy=(sourceId,selector)=>{
      const src=document.getElementById(sourceId);
      if(!src)return;
      all(selector).forEach(el=>{
        el.textContent=src.textContent;
        el.classList.toggle('positive',src.classList.contains('positive'));
        el.classList.toggle('negative',src.classList.contains('negative'));
      });
    };

    copy('ticker-btc','.mirror-btc');
    copy('ticker-btc-change','.mirror-btc-change');
    copy('ticker-eth','.mirror-eth');
    copy('ticker-eth-change','.mirror-eth-change');
    copy('ticker-london-time','.mirror-london');
    copy('ticker-us','.mirror-us');
    copy('ticker-headline','.mirror-headline');
    copy('ticker-headline-source','.mirror-headline-source');
    copy('signal-title','.mirror-signal-title');
    copy('signal-score','.mirror-signal-score');
  }

  syncMirrors();
  setInterval(syncMirrors,500);
})();
