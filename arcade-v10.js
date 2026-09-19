/* V9.3 — MOHEEN // ARCADE */
(()=>{
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const store={get:(k,d=0)=>+(localStorage.getItem(k)||d),set:(k,v)=>localStorage.setItem(k,v)};
 let xp=store.get('mm-arcade-xp'), missions=store.get('mm-arcade-missions');
 const xpE=$('#arcade-xp'), missionsE=$('#arcade-missions');
 function profile(){if(xpE)xpE.textContent=String(xp).padStart(4,'0');if(missionsE)missionsE.textContent=String(missions).padStart(2,'0')}
 function award(n){xp+=n;missions++;store.set('mm-arcade-xp',xp);store.set('mm-arcade-missions',missions);profile()}
 profile();

 $$('.mission-card').forEach(b=>b.addEventListener('click',()=>{
   $$('.mission-card').forEach(x=>x.classList.remove('active')); b.classList.add('active');
   $$('.arcade-panel').forEach(x=>x.classList.remove('active')); $('#arcade-'+b.dataset.game)?.classList.add('active');
 }));

 let sound=false; const soundBtn=$('#sound-toggle');
 soundBtn?.addEventListener('click',()=>{sound=!sound;soundBtn.textContent='SOUND / '+(sound?'ON':'OFF');soundBtn.setAttribute('aria-pressed',String(sound))});
 function beep(freq=440,d=.05){if(!sound)return;try{const A=new (window.AudioContext||window.webkitAudioContext)(),o=A.createOscillator(),g=A.createGain();o.frequency.value=freq;g.gain.value=.025;o.connect(g);g.connect(A.destination);o.start();o.stop(A.currentTime+d)}catch(e){}}

 // Space Boost 2.0
 const g=$('#game-shell'),r=$('#rocket'),o=$('#objects'),m=$('#game-message'),scoreE=$('#score'),livesE=$('#lives'),bestE=$('#best'),shieldE=$('#shield'),energyE=$('#energy');
 let run=false,paused=false,x=.5,score=0,speed=3,last=0,spawn=0,lives=3,shield=100,energy=0,k={},best=store.get('mm-v5-best');
 if(bestE)bestE.textContent=String(best).padStart(4,'0');
 function boostStart(){run=true;paused=false;x=.5;score=0;speed=3;spawn=0;lives=3;shield=100;energy=0;o.innerHTML='';scoreE.textContent='0000';shieldE.textContent='100';energyE.textContent='0';livesE.textContent='♥ ♥ ♥';m.style.display='none';g.classList.remove('game-paused');last=performance.now();requestAnimationFrame(boostLoop)}
 function boostEnd(){run=false;const s=Math.floor(score);best=Math.max(best,s);store.set('mm-v5-best',best);bestE.textContent=String(best).padStart(4,'0');award(Math.max(25,Math.floor(s/4)));m.querySelector('h3').textContent='MISSION COMPLETE';m.querySelector('p').textContent='Score '+s+' · Energy '+energy;m.style.display='flex';beep(220,.12)}
 function spawnObj(){const a=document.createElement('i');if(Math.random()<.18){a.className='energy-cell';a.style.left=(5+Math.random()*90)+'%'}else{const z=22+Math.random()*55;a.className='meteor '+(z<40?'small':'large');a.style.width=z+'px';a.style.height=z+'px';a.style.left=(3+Math.random()*92)+'%'}a.style.top='-70px';o.appendChild(a)}
 function hit(a,b){const A=a.getBoundingClientRect(),B=b.getBoundingClientRect();return !(A.right<B.left+6||A.left>B.right-6||A.bottom<B.top+6||A.top>B.bottom-6)}
 function boostLoop(n){if(!run)return;if(paused){last=n;requestAnimationFrame(boostLoop);return}const dt=Math.min(32,n-last);last=n;const mv=((k.ArrowRight||k.KeyD)?1:0)-((k.ArrowLeft||k.KeyA)?1:0),boost=k.Space?1.5:1;x=Math.max(.04,Math.min(.96,x+mv*dt*.00155*boost));r.style.left=x*100+'%';r.style.transform=`translateX(-50%) rotate(${mv*8}deg)`;spawn+=dt;if(spawn>Math.max(300,820-speed*58)){spawnObj();spawn=0}
 o.querySelectorAll('.meteor,.energy-cell').forEach(a=>{const t=parseFloat(a.style.top);a.style.top=t+speed*dt*.07*boost+'px';if(hit(r,a)){if(a.classList.contains('energy-cell')){energy++;score+=35;shield=Math.min(100,shield+8);energyE.textContent=energy;shieldE.textContent=Math.round(shield);beep(720)}else{shield-=a.classList.contains('large')?48:32;beep(120);if(shield<=0){lives--;shield=100;livesE.textContent=Array(Math.max(0,lives)).fill('♥').join(' ');if(lives<=0){a.remove();boostEnd();return}}shieldE.textContent=Math.round(shield)}a.remove()}else if(t>620){a.remove();if(a.classList.contains('meteor'))score+=10}});
 score+=dt*.008;speed=Math.min(9,speed+dt*.00013);scoreE.textContent=String(Math.floor(score)).padStart(4,'0');requestAnimationFrame(boostLoop)}
 $('#launch')?.addEventListener('click',boostStart); $('#pause-game')?.addEventListener('click',()=>{if(run){paused=!paused;g.classList.toggle('game-paused',paused)}});
 window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space','KeyA','KeyD'].includes(e.code)&&run)e.preventDefault();k[e.code]=true;if(e.code==='KeyP'&&run){paused=!paused;g.classList.toggle('game-paused',paused)}});window.addEventListener('keyup',e=>k[e.code]=false);

 // Orbital Defender
 const field=$('#defender-field'), ds=$('#def-score'), dw=$('#def-wave');let defRun=false,defScore=0,wave=1,defTimer;
 function defenderStart(){field.querySelectorAll('.def-object').forEach(x=>x.remove());defRun=true;defScore=0;wave=1;ds.textContent=0;dw.textContent=1;clearInterval(defTimer);defTimer=setInterval(()=>{if(!defRun)return;const a=document.createElement('button');a.className='def-object';a.setAttribute('aria-label','Incoming asteroid');a.style.left=(3+Math.random()*90)+'%';a.style.top='-40px';field.appendChild(a);let y=-40,spd=1.2+wave*.18+Math.random();const tick=setInterval(()=>{if(!defRun||!a.isConnected){clearInterval(tick);return}y+=spd;a.style.top=y+'px';if(y>325){a.remove();clearInterval(tick);defRun=false;clearInterval(defTimer);award(Math.max(20,defScore));$('#def-start').textContent='Retry Defence →';beep(130,.15)}},20);a.addEventListener('click',()=>{if(!defRun)return;a.remove();clearInterval(tick);defScore+=10;ds.textContent=defScore;wave=1+Math.floor(defScore/80);dw.textContent=wave;beep(520)});},Math.max(360,900-wave*45))}
 $('#def-start')?.addEventListener('click',defenderStart);

 // Signal Decode
 const pads=$$('.signal-grid button'), status=$('#signal-status'), roundE=$('#sig-round'), sigBestE=$('#sig-best');let seq=[],input=[],accept=false,sigBest=store.get('mm-signal-best');if(sigBestE)sigBestE.textContent=sigBest;
 const wait=ms=>new Promise(r=>setTimeout(r,ms));async function flash(i){pads[i].classList.add('signal-lit');beep(350+i*120);await wait(330);pads[i].classList.remove('signal-lit');await wait(120)}
 async function nextRound(){accept=false;input=[];seq.push(Math.floor(Math.random()*4));roundE.textContent=seq.length;status.textContent='MEMORISE';await wait(500);for(const i of seq)await flash(i);status.textContent='REPEAT SIGNAL';accept=true}
 function signalStart(){seq=[];input=[];nextRound()}
 pads.forEach((p,i)=>p.addEventListener('click',async()=>{if(!accept)return;await flash(i);input.push(i);const n=input.length-1;if(input[n]!==seq[n]){accept=false;status.textContent='SIGNAL LOST · SCORE '+(seq.length-1);sigBest=Math.max(sigBest,seq.length-1);store.set('mm-signal-best',sigBest);sigBestE.textContent=sigBest;award(Math.max(15,(seq.length-1)*15));beep(110,.18);return}if(input.length===seq.length){accept=false;status.textContent='LOCKED';await wait(600);nextRound()}}));
 $('#sig-start')?.addEventListener('click',signalStart);
})();
