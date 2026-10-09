import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FilmSchema} from '../src/schema';
export function readFilm(path='data/film.json') {
  const film=FilmSchema.parse(JSON.parse(readFileSync(path,'utf8')));
  const font=`public/${film.assets.font}`;
  if (!existsSync(font)) throw new Error(`素材がありません: ${font}`);
  const expected=readFileSync('public/fonts/SHA256SUMS','utf8').trim().split(/\s+/)[0];
  const actual=createHash('sha256').update(readFileSync(font)).digest('hex');
  if (actual!==expected) throw new Error('固定フォントのハッシュが一致しません');
  return film;
}
