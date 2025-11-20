import React, { useState } from 'react';
import { SongDetails } from '../types';

interface SearchFormProps {
  onSearch: (details: SongDetails) => void;
  isLoading: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading }) => {
  const [songName, setSongName] = useState('');
  const [artistName, setArtistName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (songName.trim()) {
      onSearch({ songName, artistName });
    }
  };

  return (
    <div className="sticky top-4 z-20 w-full max-w-xl mx-auto mb-8">
      <form 
        onSubmit={handleSubmit} 
        className="flex flex-col sm:flex-row gap-4 clay-card p-4"
      >
        <input
          type="text"
          placeholder="Song name (e.g. Hey Jude)"
          value={songName}
          onChange={(e) => setSongName(e.target.value)}
          className="flex-1 clay-inset px-4 py-3 text-sm focus:outline-none placeholder-slate-400"
          required
        />
        <input
          type="text"
          placeholder="Artist (Optional)"
          value={artistName}
          onChange={(e) => setArtistName(e.target.value)}
          className="flex-1 clay-inset px-4 py-3 text-sm focus:outline-none placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={isLoading}
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
    </div>
  );
};

export default SearchForm;