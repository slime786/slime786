
(() => {
  const wrap = document.getElementById('slime-v3-wrap');
  const canvas = document.getElementById('slime-v3-canvas');
  const pulse = document.getElementById('slime-v3-pulse');
  if (!wrap || !canvas) return;

  const ctx = canvas.getContext('2d', { alpha:true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {
    w:0,h:0,dpr:1,raf:0,start:performance.now(),
    pointer:{x:.5,y:.5,tx:.5,ty:.5,active:false},
    nodes:[]
  };

  const layout = [
    {ax:.50,ay:.50,r:.245,p:.2,sx:.017,sy:.021},
    {ax:.28,ay:.31,r:.118,p:1.6,sx:.027,sy:.022},
    {ax:.73,ay:.34,r:.105,p:2.8,sx:.021,sy:.028},
    {ax:.68,ay:.70,r:.092,p:4.1,sx:.030,sy:.020},
    {ax:.31,ay:.72,r:.082,p:5.2,sx:.024,sy:.029},
    {ax:.16,ay:.53,r:.058,p:3.5,sx:.038,sy:.026},
    {ax:.84,ay:.55,r:.052,p:.9,sx:.031,sy:.034},
    {ax:.52,ay:.14,r:.046,p:2.2,sx:.042,sy:.023},
    {ax:.49,ay:.86,r:.038,p:4.8,sx:.025,sy:.041}
  ];

  function resize(){
    const r = wrap.getBoundingClientRect();
    state.dpr = Math.min(devicePixelRatio || 1, 2);
    state.w = Math.max(1,r.width);
    state.h = Math.max(1,r.height);
    canvas.width = Math.round(state.w*state.dpr);
    canvas.height = Math.round(state.h*state.dpr);
    canvas.style.width = state.w+'px';
    canvas.style.height = state.h+'px';
    ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
    state.nodes = layout.map(n=>({...n,x:n.ax*state.w,y:n.ay*state.h,vx:0,vy:0}));
  }

  function fillGradient(x,y,r){
    const g=ctx.createRadialGradient(x-r*.34,y-r*.38,r*.08,x,y,r);
    g.addColorStop(0,'#f2ffc3');
    g.addColorStop(.14,'#d0ff6d');
    g.addColorStop(.48,'#9af633');
    g.addColorStop(.78,'#4da817');
    g.addColorStop(1,'#173109');
    return g;
  }

  function drawStatic(){
    ctx.clearRect(0,0,state.w,state.h);
    const min=Math.min(state.w,state.h);
    state.nodes.forEach((n,i)=>{
      const r=min*n.r;
      ctx.fillStyle=fillGradient(n.x,n.y,r);
      ctx.beginPath();
      ctx.arc(n.x,n.y,r,0,Math.PI*2);
      ctx.fill();
    });
  }

  function tick(now){
    const t=(now-state.start)/1000;
    state.pointer.x+=(state.pointer.tx-state.pointer.x)*.065;
    state.pointer.y+=(state.pointer.ty-state.pointer.y)*.065;
    ctx.clearRect(0,0,state.w,state.h);

    const min=Math.min(state.w,state.h);
    const px=state.pointer.x*state.w, py=state.pointer.y*state.h;

    state.nodes.forEach((n,i)=>{
      const wx=Math.sin(t*(1+n.sx*18)+n.p)*state.w*n.sx;
      const wy=Math.cos(t*(.9+n.sy*17)+n.p*1.2)*state.h*n.sy;
      let tx=n.ax*state.w+wx, ty=n.ay*state.h+wy;

      if(state.pointer.active){
        const dx=px-tx, dy=py-ty;
        const d=Math.max(1,Math.hypot(dx,dy));
        const reach=min*(i===0?.52:.35);
        if(d<reach){
          const f=(1-d/reach)*(i===0?.15:.23);
          tx+=dx*f; ty+=dy*f;
        }
      }

      n.vx+=(tx-n.x)*.018;
      n.vy+=(ty-n.y)*.018;
      n.vx*=.88; n.vy*=.88;
      n.x+=n.vx; n.y+=n.vy;

      const breath=1+Math.sin(t*(i===0?1.1:1.45)+n.p)*(i===0?.035:.075);
      const rr=min*n.r*breath;
      ctx.fillStyle=fillGradient(n.x,n.y,rr);
      ctx.beginPath();
      ctx.arc(n.x,n.y,rr,0,Math.PI*2);
      ctx.fill();
    });

    for(let i=0;i<8;i++){
      const a=t*.34+i*(Math.PI*2/8);
      const radius=min*(.31+(i%3)*.024);
      const x=state.w*.5+Math.cos(a*1.13+i)*radius;
      const y=state.h*.5+Math.sin(a*.91+i*.8)*radius*.82;
      ctx.fillStyle=i%3===0?'rgba(235,255,197,.95)':'rgba(184,255,45,.72)';
      ctx.beginPath();
      ctx.arc(x,y,2.2+(i%2)*1.4,0,Math.PI*2);
      ctx.fill();
    }

    state.raf=requestAnimationFrame(tick);
  }

  function point(e){
    const r=wrap.getBoundingClientRect();
    const cx=e.clientX, cy=e.clientY;
    state.pointer.tx=Math.max(0,Math.min(1,(cx-r.left)/r.width));
    state.pointer.ty=Math.max(0,Math.min(1,(cy-r.top)/r.height));
    state.pointer.active=true;
  }

  function fire(e){
    const r=wrap.getBoundingClientRect();
    pulse.style.left=(e.clientX-r.left)+'px';
    pulse.style.top=(e.clientY-r.top)+'px';
    pulse.classList.remove('active');
    void pulse.offsetWidth;
    pulse.classList.add('active');
  }

  resize();
  if(reduced){ drawStatic(); }
  else{
    state.raf=requestAnimationFrame(tick);
    wrap.addEventListener('pointermove',point,{passive:true});
    wrap.addEventListener('pointerenter',()=>state.pointer.active=true);
    wrap.addEventListener('pointerleave',()=>{
      state.pointer.tx=.5; state.pointer.ty=.5; state.pointer.active=false;
    });
    wrap.addEventListener('pointerdown',e=>{point(e);fire(e)},{passive:true});
  }

  addEventListener('resize',resize,{passive:true});
  addEventListener('pagehide',()=>cancelAnimationFrame(state.raf),{once:true});
})();
