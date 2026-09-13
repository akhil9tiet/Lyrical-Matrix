import React, { useState } from 'react';
import { SongDetails } from '../types';

interface SearchFormProps {
  onSearch: (details: SongDetails) => void;
  isLoading: boolean;
  showExamples: boolean;
}

const EXAMPLE_SONGS: SongDetails[] = [
  { songName: 'Hotel California', artistName: 'Eagles' },
  { songName: 'Yellow', artistName: 'Coldplay' },
  { songName: "Ain't No Sunshine", artistName: 'Bill Withers' },
  { songName: "It's My Life", artistName: 'Talk Talk' },
];

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading, showExamples }) => {
  const [songName, setSongName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const hasSongTitle = songName.trim().length > 0;
  const showTitleError = titleTouched && !hasSongTitle;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSongTitle) {
      onSearch({ songName, artistName });
    }
  };

  const handleExampleClick = (example: SongDetails) => {
    setSongName(example.songName);
    setArtistName(example.artistName);
    onSearch(example);
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
            onChange={(e) => setSongName(e.target.value)}
            onBlur={() => setTitleTouched(true)}
            className={`w-full clay-inset px-4 py-3 text-sm focus:outline-none placeholder-slate-400 ${showTitleError ? 'border border-red-300' : ''}`}
            aria-invalid={showTitleError}
            aria-describedby={showTitleError ? 'song-title-error' : undefined}
            required
          />
          {showTitleError && (
            <p id="song-title-error" className="mt-1 px-2 text-xs font-bold text-red-500">
              Enter a song title to continue.
            </p>
          )}
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
      {showExamples && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2" aria-label="Example songs">
          <span className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Try an example
          </span>
          {EXAMPLE_SONGS.map((example) => (
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