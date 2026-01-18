
import { fetchLyrics as fetchLyricsGemini } from './geminiService';

export interface LyricsResponse {
  lyrics: string;
  source: 'api' | 'gemini';
}

/**
 * Fetches lyrics from lyrics.ovh with a fallback to Gemini AI for better accuracy
 * and finding difficult-to-locate tracks (like remixes or rare versions).
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
    console.warn("Primary API failed, falling back to AI search...");
  }

  // Fallback to Gemini if API fails or lyrics not found
  onStatus("Performing deep search for lyrics...");
  try {
    const aiResult = await fetchLyricsGemini(song, artist);
    if (aiResult.lyrics && aiResult.lyrics !== "[Instrumental]") {
      return {
        lyrics: aiResult.lyrics,
        source: 'gemini'
      };
    } else if (aiResult.lyrics === "[Instrumental]") {
        return {
            lyrics: "[Instrumental]",
            source: 'gemini'
        }
    }
    throw new Error("No lyrics found even with deep search.");
  } catch (err: any) {
    console.error("Lyrics Retrieval Error:", err);
    throw new Error(`Could not find lyrics for "${song}". Please check the title and artist name.`);
  }
};
