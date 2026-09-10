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
