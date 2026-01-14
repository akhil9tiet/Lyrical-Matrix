
import { WordFrequency } from '../types';

export const analyzeText = (text: string): { wordData: WordFrequency[], sequence: string[], totalWordCount: number } => {
  if (!text) return { wordData: [], sequence: [], totalWordCount: 0 };

  // 1. Get raw word count for statistics
  const rawWords = text.trim().split(/\s+/).filter(w => w.length > 0);
  const totalWordCount = rawWords.length;

  // 2. Normalize: lowercase and remove punctuation except internal apostrophes
  const cleanText = text.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ');

  // 3. Process all words without filtering stop words
  const words = cleanText.split(/\s+/).filter(w => w.trim().length > 0);
  const counts: Record<string, number> = {};
  const sequence: string[] = [];
  let maxCount = 0;

  words.forEach(word => {
    // Trim leading/trailing apostrophes from the word itself
    const sanitized = word.replace(/^'+|'+$/g, '');
    if (sanitized) {
      sequence.push(sanitized);
      counts[sanitized] = (counts[sanitized] || 0) + 1;
      if (counts[sanitized] > maxCount) maxCount = counts[sanitized];
    }
  });

  // 4. Transform to frequency objects
  const wordData: WordFrequency[] = Object.entries(counts).map(([word, count]) => ({
    word,
    count,
    frequency: maxCount > 0 ? count / maxCount : 0,
  }));

  // Sort by popularity
  wordData.sort((a, b) => b.count - a.count);

  return { wordData, sequence, totalWordCount };
};
