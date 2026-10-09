import {z} from 'zod';

const text = (max: number) => z.string().max(max).regex(/^[^<>]*$/u, 'HTMLは使用できません');
const units = (s: string) => [...s].reduce((n,c) => n + (/^[\x20-\x7e]$/.test(c) ? .65 : 1),0);
const item = z.object({label: text(12).min(1).refine(s=>units(s)<=6,'要素名は全角6文字相当以内'), detail: text(14).min(1).refine(s=>units(s)<=9.5,'要素の補足が長すぎます'), role: z.enum(['neutral', 'ai', 'human'])}).strict();
const common = {
  id: z.string().regex(/^[a-z][a-z0-9-]{1,39}$/), beats: z.number().int().min(8).max(24),
  eyebrow: text(36).min(1), headline: text(40).min(1).refine(s => s.split('\n').length <= 2 && s.split('\n').every(l => l.length <= 20), '見出しは20文字×2行以内'),
  body: text(36), note: text(48), motion: text(120).min(1),
};
const SceneSchema = z.discriminatedUnion('kind', [
  z.object({...common, kind: z.literal('problem'), items: z.array(item).length(4)}).strict(),
  z.object({...common, kind: z.literal('boundaries'), items: z.array(item).length(4)}).strict(),
  z.object({...common, kind: z.literal('flow'), items: z.array(item).length(4), roleLabels: z.object({human: text(4).min(1), ai: text(4).min(1)}).strict()}).strict(),
  z.object({...common, kind: z.literal('trace'), items: z.array(item).length(4), states: z.array(text(24).min(1)).length(3)}).strict(),
  z.object({...common, kind: z.literal('statement')}).strict(),
  z.object({...common, kind: z.literal('closing')}).strict(),
]);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const publicUrl = z.string().url().refine(s => /^https:\/\/greenwakame\.github\.io\/ai-first-rebuild-lab\//.test(s), '確認済みの公開サイトURLのみ');
export const FilmSchema = z.object({
  title: text(32).min(1), fps: z.literal(60), width: z.literal(1920), height: z.literal(1080),
  bpm: z.literal(128), totalBeats: z.literal(64),
  theme: z.object({background: color, surface: color, text: color, muted: color, mint: color, sky: color, iris: color, violet: color, warning: color}).strict(),
  assets: z.object({font: z.literal('fonts/NotoSansJP.ttf')}).strict(),
  cta: z.object({label: text(18).min(1), displayUrl: text(58).min(1).regex(/^[a-zA-Z0-9./#-]+$/), url: publicUrl, diagramsUrl: publicUrl, joinUrl: publicUrl}).strict(),
  scenes: z.array(SceneSchema).length(6),
}).strict().superRefine((film, ctx) => {
  if (new Set(film.scenes.map(s => s.id)).size !== film.scenes.length) ctx.addIssue({code: 'custom', path: ['scenes'], message: '場面IDが重複しています'});
  if (film.scenes.reduce((n,s) => n+s.beats,0) !== film.totalBeats) ctx.addIssue({code: 'custom', path: ['scenes'], message: '合計は64拍・1800フレーム・30秒にしてください'});
  for (const [i,s] of film.scenes.entries()) {
    if (!['statement','closing'].includes(s.kind) && s.headline.includes('\n')) ctx.addIssue({code: 'custom', path: ['scenes',i,'headline'], message: '図解場面の見出しは1行以内'});
    const max = ['statement','closing'].includes(s.kind) ? 14 : 18;
    if (s.headline.split('\n').some(line=>units(line)>max)) ctx.addIssue({code:'custom',path:['scenes',i,'headline'],message:`見出しの幅が上限（全角${max}文字相当）を超えています`});
  }
  if (film.cta.displayUrl !== film.cta.url.replace('https://','').replace(/\/$/,'')) ctx.addIssue({code:'custom', path:['cta','displayUrl'], message:'表示URLと案内URLが一致しません'});
});
export type Film = z.infer<typeof FilmSchema>;
export type Scene = Film['scenes'][number];
// Absolute beats are converted once, never accumulate rounded beat lengths.
export const beatFrame = (beat: number) => Math.round(beat * 60 * 60 / 128);
export function timeline(film: Film) {
  let beat = 0;
  return film.scenes.map(scene => {
    const start = beatFrame(beat);
    beat += scene.beats;
    return {...scene, start, end: beatFrame(beat)};
  });
}
