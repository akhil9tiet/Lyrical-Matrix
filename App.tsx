
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Header from './components/Header';
import SearchForm from './components/SearchForm';
import Heatmap from './components/Heatmap';
import { getLyrics } from './services/lyricsService';
import { fetchSongMetadata } from './services/itunesService';
import { analyzeText } from './utils/textAnalyzer';
import { 
  initAnalytics, 
  trackSongSearch, 
  trackSongView, 
  trackSongSearchError, 
  trackVisibleSections 
} from './services/analytics';
import { AppState, LyricsResult, SongDetails } from './types';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [loadingMsg, setLoadingMsg] = useState<string>('');
  const [result, setResult] = useState<LyricsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isZoomedOut, setIsZoomedOut] = useState(false);
  const [zoomOutScale, setZoomOutScale] = useState(0.8);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const mountedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
  }, []);

  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (appState !== AppState.SUCCESS || !containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const contentHeight = el.scrollHeight || viewport.height;
      const target = (viewport.height * 0.9) / contentHeight;
      setZoomOutScale(Math.min(0.95, Math.max(0.5, target)));
    };
    measure();
    setIsZoomedOut(true);
  }, [appState, viewport, result]);

  const handleClear = useCallback(() => {
    setAppState(AppState.IDLE);
    setResult(null);
    setErrorMsg('');
    setIsZoomedOut(false);
  }, []);

  const handleSearch = useCallback(async (details: SongDetails) => {
    setAppState(AppState.LOADING);
    setLoadingMsg('Initiating song analysis...');
    setErrorMsg('');
    setResult(null);

    // Track search telemetry in GA4
    trackSongSearch(details.songName, details.artistName, !!details.isExample);

    try {
      // 1. Fetch Metadata (iTunes) - Essential for validated names, artwork, and preview
      setLoadingMsg('Fetching track metadata...');
      const itunesData = await fetchSongMetadata(details.songName, details.artistName);

      // 2. Fetch Lyrics Directly
      // We use itunesData names if available for better API match accuracy
      const finalSongName = itunesData.trackName || details.songName;
      const finalArtistName = itunesData.artistName || details.artistName;

      const lyricsResponse = await getLyrics(
        finalSongName, 
        finalArtistName, 
        (status) => setLoadingMsg(status)
      );

      // 3. Analyze
      setLoadingMsg('Generating repetition matrix...');
      const { wordData, sequence, totalWordCount } = analyzeText(lyricsResponse.lyrics);
      
      setResult({
        lyrics: lyricsResponse.lyrics,
        wordData,
        sequence,
        totalWordCount,
        coverArt: itunesData.artworkUrl,
        songName: finalSongName,
        artistName: finalArtistName,
        releaseYear: itunesData.releaseYear,
        previewUrl: itunesData.previewUrl
      });
      setAppState(AppState.SUCCESS);
      setIsZoomedOut(true);

      // Track successful song view in GA4
      trackSongView({
        songName: finalSongName,
        artistName: finalArtistName,
        releaseYear: itunesData.releaseYear,
        totalWordCount,
        hasPreview: !!itunesData.previewUrl
      });

      // Refresh section tracking for dynamically rendered components
      setTimeout(() => trackVisibleSections(), 300);
    } catch (error: any) {
      setAppState(AppState.ERROR);
      const errText = error.message || "Something went wrong. Please try another song.";
      setErrorMsg(errText);
      
      // Track search error in GA4
      trackSongSearchError(details.songName, details.artistName, errText);
    }
  }, []);

const zoomScale = isZoomedOut
    ? zoomOutScale
    : Math.min(2.2, Math.max(1.15, viewport.height / 520));
  const zoomTransform = `scale(${zoomScale}) translateY(${isZoomedOut ? '0' : '6%'})`;

  return (
    <div 
      ref={containerRef}
      className={`zoom-container container mx-auto px-4 pb-12 min-h-screen flex flex-col${mountedRef.current ? ' zoom-transition' : ''}`}
      style={{ transform: zoomTransform }}
    >
      <Header />
      
      <SearchForm
        onSearch={handleSearch}
        onClear={handleClear}
        isLoading={appState === AppState.LOADING}
        showExamples={appState === AppState.IDLE}
      />

      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col items-center">
        {appState === AppState.LOADING && (
          <div className="flex flex-col items-center gap-6 mt-12 animate-pulse">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="clay-card px-8 py-4 text-slate-600 font-bold tracking-tight text-center">
              {loadingMsg}
            </div>
          </div>
        )}

        {appState === AppState.ERROR && (
          <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 text-center mb-8 shadow-sm font-black uppercase tracking-tight max-w-md">
            {errorMsg}
          </div>
        )}

        {appState === AppState.SUCCESS && result && (
          <div className="w-full animate-reveal-card">
            <Heatmap 
              sequence={result.sequence} 
              wordData={result.wordData} 
              totalWordCount={result.totalWordCount}
              lyrics={result.lyrics}
              coverArt={result.coverArt}
              songName={result.songName}
              artistName={result.artistName}
              releaseYear={result.releaseYear}
              previewUrl={result.previewUrl}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
