import React, {useEffect, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {type Film, type Scene, timeline} from './schema';

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {const t = clamp(x); return t*t*(3-2*t);};
const mix = (a: number,b: number,t: number) => a+(b-a)*t;
type Shape = {x:number;y:number;w:number;h:number;r:number};
function geometry(kind: Scene['kind'], i: number): Shape {
  if (kind === 'problem') return {x: [170,570,1000,1390][i], y:[495,570,470,540][i], w:310,h:190,r:[-7,5,-4,7][i]};
  if (kind === 'boundaries') return {x:160+i*410,y:450+i*22,w:345,h:270-i*18,r:0};
  if (kind === 'flow') return {x:150+i*415,y:505,w:360,h:235,r:0};
  if (kind === 'trace') return {x:150+i*415,y:475,w:360,h:205,r:0};
  return {x:150+i*104,y:kind === 'closing'?248:318,w:80,h:6,r:0};
}
function useFont(path: string) {
  const [handle] = useState(() => delayRender('Local Japanese font'));
  useEffect(() => {
    const face = new FontFace('LabNoto', `url("${staticFile(path)}")`, {weight:'100 900'});
    face.load().then(font => {document.fonts.add(font); return document.fonts.ready;}).then(() => continueRender(handle)).catch(cancelRender);
  },[handle,path]);
}

export function FilmVideo({film}: {film: Film}) {
  useFont(film.assets.font);
  const frame = useCurrentFrame();
  const scenes = timeline(film);
  const index = scenes.findIndex(s => frame >= s.start && frame < s.end);
  const scene = scenes[Math.max(0,index)];
  const previous = scenes[Math.max(0,index-1)];
  const local = frame-scene.start;
  const t = smooth(local/42);
  const colors = [film.theme.mint,film.theme.sky,film.theme.iris,film.theme.violet];
  const {theme} = film;
  const isText = scene.kind === 'statement' || scene.kind === 'closing';
  const textIn = index === 0 ? 1 : smooth((local-(scene.kind==='statement'?24:7))/24);
  const textOut = index < 5 ? 1-smooth((frame-(scene.end-15))/15) : 1;
  const textOpacity = textIn*textOut;
  const beat = local/28.125;
  const active = scene.kind === 'flow' ? Math.min(3,Math.floor(beat/4)) : -1;
  const traceState = Math.min(2, Math.floor(beat/5));
  const shapes = colors.map((_,i) => {
    const before = geometry(previous.kind,i), after = geometry(scene.kind,i);
    const result = Object.fromEntries(Object.keys(after).map(key => [key,mix(before[key as keyof Shape],after[key as keyof Shape],t)])) as Shape;
    if (index === 0) {const settle = smooth(frame/90); result.x += (1-settle)*[-90,60,-45,100][i]; result.y += (1-settle)*[90,-100,120,-50][i]; result.r *= 1.5-settle*.5;}
    return result;
  });
  return <AbsoluteFill style={{background:theme.background,color:theme.text,fontFamily:'LabNoto',overflow:'hidden'}}>
    <AbsoluteFill style={{background:`radial-gradient(ellipse at 78% 32%, ${theme.sky}12, transparent 57%), radial-gradient(ellipse at 12% 95%, ${theme.mint}0b, transparent 60%)`}}/>
    <AbsoluteFill style={{opacity:.22,backgroundImage:`linear-gradient(${theme.muted}18 1px,transparent 1px), linear-gradient(90deg,${theme.muted}18 1px,transparent 1px)`,backgroundSize:'80px 80px',maskImage:'linear-gradient(transparent, black 50%, transparent)'}}/>
    <div style={{position:'absolute',left:110,top:65,fontSize:23,letterSpacing:2,color:theme.muted}}>{film.title}</div>
    <div style={{position:'absolute',right:110,top:67,fontSize:23,color:theme.muted,fontVariantNumeric:'tabular-nums'}}>{String(index+1).padStart(2,'0')} / 06</div>
    <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
      {/* Shared geometry persists through scene boundaries; no reset-to-blank cuts. */}
      {shapes.slice(0,3).map((s,i) => {
        const next=shapes[i+1];
        const broken=scene.kind==='trace' && traceState>=1 && i===0;
        return <path key={i} d={`M ${s.x+s.w} ${s.y+s.h/2} C ${s.x+s.w+45} ${s.y+s.h/2}, ${next.x-45} ${next.y+next.h/2}, ${next.x} ${next.y+next.h/2}`}
          stroke={broken?theme.warning:colors[i]} strokeWidth={broken?4:2} strokeDasharray={broken?'7 13':undefined} fill="none" opacity={isText?1-t:.55}/>;
      })}
      {shapes.map((s,i) => <g key={i} transform={`translate(${s.x},${s.y}) rotate(${s.r},${s.w/2},${s.h/2})`}>
        {scene.kind==='boundaries' && <rect x="12" y="-12" width={s.w} height={s.h} rx="20" fill="none" stroke={colors[i]} opacity={.2*t}/>}
        <rect width={s.w} height={s.h} rx={mix(22,3,isText?t:0)} fill={theme.surface} stroke={colors[i]} strokeWidth={active===i?4:2} opacity={.92}/>
        {isText && <rect width={s.w} height={s.h} rx={mix(22,3,t)} fill={colors[i]} opacity={previous.kind==='statement'?1:t}/>}
        {!isText && <path d={`M 24 0 H ${Math.min(s.w-24,90)}`} stroke={colors[i]} strokeWidth="5"/>}
      </g>)}
      {(scene.kind==='boundaries' || scene.kind==='flow') && (() => {
        const p=scene.kind==='flow'?interpolate(beat,[1,4,8,12,14],[0,1,2,3,3],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}):3*smooth((beat-1)/5);
        const i=Math.min(2,Math.floor(p)), q=p-i;
        const a=shapes[i], b=shapes[i+1];
        return <g opacity={t}><circle cx={mix(a.x+a.w/2,b.x+b.w/2,q)} cy={790} r="11" fill={colors[Math.round(p)]}/><path d="M 330 790 H 1580" stroke={theme.muted} opacity=".2" strokeWidth="2"/></g>;
      })()}
      {(scene.kind==='problem' || (isText && local<48)) && Array.from({length:24},(_,i) => {
        const p=scene.kind==='problem'?smooth(frame/100):smooth(local/48);
        const a=(i*2.39996); const k=shapes[i%4];
        const x=mix(960+Math.cos(a)*(380+i*16),k.x+k.w/2,p);
        const y=mix(660+Math.sin(a)*(160+i*9),k.y+k.h/2,p);
        return <circle key={i} cx={x} cy={y} r={3+i%3} fill={colors[i%4]} opacity={(1-p)*.65}/>;
      })}
    </svg>
    {!isText && 'items' in scene && scene.items.map((item,i) => {
      const s=shapes[i];
      const isHuman=item.role==='human';
      const c=item.role==='ai'?theme.violet:isHuman?theme.mint:colors[i];
      return <div key={i} style={{position:'absolute',left:s.x,top:s.y,width:s.w,height:s.h,transform:`rotate(${s.r}deg)`,opacity:textOpacity,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
        {scene.kind==='flow' && <div style={{fontSize:25,color:c,border:`1px solid ${c}`,borderRadius:isHuman?5:28,padding:'2px 18px',marginBottom:14}}>{item.role==='ai'?scene.roleLabels.ai:scene.roleLabels.human}</div>}
        <div data-copy style={{fontSize:scene.kind==='boundaries'?44:46,fontWeight:700,lineHeight:1.25,whiteSpace:'nowrap'}}>{item.label}</div>
        <div data-copy style={{fontSize:29,color:theme.muted,marginTop:19,whiteSpace:'nowrap'}}>{item.detail}</div>
      </div>;
    })}
    <div style={{position:'absolute',left:150,top:isText?158:151,opacity:textOpacity}}>
      <div data-copy style={{fontSize:27,color:colors[Math.min(index,3)],letterSpacing:3}}>{scene.eyebrow}</div>
    </div>
    <div style={{position:'absolute',left:150,right:120,top:scene.kind==='closing'?308:scene.kind==='statement'?386:215,opacity:textOpacity,transform:`translateY(${(1-textIn)*16}px)`}}>
      <div data-copy style={{fontSize:isText?110:86,fontWeight:800,letterSpacing:-2,lineHeight:1.42,whiteSpace:'pre-line'}}>{scene.headline}</div>
      {scene.body && <div data-copy style={{fontSize:isText?43:37,color:theme.muted,marginTop:isText?32:18,whiteSpace:'nowrap'}}>{scene.body}</div>}
    </div>
    {scene.kind==='trace' && <div style={{position:'absolute',top:755,left:150,width:1605,height:94,borderLeft:`5px solid ${traceState===0?theme.sky:traceState===1?theme.warning:theme.mint}`,background:theme.surface,display:'flex',alignItems:'center',paddingLeft:38,fontSize:40,opacity:textOpacity}}>
      <span data-copy style={{color:traceState===1?theme.warning:theme.text}}>{scene.states[traceState]}</span>
      {traceState===2 && <svg width="48" height="48" style={{marginLeft:32}}><path d="M 9 24 L 21 35 L 40 10" fill="none" stroke={theme.mint} strokeWidth="4"/></svg>}
    </div>}
    {scene.note && <div data-copy style={{position:'absolute',left:150,top:920,fontSize:29,color:theme.muted,opacity:textOpacity,whiteSpace:'nowrap'}}>{scene.note}</div>}
    {scene.kind==='closing' && <div style={{position:'absolute',left:150,top:691,opacity:textOpacity}}>
      <div data-copy style={{fontSize:40,fontWeight:600,letterSpacing:1}}>{film.title}</div>
      <div style={{display:'flex',alignItems:'center',gap:30,marginTop:40}}><div data-copy style={{fontSize:34,color:theme.mint}}>{film.cta.label}</div><span style={{fontSize:37,color:theme.mint}}>↗</span></div>
      <div data-copy style={{fontSize:32,color:theme.muted,marginTop:15}}>{film.cta.displayUrl}</div>
    </div>}
    <div style={{position:'absolute',bottom:42,left:110,right:110,height:2,background:`${theme.muted}20`}}><div style={{height:2,width:`${100*Math.min(frame,1650)/1650}%`,background:`linear-gradient(90deg,${theme.mint},${theme.sky},${theme.violet})`}}/></div>
  </AbsoluteFill>;
}
