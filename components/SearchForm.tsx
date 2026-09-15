import React, { useEffect, useRef, useState } from 'react';
import { SongDetails } from '../types';
import { fetchTopSongs } from '../services/itunesService';

interface SearchFormProps {
  onSearch: (details: SongDetails) => void;
  onClear: () => void;
  isLoading: boolean;
  showExamples: boolean;
}

const FALLBACK_SONGS: SongDetails[] = [
  { songName: 'APT.', artistName: 'ROSÉ & Bruno Mars', isExample: true },
  { songName: 'Beautiful Things', artistName: 'Benson Boone', isExample: true },
  { songName: 'Good Luck, Babe!', artistName: 'Chappell Roan', isExample: true },
  { songName: 'Espresso', artistName: 'Sabrina Carpenter', isExample: true },
];

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, onClear, isLoading, showExamples }) => {
  const [songName, setSongName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [exampleSongs, setExampleSongs] = useState(FALLBACK_SONGS);
  const [chartDate, setChartDate] = useState<string | undefined>();
  const prevSongRef = useRef(songName);
  const hasSongTitle = songName.trim().length > 0;
  const showTitleError = titleTouched && !hasSongTitle;

  useEffect(() => {
    if (!showExamples) return;

    let isCurrent = true;
    fetchTopSongs()
      .then(({ songs, updatedAt }) => {
        if (!isCurrent || songs.length === 0) return;
        setExampleSongs(songs);
        setChartDate(updatedAt);
      })
      .catch(() => {
        // Keep the fallback examples available when the public chart feed is unavailable.
      });

    return () => {
      isCurrent = false;
    };
  }, [showExamples]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSongTitle) {
      onSearch({ songName, artistName });
    }
  };

  const handleExampleClick = (example: SongDetails) => {
    setSongName(example.songName);
    setArtistName(example.artistName);
    onSearch({ ...example, isExample: true });
  };

  return (
    <div className="sticky top-4 z-20 w-full max-w-xl mx-auto mb-8">
      <form 
        onSubmit={handleSubmit} 
        className="flex flex-col sm:flex-row gap-4 clay-card p-4"
      >
        <div className="flex-1">
          <input
            type="text"
            placeholder="Song name (e.g. Hey Jude)"
            value={songName}
            onChange={(e) => {
              const newVal = e.target.value;
              if (prevSongRef.current && !newVal) {
                onClear();
              }
              prevSongRef.current = newVal;
              setSongName(newVal);
            }}
            onBlur={() => setTitleTouched(true)}
            className={`w-full clay-inset px-4 py-3 text-sm focus:outline-none placeholder-slate-400 ${showTitleError ? 'border border-red-300' : ''}`}
            aria-invalid={showTitleError}
            aria-describedby={showTitleError ? 'song-title-error' : undefined}
            required
          />
        </div>
        <input
          type="text"
          placeholder="Artist (Optional)"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          className="flex-1 clay-inset px-4 py-3 text-sm focus:outline-none placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={isLoading || !hasSongTitle}
          className="clay-button px-6 py-3 min-w-[100px] flex items-center justify-center"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            'Visualize'
          )}
        </button>
      </form>
      {showTitleError && (
        <p id="song-title-error" className="mt-3 text-center text-xs font-bold text-red-500">
          Enter a song title to continue.
        </p>
      )}
      {showExamples && !showTitleError && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2" aria-label="Example songs">
          <span className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {chartDate ? `Apple Music · ${new Date(chartDate).toLocaleDateString()}` : 'Apple Music · Top songs'}
          </span>
          {exampleSongs.map((example) => (
            <button
              key={example.songName}
              type="button"
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="clay-button px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {example.songName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchForm;