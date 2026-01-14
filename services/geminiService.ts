
import { GoogleGenAI } from "@google/genai";

export const fetchLyrics = async (song: string, artist: string): Promise<{ lyrics: string, coverArt?: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const songDetail = artist.trim() ? `"${song}" by "${artist}"` : `"${song}"`;

  const prompt = `
    Find the full lyrics for the song ${songDetail}. 
    Search for the lyrics and provide them clearly.
    Also find the official album cover art image URL.

    Output format:
    LYRICS_START
    [Insert lyrics here]
    LYRICS_END
    IMAGE_URL: [Insert URL here]
    
    If the song is instrumental, the lyrics should be "[Instrumental]".
    Ensure the output contains both the lyrics block and the image URL if available.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      }
    });

    const text = response.text;
    if (!text) {
      console.warn("Gemini returned empty text, checking candidates...");
      if (response.candidates && response.candidates.length > 0) {
        // Sometimes the text getter might fail if parts are weirdly structured
        const partText = response.candidates[0].content.parts.find(p => p.text)?.text;
        if (!partText) throw new Error("No content generated in any part.");
        return processResponse(partText);
      }
      throw new Error("No content generated.");
    }

    return processResponse(text);
  } catch (error) {
    console.error("Gemini service error:", error);
    throw error;
  }
};

function processResponse(text: string): { lyrics: string, coverArt?: string } {
  let lyrics = "";
  let coverArt = undefined;

  const lyricsMatch = text.match(/LYRICS_START([\s\S]*?)LYRICS_END/);
  if (lyricsMatch && lyricsMatch[1]) {
    lyrics = lyricsMatch[1].trim();
  } else {
    // Fallback parsing if formatting tags were ignored
    lyrics = text.replace(/IMAGE_URL:.*$/i, '').replace(/LYRICS_START|LYRICS_END/gi, '').trim();
  }

  const imageMatch = text.match(/IMAGE_URL:\s*(https?:\/\/[^\s]+)/i);
  if (imageMatch && imageMatch[1]) {
    coverArt = imageMatch[1];
  }

  // Final cleanup
  lyrics = lyrics.replace(/^```(text|markdown)?\n?/i, '').replace(/```$/, '').trim();

  return { lyrics, coverArt };
}
