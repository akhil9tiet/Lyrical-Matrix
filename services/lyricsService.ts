export interface LyricsResponse {
  lyrics: string;
  source: 'api';
}

const lyricsUrl = (song: string, artist: string): string => {
  const artistParam = encodeURIComponent(artist || 'unknown');
  const songParam = encodeURIComponent(song);
  return `https://api.lyrics.ovh/v1/${artistParam}/${songParam}`;
};

/**
 * Checks whether lyrics.ovh actually has an entry for a song.
 */
export const hasLyrics = async (song: string, artist: string): Promise<boolean> => {
  try {
    const response = await fetch(lyricsUrl(song, artist));
    if (!response.ok) return false;
    const data = await response.json();
    return typeof data?.lyrics === 'string' && data.lyrics.trim().length > 0;
  } catch (err) {
    return false;
  }
};

/**
 * Fetches lyrics from lyrics.ovh.
 */
export const getLyrics = async (
  song: string, 
  artist: string, 
  onStatus: (msg: string) => void
): Promise<LyricsResponse> => {
  onStatus("Checking primary lyrics database...");

  try {
    const response = await fetch(lyricsUrl(song, artist));
    if (response.ok) {
      const data = await response.json();
      if (data.lyrics) {
        return {
          lyrics: data.lyrics.trim(),
          source: 'api'
        };
      }
    }
  } catch (err) {
    console.error("Lyrics Retrieval Error:", err);
  }

  throw new Error(`Could not find lyrics for "${song}". Please check the title and artist name.`);
};
