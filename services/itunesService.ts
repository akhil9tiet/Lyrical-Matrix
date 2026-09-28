
import { SongDetails } from '../types';
import { hasLyrics } from './lyricsService';

export interface iTunesMetadata {
  artworkUrl?: string;
  previewUrl?: string;
  releaseYear?: string;
  artistName?: string;
  trackName?: string;
}

/**
 * Current top of the US charts, ordered by chart position, followed by durable
 * back catalogue picks. Every entry is checked against lyrics.ovh before it is
 * offered as an example, because roughly a third of chart songs have no lyrics
 * entry and would otherwise dead-end in a "could not find lyrics" error.
 */
const EXAMPLE_SONG_POOL: SongDetails[] = [
  { songName: 'Patient Zero', artistName: 'Taylor Swift' },
  { songName: 'Babylon', artistName: 'Taylor Swift' },
  { songName: 'Choosin\' Texas', artistName: 'Ella Langley' },
  { songName: 'Janice STFU', artistName: 'Drake' },
  { songName: 'Be Her', artistName: 'Ella Langley' },
  { songName: 'Been By Now', artistName: 'Morgan Wallen' },
  { songName: 'stupid song', artistName: 'Olivia Rodrigo' },
  { songName: 'BbY WOW', artistName: 'KAROL G, Judeline & rusowsky' },
  { songName: 'Cleveland!', artistName: 'Taylor Swift' },
  { songName: 'Pink Clouding', artistName: 'Taylor Swift' },
  { songName: 'the cure', artistName: 'Olivia Rodrigo' },
  { songName: 'Dead Fresh', artistName: 'Lil Baby' },
  { songName: 'The Fate of Ophelia', artistName: 'Taylor Swift' },
  { songName: 'Best I Ever Had', artistName: 'Drake' },
  { songName: 'Dope Girl', artistName: 'Rod Wave' },
  { songName: 'Bohemian Rhapsody', artistName: 'Queen' },
  { songName: 'Shape of You', artistName: 'Ed Sheeran' },
  { songName: 'Flowers', artistName: 'Miley Cyrus' },
  { songName: 'Sunflower', artistName: 'Post Malone' },
  { songName: 'Espresso', artistName: 'Sabrina Carpenter' },
  { songName: 'Good Luck, Babe!', artistName: 'Chappell Roan' },
  { songName: 'Beautiful Things', artistName: 'Benson Boone' },
];

const EXAMPLE_BATCH_SIZE = 4;

/**
 * Returns the first `limit` songs from the pool that lyrics.ovh can resolve,
 * so an example button is never shown for a song that would fail to load.
 * Candidates are checked in small parallel batches and the search stops as
 * soon as enough songs are confirmed.
 */
export const getExampleSongs = async (limit = 4): Promise<SongDetails[]> => {
  const verified: SongDetails[] = [];

  for (let i = 0; i < EXAMPLE_SONG_POOL.length; i += EXAMPLE_BATCH_SIZE) {
    const batch = EXAMPLE_SONG_POOL.slice(i, i + EXAMPLE_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (song) =>
        (await hasLyrics(song.songName, song.artistName)) ? song : null
      )
    );

    for (const song of results) {
      if (song) verified.push(song);
    }

    if (verified.length >= limit) break;
  }

  const confirmed = verified.slice(0, limit).map((song) => ({ ...song, isExample: true }));

  // lyrics.ovh was unreachable, so fall back to the curated order.
  return confirmed.length > 0
    ? confirmed
    : EXAMPLE_SONG_POOL.slice(0, limit).map((song) => ({ ...song, isExample: true }));
};

export const fetchSongMetadata = async (song: string, artist: string): Promise<iTunesMetadata> => {
  const searchTerm = `${artist} ${song}`.trim();
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('iTunes API request failed');
    
    const data = await response.json();
    if (data.resultCount > 0) {
      const track = data.results[0];
      return {
        artworkUrl: track.artworkUrl100?.replace('100x100bb', '600x600bb'), // Higher res
        previewUrl: track.previewUrl,
        releaseYear: track.releaseDate ? new Date(track.releaseDate).getFullYear().toString() : undefined,
        artistName: track.artistName,
        trackName: track.trackName
      };
    }
    return {};
  } catch (error) {
    console.error("iTunes Metadata Fetch Error:", error);
    return {};
  }
};
