import {mkdirSync,writeFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import sharp from 'sharp';
import {timeline} from '../src/schema';
import {readFilm} from './io';
const args=process.argv.slice(2);
const option=(name:string,fallback:string)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const film=readFilm(option('--input','data/film.json'));
const prototype=args.includes('--prototype'), stills=args.includes('--stills');
const name=option('--name',prototype?'prototype':'ai-first-rebuild-lab-v1');
if (!/^[a-zA-Z0-9-]+$/.test(name)) throw new Error('Invalid output name');
mkdirSync('out',{recursive:true});
const started=performance.now();
const serveUrl=await bundle({entryPoint:path.resolve('src/index.tsx'),outDir:path.resolve('.cache/bundle')});
const browser=await openBrowser('chrome',{browserExecutable:process.env.REMOTION_BROWSER_EXECUTABLE});
try {
  const inputProps={film};
  const composition=await selectComposition({serveUrl,id:'RebuildLab',inputProps,puppeteerInstance:browser});
  const common={serveUrl,composition,inputProps,puppeteerInstance:browser};
  if (!stills) {
    let last=-1;
    await renderMedia({...common,codec:'h264',pixelFormat:'yuv420p',colorSpace:'bt709',crf:18,x264Preset:'fast',concurrency:4,
      outputLocation:`out/${name}.mp4`,frameRange:prototype?[0,179]:undefined,
      onProgress:({progress})=>{const tenth=Math.floor(progress*10);if(tenth!==last){last=tenth;console.log(`Render ${tenth*10}%`);}},
    });
    const report={file:`${name}.mp4`,seconds:Number(((performance.now()-started)/1000).toFixed(2)),bytes:statSync(`out/${name}.mp4`).size,frames:prototype?180:1800,width:1920,height:1080,fps:60,input:option('--input','data/film.json')};
    writeFileSync(`out/${name}-render.json`,JSON.stringify(report,null,2)+'\n');console.log(report);
  }
  const frames=prototype?[120]:timeline(film).map(s=>Math.min(s.end-30,s.start+Math.floor((s.end-s.start)*.77)));
  for (const [i,frame] of frames.entries()) await renderStill({...common,frame,output:`out/${prototype?name:`scene-${i+1}`}.png`});
  if (!prototype) {
    await renderStill({...common,frame:1799,output:'out/poster.png'});
    const thumbs=await Promise.all(frames.map((_,i)=>sharp(`out/scene-${i+1}.png`).resize(640,360).png().toBuffer()));
    await sharp({create:{width:1280,height:1080,channels:3,background:film.theme.background}}).composite(thumbs.map((input,i)=>({input,left:i%2*640,top:Math.floor(i/2)*360}))).png().toFile('out/scenes.png');
    // Boundary contact sheets sample both sides and the middle of each morph.
    const checkpoints=[0,1,30,...timeline(film).slice(1).flatMap(s=>[s.start-1,s.start,s.start+15,s.start+42]),1740,1799];
    mkdirSync('out/checkpoints',{recursive:true});
    for (const frame of checkpoints) await renderStill({...common,frame,output:`out/checkpoints/${frame}.png`});
    for (let page=0;page<Math.ceil(checkpoints.length/6);page++) {
      const slice=checkpoints.slice(page*6,page*6+6);
      const tiles=await Promise.all(slice.map(async(frame,i)=>({input:await sharp(`out/checkpoints/${frame}.png`).resize(640,360).png().toBuffer(),left:i%2*640,top:Math.floor(i/2)*360})));
      await sharp({create:{width:1280,height:1080,channels:3,background:film.theme.background}}).composite(tiles).png().toFile(`out/transitions-${page+1}.png`);
    }
    await renderStill({...common,frame:1000,output:'out/determinism-a.png'});
    await renderStill({...common,frame:1000,output:'out/determinism-b.png'});
  }
} finally {await browser.close({silent:true});}
