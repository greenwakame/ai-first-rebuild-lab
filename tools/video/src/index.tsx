import {Composition, registerRoot} from 'remotion';
import raw from '../data/film.json';
import {FilmSchema} from './schema';
import {FilmVideo} from './video';

const film = FilmSchema.parse(raw);
function Root() {
  return <Composition id="RebuildLab" component={FilmVideo} width={1920} height={1080} fps={60} durationInFrames={1800}
    defaultProps={{film}} calculateMetadata={({props}) => ({props: {film: FilmSchema.parse(props.film)}})}/>;
}
registerRoot(Root);
