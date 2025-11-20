import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const fetchLyrics = async (song: string, artist: string): Promise<{ lyrics: string, coverArt?: string }> => {
  if (!apiKey) {
    throw new Error("API Key is missing in environment variables.");
  }

  // Construct a natural language query
  const songDetail = artist.trim() ? `"${song}" by "${artist}"` : `"${song}"`;

  const prompt = `
    Find the lyrics for the song ${songDetail}. 
    Also search for the official album cover art URL for this song.

    Output format:
    1. Start with "LYRICS_START"
    2. Print the lyrics text (no markdown, no extra headers)
    3. End lyrics with "LYRICS_END"
    4. On a new line, print "IMAGE_URL: " followed by the direct URL to the album cover image.
    
    If you cannot find an image, do not print the IMAGE_URL line.
    If the song is instrumental, print "[Instrumental]" as the lyrics.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable search to find the album cover
      }
    });

    let text = response.text;

    if (!text) {
        throw new Error("No content generated.");
    }

    // Parse the response
    let lyrics = "";
    let coverArt = undefined;

    // Extract Lyrics
    const lyricsMatch = text.match(/LYRICS_START([\s\S]*?)LYRICS_END/);
    if (lyricsMatch && lyricsMatch[1]) {
        lyrics = lyricsMatch[1].trim();
    } else {
        // Fallback if strict format fails, just take the whole text if it looks like lyrics
        // But remove the IMAGE_URL line if it exists
        lyrics = text.replace(/IMAGE_URL:.*$/, '').trim();
    }

    // Extract Image URL
    const imageMatch = text.match(/IMAGE_URL:\s*(https?:\/\/[^\s]+)/);
    if (imageMatch && imageMatch[1]) {
        coverArt = imageMatch[1];
    }

    // Clean up common markdown artifacts
    lyrics = lyrics.replace(/^```(text|markdown)?\n?/i, '').replace(/```$/, '').trim();

    // Validation
    if (!lyrics || (lyrics.length < 20 && !lyrics.toLowerCase().includes('instrumental'))) {
      if (text && (text.includes("cannot") || text.includes("unable to"))) {
         throw new Error("Lyrics restricted by AI safety filters.");
      }
      throw new Error("Lyrics not found for this song.");
    }

    return { lyrics, coverArt };
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    if (error instanceof Error) {
       throw error;
    }
    throw new Error("Failed to fetch lyrics.");
  }
};