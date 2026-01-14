
import { fetchLyrics as fetchGeminiLyrics } from './geminiService';

export interface LyricsResponse {
  lyrics: string;
  coverArt?: string;
  source: 'llm' | 'fallback';
}

export const getLyricsWithFallback = async (
  song: string, 
  artist: string, 
  onStatus: (msg: string) => void
): Promise<LyricsResponse> => {
  onStatus("Searching LLM for lyrics and artwork...");
  
  try {
    const geminiResult = await fetchGeminiLyrics(song, artist);
    if (geminiResult && geminiResult.lyrics && geminiResult.lyrics.length > 50) {
      return { ...geminiResult, source: 'llm' };
    }
    throw new Error("Lyrics too short or not found");
  } catch (err) {
    onStatus("LLM couldn't find lyrics, trying backup source...");
    
    // Fallback to lyrics.ovh
    const artistParam = encodeURIComponent(artist || 'unknown');
    const songParam = encodeURIComponent(song);
    const ovhUrl = `https://api.lyrics.ovh/v1/${artistParam}/${songParam}`;
    
    try {
      const response = await fetch(ovhUrl);
      if (!response.ok) throw new Error("Fallback failed");
      
      const data = await response.json();
      if (data.lyrics) {
        return {
          lyrics: data.lyrics,
          source: 'fallback'
        };
      }
      throw new Error("No lyrics in fallback response");
    } catch (fallbackErr) {
      throw new Error("Lyrics could not be found in any of our sources.");
    }
  }
};
