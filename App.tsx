import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import SearchForm from './components/SearchForm';
import Heatmap from './components/Heatmap';
import { fetchLyrics } from './services/geminiService';
import { analyzeText } from './utils/textAnalyzer';
import { AppState, LyricsResult, SongDetails } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<LyricsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSearch = useCallback(async (details: SongDetails) => {
    setAppState(AppState.LOADING);
    setErrorMsg('');
    setResult(null);

    try {
      const { lyrics, coverArt } = await fetchLyrics(details.songName, details.artistName);
      const { wordData, sequence } = analyzeText(lyrics);
      
      setResult({
        lyrics,
        wordData,
        sequence,
        coverArt,
        songName: details.songName,
        artistName: details.artistName
      });
      setAppState(AppState.SUCCESS);
    } catch (error: any) {
      setAppState(AppState.ERROR);
      setErrorMsg(error.message || "Failed to load lyrics. Please try again.");
    }
  }, []);

  return (
    <div className="container mx-auto px-4 pb-12 min-h-screen flex flex-col">
      <Header />
      
      <SearchForm onSearch={handleSearch} isLoading={appState === AppState.LOADING} />

      <main className="flex-1 w-full max-w-6xl mx-auto">
        {appState === AppState.ERROR && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center mb-8 shadow-sm">
            {errorMsg}
          </div>
        )}

        {appState === AppState.SUCCESS && result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
            {/* Heatmap Section */}
            <section className="flex flex-col gap-4 order-1 lg:order-1">
              <div className="flex items-center justify-between px-4">
                 <h2 className="text-xl font-bold text-slate-700">Repetition Matrix</h2>
                 <span className="text-xs font-medium px-2 py-1 bg-slate-200 text-slate-600 rounded-lg">
                    {result.sequence.length} words
                 </span>
              </div>
              <Heatmap 
                sequence={result.sequence} 
                wordData={result.wordData} 
                coverArt={result.coverArt}
                songName={result.songName}
                artistName={result.artistName}
              />
            </section>

            {/* Original Lyrics Section */}
            <section className="flex flex-col gap-4 order-2 lg:order-2">
               <div className="px-4">
                  <h2 className="text-xl font-bold text-slate-700">Lyrics Source</h2>
               </div>
              <div className="clay-card p-6 h-[600px] md:h-[780px] flex flex-col">
                <div className="clay-inset p-6 h-full overflow-y-auto text-slate-600 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {result.lyrics}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;