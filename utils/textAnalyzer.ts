
import { WordFrequency } from '../types';

export const analyzeText = (text: string): { wordData: WordFrequency[], sequence: string[], totalWordCount: number } => {
  if (!text || /^\s*\[instrumental\]\s*$/i.test(text)) {
    return { wordData: [], sequence: [], totalWordCount: 0 };
  }

  // Keep every lyric word. Punctuation separates words, while apostrophes inside
  // contractions remain part of the token (for example, "ain't").
  const words: string[] = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || [];
  const counts: Record<string, number> = {};
  const sequence: string[] = [];
  let maxCount = 0;

  words.forEach(word => {
    const normalized = word.toLowerCase().replace(/’/g, "'");
    sequence.push(normalized);
    counts[normalized] = (counts[normalized] || 0) + 1;
    if (counts[normalized] > maxCount) maxCount = counts[normalized];
  });

  const wordData: WordFrequency[] = Object.entries(counts).map(([word, count]) => ({
    word,
    count,
    frequency: maxCount > 0 ? count / maxCount : 0,
  }));

  // Sort by popularity
  wordData.sort((a, b) => b.count - a.count);

  return { wordData, sequence, totalWordCount: sequence.length };
};
