export interface LyricsResponse {
  lyrics: string;
  source: 'api';
}

/**
 * Fetches lyrics from lyrics.ovh.
 */
export const getLyrics = async (
  song: string, 
  artist: string, 
  onStatus: (msg: string) => void
): Promise<LyricsResponse> => {
  onStatus("Checking primary lyrics database...");
  
  const artistParam = encodeURIComponent(artist || 'unknown');
  const songParam = encodeURIComponent(song);
  const url = `https://api.lyrics.ovh/v1/${artistParam}/${songParam}`;
  
  try {
    const response = await fetch(url);
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
