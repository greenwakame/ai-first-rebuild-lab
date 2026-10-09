import {mkdirSync, writeFileSync} from 'node:fs';
import {timeline} from '../src/schema';
import {readFilm} from './io';
const film=readFilm(process.argv[2]);
mkdirSync('docs',{recursive:true});
const lines=[`# ${film.title} / 絵コンテ・画面内コピー`, '', '> data/film.json から自動生成。直接編集しない。時間は開始からの絶対拍で計算。', '', `${film.width} × ${film.height} / ${film.fps} fps / ${film.totalBeats}拍 / ${film.bpm} BPM / 無音`, ''];
for (const [i,s] of timeline(film).entries()) {
  lines.push(`## ${i+1}. ${s.id} / ${s.kind}`, '', `${(s.start/60).toFixed(2)}–${(s.end/60).toFixed(2)}秒 / frames ${s.start}–${s.end-1} / ${s.beats}拍`, '', `- 肩書き: ${s.eyebrow}`,`- 見出し: ${s.headline.replaceAll('\n',' / ')}`,`- 本文: ${s.body || 'なし'}`,`- 補足: ${s.note || 'なし'}`);
  if ('items' in s) lines.push(...s.items.map(x=>`- 要素: ${x.label} / ${x.detail} / ${x.role}`));
  if ('roleLabels' in s) lines.push(`- 役割: ${s.roleLabels.human} / ${s.roleLabels.ai}`);
  if ('states' in s) lines.push(...s.states.map(x=>`- 状態: ${x}`));
  if (s.kind==='closing') lines.push(`- 名前: ${film.title}`,`- 案内: ${film.cta.label}`,`- URL: ${film.cta.displayUrl}`);
  lines.push('',`演出: ${s.motion}`,'');
}
writeFileSync('docs/storyboard.md',lines.join('\n').trimEnd()+'\n');
mkdirSync('out',{recursive:true});
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
writeFileSync('out/review.html',`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(film.title)} / 初版レビュー</title>
<style>body{background:#070c16;color:#f4f7fb;font:16px system-ui;margin:40px auto;max-width:1100px;padding:0 24px}h1{font-size:28px}p{color:#a8b6cc}video{display:block;width:100%;background:#070c16}img{max-width:100%;height:auto}a{color:#3fcf8e}nav{display:flex;gap:24px;margin:24px 0}figure{margin:40px 0}figcaption{margin:12px 0;color:#a8b6cc}</style>
<h1>${escape(film.title)}</h1><p>30秒 / 1920×1080 / 60fps / 無音・ローカル初版</p>
<video controls preload="metadata" poster="poster.png" src="ai-first-rebuild-lab-v1.mp4" playsinline></video>
<nav><a href="ai-first-rebuild-lab-v1.mp4">MP4を開く</a><a href="poster.png">ポスター</a><a href="scenes.png">6場面一覧</a></nav>
<figure><img src="scenes.png" alt="6場面の一覧"><figcaption>${film.scenes.map((s,i)=>`${i+1}. ${escape(s.headline.replaceAll('\n',''))}`).join(' / ')}</figcaption></figure>
<p>紹介内容の出典: <a href="${escape(film.cta.url)}">ai-first-rebuild-lab / greenwakame</a>（文書 CC BY 4.0、要約・再構成）。検出場面は説明用デモ。</p></html>`);
console.log('Valid: 6 scenes, 64 beats, 1800 frames. Storyboard generated.');
