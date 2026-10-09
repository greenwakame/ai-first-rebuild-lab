import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const require=createRequire(import.meta.url);
const rendererRequire=createRequire(require.resolve('@remotion/renderer'));
const pkg=`@remotion/compositor-${process.platform}-${process.arch}`;
const dir=path.dirname(rendererRequire.resolve(`${pkg}/package.json`));
const env={...process.env,DYLD_LIBRARY_PATH:dir,LD_LIBRARY_PATH:dir};
const file=process.argv[2] ?? 'out/ai-first-rebuild-lab-v1.mp4';
const probe=spawnSync(path.join(dir,'ffprobe'),['-v','error','-count_frames','-show_streams','-show_format','-of','json',file],{env,encoding:'utf8'});
assert.equal(probe.status,0,probe.stderr);
const metadata=JSON.parse(probe.stdout);
const video=metadata.streams.find((s:{codec_type:string})=>s.codec_type==='video');
assert.equal(video.width,1920);assert.equal(video.height,1080);assert.equal(video.avg_frame_rate,'60/1');
assert.equal(video.codec_name,'h264');assert.equal(video.pix_fmt,'yuv420p');
assert.equal(metadata.streams.length,1,'Silent film must have one video stream only');
assert.equal(Number(video.nb_read_frames),1800);assert.equal(Number(metadata.format.duration),30);
const decode=spawnSync(path.join(dir,'ffmpeg'),['-v','error','-i',file,'-c:v','rawvideo','-f','null','-'],{env,encoding:'utf8'});
assert.equal(decode.status,0,decode.stderr);assert.equal(decode.stderr.trim(),'');
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
assert.equal(hash('out/determinism-a.png'),hash('out/determinism-b.png'));
const scan=spawnSync(path.join(dir,'ffmpeg'),['-v','error','-i',file,'-vf','scale=160:90','-pix_fmt','gray','-an','-c:v','rawvideo','-f','image2pipe','-'],{env,maxBuffer:40*1024*1024});
assert.equal(scan.status,0,scan.stderr.toString());
assert.equal(scan.stdout.length,1800*160*90);
const black:number[]=[];
for(let frame=0;frame<1800;frame++) {
  const pixels=scan.stdout.subarray(frame*14400,(frame+1)*14400);
  if(!pixels.some(value=>value>70))black.push(frame);
}
assert.equal(black.length,0,'Unexpected frame with no visible content at 160px width');
// Re-decode contact sheets from the actual MP4, independent of renderStill.
const motion=spawnSync(path.join(dir,'ffmpeg'),['-v','error','-i',file,'-vf','scale=480:270','-r','2','-pix_fmt','rgb24','-an','-c:v','rawvideo','-f','image2pipe','-'],{env,maxBuffer:40*1024*1024});
assert.equal(motion.status,0,motion.stderr.toString());
const frameBytes=480*270*3;
assert.ok(motion.stdout.length>=60*frameBytes);
for (const segment of [0,1,2]) {
  const tiles=await Promise.all(Array.from({length:20},async(_,i)=>{
    const offset=(segment*20+i)*frameBytes;
    const input=await sharp(motion.stdout.subarray(offset,offset+frameBytes),{raw:{width:480,height:270,channels:3}}).png().toBuffer();
    return {input,left:i%4*480,top:Math.floor(i/4)*270};
  }));
  await sharp({create:{width:1920,height:1350,channels:3,background:'#070c16'}}).composite(tiles).png().toFile(`out/motion-${segment+1}.png`);
}
writeFileSync('out/media-verification.json',JSON.stringify({metadata,fullDecode:'pass',blankFrames:black,blankMethod:'All 1800 frames downscaled to 160x90 grayscale; reject frames with no pixel above 70/255',deterministicFrame1000:hash('out/determinism-a.png')},null,2)+'\n');
console.log('PASS: H.264/yuv420p, 1920x1080, 60fps, 1800 decoded frames, 30s, silent, full decode, black-frame scan, deterministic still.');
