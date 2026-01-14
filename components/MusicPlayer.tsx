
import React, { useState, useRef, useEffect } from 'react';

interface MusicPlayerProps {
  previewUrl: string;
  onToggle?: (isPlaying: boolean) => void;
  onAnalyserReady?: (analyser: AnalyserNode) => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ previewUrl, onToggle, onAnalyserReady }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onToggle?.(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', updateMetadata);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', updateMetadata);
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onToggle]);

  const initAudioContext = () => {
    if (audioContextRef.current || !audioRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    audioContextRef.current = ctx;
    sourceRef.current = source;
    
    if (onAnalyserReady) {
      onAnalyserReady(analyser);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    // Initialize AudioContext on first user interaction
    if (!audioContextRef.current) {
      initAudioContext();
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const nextState = !isPlaying;
    if (nextState) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
    setIsPlaying(nextState);
    onToggle?.(nextState);
  };

  const stopPlayback = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    onToggle?.(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col w-full mt-2 p-4 rounded-2xl bg-slate-50/30">
      <audio ref={audioRef} src={previewUrl} preload="auto" crossOrigin="anonymous" />
      
      <div className="flex items-center gap-6">
        <button 
          onClick={togglePlay}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-lg text-indigo-500 hover:text-indigo-600 transition-all active:scale-95"
          title={isPlaying ? "Pause" : "Play Preview"}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        <button 
          onClick={stopPlayback}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm text-slate-300 hover:text-slate-500 transition-all active:scale-90"
          title="Stop"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
        </button>

        <div className="flex-1 flex flex-col gap-2 relative">
          <div className="flex justify-between items-center text-[10px] font-black text-slate-400 tracking-widest uppercase">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || 30)}</span>
          </div>

          <div className="relative w-full h-1 bg-slate-200 rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1),inset_-1px_-1px_2px_rgba(255,255,255,0.8)]">
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border border-slate-100 shadow-[0_4px_10px_rgba(0,0,0,0.15),0_2px_4px_rgba(0,0,0,0.05)] transition-all duration-100 ease-linear z-10"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
            <div 
              className="absolute top-0 left-0 h-full bg-indigo-400/40 rounded-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
