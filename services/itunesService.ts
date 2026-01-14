
export interface iTunesMetadata {
  artworkUrl?: string;
  previewUrl?: string;
  releaseYear?: string;
  artistName?: string;
  trackName?: string;
}

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
