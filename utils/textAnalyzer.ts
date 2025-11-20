import { WordFrequency } from '../types';

export const analyzeText = (text: string): { wordData: WordFrequency[], sequence: string[] } => {
  // 1. Normalize text: lowercase, remove punctuation (keep apostrophes inside words roughly, or strip them)
  // Strategy: replace non-alphanumeric characters (except spaces and apostrophes) with space.
  const cleanText = text.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ');

  // 2. Split into words
  const words = cleanText.split(/\s+/).filter(w => w.trim().length > 0);

  // 3. Count frequencies and build sequence
  // Note: We are now including "stop words" (common words) as per request to show full repetition structure.
  const counts: Record<string, number> = {};
  const sequence: string[] = [];
  let maxCount = 0;

  words.forEach(word => {
    // Remove leading/trailing apostrophes
    const sanitizedWord = word.replace(/^'+|'+$/g, '');
    
    if (sanitizedWord) {
      sequence.push(sanitizedWord);
      counts[sanitizedWord] = (counts[sanitizedWord] || 0) + 1;
      if (counts[sanitizedWord] > maxCount) {
        maxCount = counts[sanitizedWord];
      }
    }
  });

  // 4. Convert to array and sort
  const wordData: WordFrequency[] = Object.entries(counts).map(([word, count]) => ({
    word,
    count,
    frequency: maxCount > 0 ? count / maxCount : 0,
  }));

  // Sort by count (descending)
  wordData.sort((a, b) => b.count - a.count);

  return { wordData, sequence };
};