import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FilmSchema, beatFrame, timeline} from '../src/schema';
const raw=JSON.parse(readFileSync('data/film.json','utf8'));
const valid=FilmSchema.parse(raw);
assert.equal(timeline(valid).at(-1)?.end,1800);
assert.equal(beatFrame(1),28); assert.equal(beatFrame(8),225); assert.equal(beatFrame(64),1800);
// Test malformed JSON shapes, not implementation internals.
const cases: Array<[string,(x: typeof raw)=>void]> = [
  ['missing title', x=>delete x.title],
  ['unsupported scene', x=>x.scenes[0].kind='script'],
  ['duplicate ID',x=>x.scenes[1].id=x.scenes[0].id],
  ['negative duration',x=>x.scenes[0].beats=-1],
  ['fraction duration',x=>x.scenes[0].beats=8.5],
  ['wrong total',x=>x.scenes[0].beats=9],
  ['long headline',x=>x.scenes[0].headline='長'.repeat(60)],
  ['long card',x=>x.scenes[0].items[0].label='長'.repeat(30)],
  ['remote asset',x=>x.assets.font='https://example.com/font.ttf'],
  ['path traversal',x=>x.assets.font='../font.ttf'],
  ['HTML',x=>x.scenes[0].headline='<script/>'],
  ['executable field',x=>x.scenes[0].code='alert(1)'],
  ['mismatched URL',x=>x.cta.displayUrl='example.com'],
  ['wrong fps',x=>x.fps=30],
];
for (const [name,mutate] of cases) {
  const data=structuredClone(raw);mutate(data);
  assert.equal(FilmSchema.safeParse(data).success,false,name);
}
const variant=structuredClone(raw);variant.scenes[0].headline='機能から、作り直す。';variant.theme.mint='#6ee7b7';
assert.equal(FilmSchema.safeParse(variant).success,true);
console.log(`PASS: canonical + variant; ${cases.length} invalid cases; absolute beat timing`);
