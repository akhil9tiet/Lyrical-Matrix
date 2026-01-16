
export interface LyricsResponse {
  lyrics: string;
  source: 'api';
}

/**
 * Fetches lyrics directly from the lyrics.ovh API.
 * This replaces the previous multi-stage fallback logic that included LLM calls.
 */
export const getLyrics = async (
  song: string, 
  artist: string, 
  onStatus: (msg: string) => void
): Promise<LyricsResponse> => {
  onStatus("Fetching lyrics from database...");
  
  const artistParam = encodeURIComponent(artist || 'unknown');
  const songParam = encodeURIComponent(song);
  
  // Use lyrics.ovh as the direct source
  const url = `https://api.lyrics.ovh/v1/${artistParam}/${songParam}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Lyrics for "${song}" not found. Try adding/correcting the artist name.`);
      }
      throw new Error("Lyrics service is currently unavailable.");
    }
    
    const data = await response.json();
    
    if (data.lyrics) {
      // Basic cleanup for the common "Paroles de la chanson..." prefix in some results
      let cleanLyrics = data.lyrics.trim();
      return {
        lyrics: cleanLyrics,
        source: 'api'
      };
    }
    
    throw new Error("No lyrics found for this track.");
  } catch (err: any) {
    console.error("Lyrics Service Error:", err);
    throw new Error(err.message || "Failed to retrieve lyrics.");
  }
};
