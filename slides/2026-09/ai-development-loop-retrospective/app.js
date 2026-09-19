(() => {
  'use strict';
  const slides = [...document.querySelectorAll('.slide')];
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d', { alpha: true });
  const fallback = document.getElementById('fallback-bg');
  const progress = document.getElementById('progress');
  const slideNo = document.getElementById('slideNo');
  let index = Math.max(0, Math.min(slides.length - 1, Number(location.hash.replace('#','')) || 0));
  let step = 0;
  let reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fragments(slide){ return [...slide.querySelectorAll('.fragment')]; }
  function maxStep(slide){ return Number(slide.dataset.fragments || fragments(slide).length || 0); }
  function applyStep(slide, value){
    slide.dataset.step = String(value);
    fragments(slide).forEach(el => el.classList.toggle('visible', Number(el.dataset.fragment || 1) <= value));
  }
  function activate(next, resetStep=true){
    index = Math.max(0, Math.min(slides.length-1, next));
    if(resetStep) step = 0;
    slides.forEach((s,i)=>{s.classList.toggle('active',i===index); s.classList.toggle('past',i<index);});
    applyStep(slides[index], step);
    location.hash = String(index);
    slideNo.textContent = String(index+1).padStart(2,'0');
    progress.style.width = `${(index/(slides.length-1))*100}%`;
    sceneMode = slides[index].dataset.scene || 'quiet';
    fallback.style.backgroundImage = sceneMode === 'open' ? "url('assets/opening-fallback.png')" : sceneMode === 'close' ? "url('assets/closing-fallback.png')" : 'none';
    fallback.style.opacity = (sceneMode === 'open' || sceneMode === 'close') ? '.14' : '0';
  }
  function next(){
    const max = maxStep(slides[index]);
    if(step < max){ step++; applyStep(slides[index], step); return; }
    if(index < slides.length-1) activate(index+1,true);
  }
  function prev(){
    if(step>0){ step--; applyStep(slides[index], step); return; }
    if(index>0){ activate(index-1,true); step=maxStep(slides[index]); applyStep(slides[index],step); }
  }
  addEventListener('keydown',e=>{
    if(['ArrowRight','ArrowDown',' ','PageDown','Enter'].includes(e.key)){e.preventDefault();next();}
    else if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(e.key)){e.preventDefault();prev();}
    else if(e.key.toLowerCase()==='f'){document.documentElement.requestFullscreen?.();}
  });
  let touchX=0; addEventListener('touchstart',e=>touchX=e.touches[0].clientX,{passive:true}); addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>40)(dx<0?next:prev)();},{passive:true});

  // --- Lightweight 3D particle scene (no external dependency; offline-safe) ---
  const DPR = Math.min(devicePixelRatio || 1, 2);
  let W=0,H=0,t0=performance.now(),sceneMode='open';
  function resize(){ W=innerWidth; H=innerHeight; canvas.width=Math.floor(W*DPR); canvas.height=Math.floor(H*DPR); canvas.style.width=W+'px'; canvas.style.height=H+'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
  addEventListener('resize',resize); resize();
  const rand=(a,b)=>a+Math.random()*(b-a);
  const nodes=Array.from({length:185},(_,i)=>({
    seed:Math.random()*999, r:rand(.55,1.4), theta:rand(0,Math.PI*2), phi:Math.acos(rand(-1,1)),
    drift:rand(.03,.18), size:rand(.6,2.4), phase:rand(0,Math.PI*2), lane:i%9
  }));
  const stars=Array.from({length:180},()=>({x:Math.random(),y:Math.random(),z:rand(.2,1),p:rand(0,6.28)}));
  function proj(x,y,z, cx,cy,scale){ const d=4.2; const k=d/(d+z); return [cx+x*k*scale,cy+y*k*scale,k]; }
  function openingPoint(n,t){
    const a=n.theta+t*n.drift*.22, p=n.phi+Math.sin(t*.2+n.phase)*.06;
    const rr=n.r*(.94+.09*Math.sin(t*.7+n.phase));
    return [Math.sin(p)*Math.cos(a)*rr, Math.cos(p)*rr, Math.sin(p)*Math.sin(a)*rr];
  }
  function closingPoint(n,t){
    const u=(n.seed%1000)/1000, lane=(n.lane-4)*.08;
    const x=-1.8+u*3.9; const y=.7*Math.sin(u*3.5-1.2)+lane + .08*Math.sin(t+n.phase); const z=.55*Math.cos(u*5+n.phase*.2)+lane*.7;
    return [x,y,z];
  }
  function drawStars(t){
    ctx.save(); for(const s of stars){const tw=.2+.55*(.5+.5*Math.sin(t*.45+s.p));ctx.fillStyle=`rgba(155,205,255,${tw*s.z*.42})`;ctx.beginPath();ctx.arc(s.x*W,s.y*H,(.35+1.1*s.z),0,6.283);ctx.fill();} ctx.restore();
  }
  function drawScene(now){
    const t=(now-t0)/1000; ctx.clearRect(0,0,W,H); if(sceneMode==='quiet'){ requestAnimationFrame(drawScene); return; }
    drawStars(t);
    const open=sceneMode==='open'; const cx=open?W*.77:W*.72, cy=open?H*.49:H*.49, scale=Math.min(W,H)*(open?.245:.31);
    const pts=nodes.map(n=>{const p=open?openingPoint(n,t):closingPoint(n,t);const q=proj(...p,cx,cy,scale);return {n,p,q};});
    // luminous paths / connections
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<pts.length;i++){
      const A=pts[i]; for(let j=i+1;j<Math.min(pts.length,i+12);j++){
        const B=pts[j]; const dx=A.q[0]-B.q[0],dy=A.q[1]-B.q[1]; const dd=dx*dx+dy*dy;
        if(dd<9500){const alpha=(1-dd/9500)*.11*Math.min(A.q[2],B.q[2]);ctx.strokeStyle=open?`rgba(89,210,255,${alpha})`:`rgba(155,143,255,${alpha})`;ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(A.q[0],A.q[1]);ctx.lineTo(B.q[0],B.q[1]);ctx.stroke();}
      }
    }
    // orbital sweeps
    for(let ring=0;ring<4;ring++){
      ctx.beginPath(); for(let k=0;k<=100;k++){const u=k/100*Math.PI*2;let x,y,z;if(open){x=Math.cos(u)*(1.25+ring*.14);y=Math.sin(u)*(0.28+ring*.04);z=Math.sin(u*2+ring)*.5;} else {x=-1.8+(k/100)*4.2;y=.7*Math.sin(k/100*3.5-1.2)+(ring-1.5)*.06;z=.55*Math.cos(k/100*5+ring*.3);} const q=proj(x,y,z,cx,cy,scale); k?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);} ctx.strokeStyle=open?`rgba(125,107,255,${.10+ring*.025})`:`rgba(91,224,255,${.10+ring*.025})`;ctx.lineWidth=1;ctx.stroke();
    }
    // points
    for(const o of pts){const [x,y,k]=o.q; const pulse=.75+.35*Math.sin(t*1.8+o.n.phase); const r=o.n.size*k*pulse; const grd=ctx.createRadialGradient(x,y,0,x,y,r*5);grd.addColorStop(0,open?'rgba(225,252,255,.95)':'rgba(239,232,255,.95)');grd.addColorStop(.18,open?'rgba(96,228,255,.85)':'rgba(151,122,255,.82)');grd.addColorStop(1,'rgba(80,120,255,0)');ctx.fillStyle=grd;ctx.beginPath();ctx.arc(x,y,r*5,0,6.283);ctx.fill();}
    ctx.restore();
    // core glow
    const core=ctx.createRadialGradient(cx,cy,0,cx,cy,scale*(open?.85:.65));core.addColorStop(0,open?'rgba(92,214,255,.11)':'rgba(142,118,255,.10)');core.addColorStop(.5,'rgba(69,74,220,.025)');core.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=core;ctx.beginPath();ctx.arc(cx,cy,scale*(open?.85:.65),0,6.283);ctx.fill();
    requestAnimationFrame(drawScene);
  }
  requestAnimationFrame(drawScene);
  if(reduceMotion){ canvas.style.opacity='.55'; }
  activate(index,true);
})();
