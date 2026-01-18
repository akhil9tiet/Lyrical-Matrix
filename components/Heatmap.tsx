import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { WordFrequency } from '../types';
import { HEATMAP_COLORS } from '../constants';
import MusicPlayer from './MusicPlayer';
import SnapshotButton from './SnapshotButton';

interface HeatmapProps {
  sequence: string[];
  wordData: WordFrequency[];
  totalWordCount: number;
  lyrics: string;
  coverArt?: string;
  songName?: string;
  artistName?: string;
  releaseYear?: string;
  previewUrl?: string;
}

const POINT_RADIUS = 1.35;
const BASE_SCALE = 0.35; 

const Heatmap: React.FC<HeatmapProps> = ({ 
  sequence, 
  wordData, 
  totalWordCount, 
  lyrics,
  coverArt, 
  songName, 
  artistName, 
  releaseYear,
  previewUrl 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null); 
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  const animationRef = useRef<number>(0);
  const beatPulseRef = useRef<number>(0);
  const beatHistoryRef = useRef<number[]>([]);
  
  const scaledPointsRef = useRef<{x: number; y: number; color: string; freq: number; revealIdx: number}[]>([]);
  const gradientCacheRef = useRef<Map<string, CanvasGradient>>(new Map());

  const colorScale = useMemo(() => {
    return d3.scaleLinear<string>()
      .domain([0, 0.25, 0.5, 0.75, 1]) 
      .range(HEATMAP_COLORS)
      .interpolate(d3.interpolateRgb);
  }, []);

  const dataPoints = useMemo(() => {
    const points: { x: number; y: number; freq: number; color: string }[] = [];
    const wordIndices = new Map<string, number[]>();
    
    sequence.forEach((word, index) => {
      if (!wordIndices.has(word)) wordIndices.set(word, []);
      wordIndices.get(word)!.push(index);
    });

    const freqMap = new Map<string, number>();
    wordData.forEach(w => freqMap.set(w.word, w.frequency));

    wordIndices.forEach((indices, word) => {
      const freq = freqMap.get(word) || 0;
      const color = colorScale(freq);
      for (const x of indices) {
        for (const y of indices) {
           points.push({ x, y, freq, color });
        }
      }
    });
    return points;
  }, [sequence, wordData, colorScale]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const side = Math.floor(entry.contentRect.width);
        if (side > 0) setDimensions({ width: side, height: side });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (dimensions.width <= 0 || dataPoints.length === 0) return;
    
    const n = Math.max(1, sequence.length);
    const padding = 24;
    const innerSize = Math.max(0, dimensions.width - padding * 2);
    const xScale = d3.scaleLinear().domain([0, n]).range([0, innerSize]);
    const yScale = d3.scaleLinear().domain([0, n]).range([0, innerSize]);

    scaledPointsRef.current = dataPoints.map(p => ({
      x: xScale(p.x),
      y: yScale(p.y),
      color: p.color,
      freq: p.freq,
      revealIdx: (p.x + p.y) / (2 * n)
    }));
  }, [dimensions, dataPoints, sequence.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width <= 0 || dataPoints.length === 0) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = 24;
    const innerSize = Math.max(1, dimensions.width - padding * 2);
    const freqData = new Uint8Array(analyser ? analyser.frequencyBinCount : 0);
    let start: number | null = null;

    const addSafeColorStop = (grad: CanvasGradient, offset: number, color: string) => {
      // Ensure offset is a finite number between 0 and 1
      if (Number.isFinite(offset)) {
        grad.addColorStop(Math.min(1, Math.max(0, offset)), color);
      }
    };

    const getOrCreateGradient = (key: string, create: () => CanvasGradient): CanvasGradient | null => {
      if (!gradientCacheRef.current.has(key)) {
        try {
          const grad = create();
          gradientCacheRef.current.set(key, grad);
        } catch (e) {
          return null;
        }
      }
      return gradientCacheRef.current.get(key) || null;
    };

    const draw = (time: number) => {
      if (!start) start = time;
      const loadDuration = 2500; 
      const rawProgress = (time - start) / loadDuration;
      const loadProgress = Number.isFinite(rawProgress) ? Math.min(Math.max(rawProgress, 0), 1) : 1;

      let intensity = 0;
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqData);
        const bassRange = Math.floor(freqData.length * 0.1);
        let bassSum = 0;
        for (let i = 0; i < bassRange; i++) bassSum += freqData[i];
        const bassAvg = bassSum / Math.max(1, bassRange);
        
        beatHistoryRef.current.push(bassAvg);
        if (beatHistoryRef.current.length > 60) beatHistoryRef.current.shift();
        
        const histAvg = beatHistoryRef.current.reduce((a,b) => a+b, 0) / Math.max(1, beatHistoryRef.current.length);
        if (bassAvg > histAvg * 1.3 && bassAvg > 35) {
          beatPulseRef.current = 1.35;
        } else {
          beatPulseRef.current *= 0.94;
        }
        intensity = Number.isFinite(beatPulseRef.current) ? beatPulseRef.current : 0;
      }

      const isInitialGlitch = loadProgress < 0.15;
      const effectiveIntensity = Math.max(intensity, isInitialGlitch ? Math.random() * 0.8 : 0);
      const t = Number.isFinite(time) ? time * 0.001 : 0;
      
      const revolveX = innerSize / 2 + Math.cos(t * 0.95) * (innerSize / 3.2) + Math.sin(t * 4.2) * (15 * effectiveIntensity);
      const revolveY = innerSize / 2 + Math.sin(t * 0.75) * (innerSize / 3.2) + Math.cos(t * 3.2) * (15 * effectiveIntensity);

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#010204';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      ctx.save();
      ctx.translate(padding, padding);

      if (effectiveIntensity > 1.1) {
        ctx.translate((Math.random() - 0.5) * 6 * effectiveIntensity, (Math.random() - 0.5) * 6 * effectiveIntensity);
      }

      if ((isPlaying || isInitialGlitch) && effectiveIntensity > 0.05 && innerSize > 0) {
        if (Number.isFinite(revolveX) && Number.isFinite(revolveY)) {
          ctx.globalCompositeOperation = 'screen';
          const haloSize = Math.max(0.1, innerSize * (0.45 + effectiveIntensity * 0.7));
          const hKey = `h-${Math.floor(revolveX/10)}-${Math.floor(revolveY/10)}-${Math.floor(haloSize/10)}`;
          const haloGrad = getOrCreateGradient(hKey, () => {
            const grad = ctx.createRadialGradient(revolveX, revolveY, 0, revolveX, revolveY, haloSize);
            const alpha = (isPlaying ? 0.22 : 0.45) * effectiveIntensity;
            addSafeColorStop(grad, 0, `rgba(99, 102, 241, ${alpha})`);
            addSafeColorStop(grad, 0.5, `rgba(67, 56, 202, ${alpha * 0.5})`);
            addSafeColorStop(grad, 1, 'rgba(0,0,0,0)');
            return grad;
          });
          if (haloGrad) {
            ctx.fillStyle = haloGrad;
            ctx.fillRect(-padding, -padding, dimensions.width, dimensions.height);
          }
        }
      }

      const wavePos = loadProgress * 1.6; 
      const scaledPoints = scaledPointsRef.current;

      ctx.globalCompositeOperation = 'screen';
      
      const batches = new Map<string, Path2D>();
      for (const p of scaledPoints) {
        const dist = wavePos - p.revealIdx;
        let scale = BASE_SCALE;
        
        if (dist > 0) {
          if (dist < 0.2) {
            const popAmount = Math.sin((dist / 0.2) * Math.PI);
            scale = BASE_SCALE + (1.0 - BASE_SCALE) * (dist / 0.2) + popAmount * 0.4;
          } else {
            scale = 1.0;
          }
        }

        const currentRadius = POINT_RADIUS * scale;
        let x = p.x;
        let y = p.y;
        
        if (intensity > 1.1 && Math.random() > 0.95) {
          x += (Math.random() - 0.5) * 40 * intensity;
        }

        if (!batches.has(p.color)) batches.set(p.color, new Path2D());
        const path = batches.get(p.color)!;
        path.moveTo(x + currentRadius, y);
        path.arc(x, y, currentRadius, 0, Math.PI * 2);
      }

      ctx.shadowBlur = 5;
      batches.forEach((path, color) => {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.fill(path);
      });
      ctx.shadowBlur = 0;

      if (loadProgress < 1 && innerSize > 0) {
        ctx.save();
        ctx.filter = 'blur(50px)';
        ctx.globalCompositeOperation = 'lighter';
        
        try {
          const bladeGrad = ctx.createLinearGradient(0, 0, innerSize, innerSize);
          const s1 = Math.max(0, loadProgress - 0.1);
          const s2 = Math.min(1, loadProgress + 0.1);
          addSafeColorStop(bladeGrad, s1, 'rgba(255, 255, 255, 0)');
          addSafeColorStop(bladeGrad, loadProgress, `rgba(255, 255, 255, ${Math.max(0, 0.8 * (1 - loadProgress))})`);
          addSafeColorStop(bladeGrad, s2, 'rgba(255, 255, 255, 0)');
          
          ctx.fillStyle = bladeGrad;
          ctx.fillRect(0, 0, innerSize, innerSize);
        } catch (e) {}
        ctx.restore();
      }

      if (isPlaying && intensity > 0.1 && innerSize > 0) {
        if (Number.isFinite(revolveX) && Number.isFinite(revolveY)) {
          ctx.globalCompositeOperation = 'screen';
          const bloomSize = Math.max(0.1, innerSize * (0.6 + intensity * 0.55));
          const bloomAlpha = Math.max(0, 0.25 + intensity * 0.35);
          try {
            const bloomGrad = ctx.createRadialGradient(revolveX, revolveY, 0, revolveX, revolveY, bloomSize);
            addSafeColorStop(bloomGrad, 0, `rgba(255, 255, 255, ${bloomAlpha})`);
            addSafeColorStop(bloomGrad, 0.4, `rgba(139, 92, 246, ${bloomAlpha * 0.6})`);
            addSafeColorStop(bloomGrad, 1, 'rgba(0,0,0,0)');
            ctx.fillStyle = bloomGrad;
            ctx.fillRect(-padding, -padding, dimensions.width, dimensions.height);
          } catch (e) {}
        }
      }

      ctx.globalCompositeOperation = 'multiply';
      const screenTexture = getOrCreateGradient('vignette', () => {
        const grad = ctx.createRadialGradient(innerSize/2, innerSize/2, 0, innerSize/2, innerSize/2, Math.max(0.1, innerSize * 0.9));
        addSafeColorStop(grad, 0, 'rgba(255,255,255,1)');
        addSafeColorStop(grad, 1, 'rgba(180,180,255,0.75)');
        return grad;
      });
      if (screenTexture) {
        ctx.fillStyle = screenTexture;
        ctx.fillRect(-padding, -padding, dimensions.width, dimensions.height);
      }

      ctx.restore();
      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationRef.current);
      gradientCacheRef.current.clear();
    };
  }, [dimensions, dataPoints, isPlaying, analyser, sequence.length]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <div 
        id="matrix-capture-card"
        ref={cardRef} 
        className="w-full clay-card p-6 flex flex-col gap-6 relative bg-[#F5F5F5]"
      >
        <div className="flex gap-4 items-start w-full">
          <div className="relative flex-shrink-0 group">
            {coverArt ? (
              <img src={coverArt} alt="Album Art" className="w-16 h-16 rounded-2xl shadow-xl border-2 border-white object-cover transition-transform group-hover:scale-105" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-400 border-2 border-white">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              </div>
            )}
            {isPlaying && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" data-html2canvas-ignore="true"></div>}
          </div>
          
          <div className="flex flex-col flex-1 min-w-0 pr-12">
            <h3 className="text-xl md:text-2xl font-black text-slate-800 leading-none truncate antialiased">
              {songName || "Analyzing Track..."}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-sm font-black text-indigo-500 uppercase tracking-widest truncate">{artistName || "Unknown Artist"}</span>
              {releaseYear && <span className="text-[10px] font-black text-slate-400 bg-white/60 px-2 py-0.5 rounded-full border border-slate-100 flex-shrink-0">{releaseYear}</span>}
            </div>
          </div>
          
          <div className="absolute top-6 right-6 z-10" data-html2canvas-ignore="true">
            <button 
              onClick={() => setShowLyrics(!showLyrics)}
              className={`w-10 h-10 rounded-full clay-button flex items-center justify-center transition-all ${showLyrics ? 'bg-indigo-100 shadow-inner' : ''}`}
              title="Lyrics View"
            >
              <span className="font-serif italic font-black text-lg">i</span>
            </button>
            {showLyrics && (
              <div className="absolute right-0 top-12 w-64 md:w-80 h-96 clay-card z-50 p-4 overflow-hidden animate-reveal-card origin-top-right shadow-2xl border-white/50">
                <button 
                  onClick={() => setShowLyrics(false)}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 z-10 bg-white/80 rounded-full"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div className="h-full overflow-y-auto text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-slate-600 scrollbar-hide pr-2 pt-2">
                  <div className="font-black text-indigo-500 uppercase mb-3 sticky top-0 bg-[#F5F5F5] py-1 border-b border-slate-200/50 backdrop-blur-sm">Song Lyrics</div>
                  {lyrics}
                </div>
              </div>
            )}
          </div>
        </div>

        <div ref={containerRef} className="w-full aspect-square rounded-3xl overflow-hidden border border-slate-200 shadow-2xl bg-[#010204] relative">
          <canvas 
            ref={canvasRef} 
            style={{ width: dimensions.width, height: dimensions.height }} 
            className="block" 
          />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent"></div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 relative">
              <div className="flex flex-col gap-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Lyrical Density Wave</div>
                  <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-black tracking-tighter">RARE</span>
                      <div data-legend-bar className="w-48 h-2 rounded-full border border-white/20" style={{ background: `linear-gradient(to right, ${HEATMAP_COLORS.join(', ')})` }}></div>
                      <span className="text-[10px] text-slate-400 font-black tracking-tighter">HOT</span>
                  </div>
              </div>
              <div className="bg-white/90 text-slate-700 text-[10px] font-black px-4 py-2 rounded-full border border-slate-100 shadow-sm whitespace-nowrap tracking-widest flex gap-2 items-center">
                  <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  {sequence.length} WORDS
              </div>
          </div>
          
          <div data-html2canvas-ignore="true">
            {previewUrl && (
              <MusicPlayer 
                previewUrl={previewUrl} 
                onToggle={setIsPlaying} 
                onAnalyserReady={(node) => setAnalyser(node)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Snapshot Export Button */}
      <SnapshotButton 
        targetRef={cardRef} 
        filename={songName || 'lyrical_matrix'} 
      />
    </div>
  );
};

export default Heatmap;