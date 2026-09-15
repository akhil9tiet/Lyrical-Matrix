import React, { useState, useRef, useEffect } from 'react';
import { trackMusicPlayer } from '../services/analytics';
import { guess } from 'web-audio-beat-detector';

interface MusicPlayerProps {
  previewUrl: string;
  songName?: string;
  artistName?: string;
  onToggle?: (isPlaying: boolean) => void;
  onAnalyserReady?: (analyser: AnalyserNode) => void;
  onBeat?: (beat: { intensity: number; count: number }) => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ previewUrl, songName, artistName, onToggle, onAnalyserReady, onBeat }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const beatAnimationRef = useRef<number | null>(null);
  const beatGridRef = useRef<{ bpm: number; offset: number } | null>(null);
  const gridPhaseRef = useRef<number>(0);
  const gridIndexRef = useRef<number>(-1);
  const beatIntervalRef = useRef<number>(0);
  const beatCountRef = useRef(0);
  const lastBeatTimeRef = useRef(-Infinity);
  const fallbackHistoryRef = useRef<number[]>([]);

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
      trackMusicPlayer('ended', songName, artistName);
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

  useEffect(() => {
    return () => {
      if (beatAnimationRef.current !== null) cancelAnimationFrame(beatAnimationRef.current);
    };
  }, []);

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
    analyserRef.current = analyser;
    
    if (onAnalyserReady) {
      onAnalyserReady(analyser);
    }
  };

  const prepareBeatGrid = async () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    try {
      const response = await fetch(previewUrl);
      if (!response.ok) throw new Error(`Beat analysis request failed: ${response.status}`);
      const audioBuffer = await ctx.decodeAudioData(await response.arrayBuffer());
      const { bpm, offset } = await guess(audioBuffer);
      if (Number.isFinite(bpm) && bpm > 0 && Number.isFinite(offset)) {
        beatGridRef.current = { bpm, offset };
        gridPhaseRef.current = offset;
        beatIntervalRef.current = 60 / bpm;
      }
    } catch (error) {
      // Live analyser fallback still provides beat pulses when preview decoding is unavailable.
      beatGridRef.current = null;
      beatIntervalRef.current = 0;
    }
  };

  const emitBeat = (intensity: number) => {
    beatCountRef.current += 1;
    onBeat?.({
      intensity: Math.min(1, Math.max(0.3, intensity)),
      count: beatCountRef.current
    });
  };

  const startBeatDetection = () => {
    const audio = audioRef.current;
    const analyser = analyserRef.current;
    if (!audio || !analyser) return;

    if (beatAnimationRef.current !== null) cancelAnimationFrame(beatAnimationRef.current);

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    fallbackHistoryRef.current = [];

    const detect = () => {
      const audioNow = audioRef.current;
      if (!audioNow || audioNow.paused) {
        beatAnimationRef.current = null;
        return;
      }

      analyser.getByteFrequencyData(frequencyData);

      // Bass-band energy around the kick frequencies (approximated by the lowest bins).
      const bassBinCount = Math.max(1, Math.floor(frequencyData.length * 0.06));
      let bassTotal = 0;
      let bassPeak = 0;
      for (let index = 0; index < bassBinCount; index += 1) {
        const value = frequencyData[index];
        bassTotal += value;
        if (value > bassPeak) bassPeak = value;
      }
      const bassAverage = bassTotal / bassBinCount;

      const now = audioNow.currentTime;
      const history = fallbackHistoryRef.current;
      const historyAverage = history.reduce((sum, value) => sum + value, 0) / Math.max(1, history.length);

      // Onset = adaptive-threshold cross in the bass band that also has a sharp transient.
      const isOnset = history.length > 10 && bassPeak >= 120 && bassAverage > Math.max(36, historyAverage * 1.25);
      history.push(bassAverage);
      if (history.length > 45) history.shift();

      const grid = beatGridRef.current;
      const interval = beatIntervalRef.current;

      if (grid && interval > 0) {
        // Metronome safety: fire when none of the preceding onset windows produced a beat.
        const nextGridTime = gridPhaseRef.current + (gridIndexRef.current + 1) * interval;
        const ready = interval <= 0 || now - lastBeatTimeRef.current >= interval * 0.5;

        if (ready && isOnset) {
          const kNearest = Math.round((now - gridPhaseRef.current) / interval);
          const isNewBeat = kNearest > gridIndexRef.current;
          if (isNewBeat) {
            emitBeat(Math.max(0.3, bassAverage / 255));
            lastBeatTimeRef.current = now;
            gridIndexRef.current = kNearest;

            // Phase-lock: pull the grid toward the genuinely detected onset.
            const deviation = now - (gridPhaseRef.current + kNearest * interval);
            if (Math.abs(deviation) > 0.004) {
              const pull = Math.min(0.05, Math.abs(deviation) * 0.15);
              gridPhaseRef.current += Math.sign(deviation) * pull;
            }
          }
        } else if (ready && now >= nextGridTime && bassPeak >= 60) {
          // Drifted past the prediction with no detected onset: nudge the grid forward.
          gridIndexRef.current += 1;
          emitBeat(Math.max(0.3, Math.min(0.55, bassAverage / 255)));
          lastBeatTimeRef.current = now;
        }
      } else {
        const cooldown = interval > 0 ? interval * 0.5 : 0.12;
        if (isOnset && now - lastBeatTimeRef.current >= cooldown) {
          emitBeat(bassAverage / 255);
          lastBeatTimeRef.current = now;
        }
      }

      beatAnimationRef.current = requestAnimationFrame(detect);
    };

    beatAnimationRef.current = requestAnimationFrame(detect);
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
      if (!beatGridRef.current) void prepareBeatGrid();
      startBeatDetection();
      trackMusicPlayer('play', songName, artistName);
    } else {
      audioRef.current.pause();
      trackMusicPlayer('pause', songName, artistName);
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
    beatCountRef.current = 0;
    lastBeatTimeRef.current = -Infinity;
    gridIndexRef.current = -1;
    fallbackHistoryRef.current = [];
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div data-music-player className="flex flex-col w-full mt-2 p-4 rounded-2xl bg-slate-50/30">
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