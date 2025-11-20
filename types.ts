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
  sequence: string[]; // Ordered list of words after filtering
  coverArt?: string;
  songName?: string;
  artistName?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}