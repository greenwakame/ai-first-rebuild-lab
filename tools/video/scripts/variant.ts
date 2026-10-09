import {mkdirSync,writeFileSync} from 'node:fs';
import {readFilm} from './io';
const film=readFilm();
film.scenes[0].headline='機能から、作り直す。';
film.theme.mint='#6ee7b7';film.theme.sky='#60a5fa';
mkdirSync('out',{recursive:true});
writeFileSync('out/variant.json',JSON.stringify(film,null,2));
