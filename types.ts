
export interface WordFrequency {
  word: string;
  count: number;
  frequency: number; // Normalized 0-1 relative to max
}

export interface SongDetails {
  songName: string;
  artistName: string;
}

export interface LyricsResult {
  lyrics: string;
  wordData: WordFrequency[];
  sequence: string[]; // Ordered list of words
  totalWordCount: number; // Total count
  coverArt?: string;
  songName?: string;
  artistName?: string;
  releaseYear?: string;
  previewUrl?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}
