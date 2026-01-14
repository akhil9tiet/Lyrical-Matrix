
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import { WordFrequency } from '../types';
import { HEATMAP_COLORS } from '../constants';
import MusicPlayer from './MusicPlayer';

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

const POINT_RADIUS = 1.25;

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
        const side = entry.contentRect.width;
        if (side > 0) setDimensions({ width: side, height: side });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (dimensions.width === 0 || dataPoints.length === 0) return;
    
    const n = sequence.length;
    const padding = 24;
    const innerSize = dimensions.width - padding * 2;
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
    if (!canvas || dimensions.width === 0 || dataPoints.length === 0) return;

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const padding = 24;
    const innerSize = dimensions.width - padding * 2;
    const freqData = new Uint8Array(analyser ? analyser.frequencyBinCount : 0);
    let start: number | null = null;

    const getOrCreateGradient = (key: string, create: () => CanvasGradient): CanvasGradient => {
      if (!gradientCacheRef.current.has(key)) {
        gradientCacheRef.current.set(key, create());
      }
      return gradientCacheRef.current.get(key)!;
    };

    const draw = (time: number) => {
      if (!start) start = time;
      const loadDuration = 2200; 
      const loadProgress = Math.min((time - start) / loadDuration, 1);

      // 1. AUDIO REACTIVITY
      let intensity = 0;
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqData);
        const bassRange = Math.floor(freqData.length * 0.1);
        let bassSum = 0;
        for (let i = 0; i < bassRange; i++) bassSum += freqData[i];
        const bassAvg = bassSum / bassRange;
        
        beatHistoryRef.current.push(bassAvg);
        if (beatHistoryRef.current.length > 60) beatHistoryRef.current.shift();
        
        const histAvg = beatHistoryRef.current.reduce((a,b) => a+b, 0) / beatHistoryRef.current.length;
        if (bassAvg > histAvg * 1.3 && bassAvg > 35) {
          beatPulseRef.current = 1.35;
        } else {
          beatPulseRef.current *= 0.94;
        }
        intensity = beatPulseRef.current;
      }

      const isInitialGlitch = loadProgress < 0.15;
      const effectiveIntensity = Math.max(intensity, isInitialGlitch ? Math.random() * 0.8 : 0);
      const t = time * 0.001;
      const revolveX = innerSize / 2 + Math.cos(t * 0.95) * (innerSize / 3.2) + Math.sin(t * 4.2) * (15 * effectiveIntensity);
      const revolveY = innerSize / 2 + Math.sin(t * 0.75) * (innerSize / 3.2) + Math.cos(t * 3.2) * (15 * effectiveIntensity);

      // 2. RENDER BASE
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#010204';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      ctx.save();
      ctx.translate(padding, padding);

      // Glitch translation
      if (effectiveIntensity > 1.1) {
        ctx.translate((Math.random() - 0.5) * 6 * effectiveIntensity, (Math.random() - 0.5) * 6 * effectiveIntensity);
      }

      // 3. AMBIENT GLOW (Halation)
      if ((isPlaying || isInitialGlitch) && effectiveIntensity > 0.05) {
        ctx.globalCompositeOperation = 'screen';
        const haloSize = innerSize * (0.45 + effectiveIntensity * 0.7);
        const hKey = `h-${Math.floor(revolveX/10)}-${Math.floor(revolveY/10)}-${Math.floor(haloSize/10)}`;
        const haloGrad = getOrCreateGradient(hKey, () => {
          const grad = ctx.createRadialGradient(revolveX, revolveY, 0, revolveX, revolveY, haloSize);
          const alpha = (isPlaying ? 0.22 : 0.45) * effectiveIntensity;
          grad.addColorStop(0, `rgba(99, 102, 241, ${alpha})`);
          grad.addColorStop(0.5, `rgba(67, 56, 202, ${alpha * 0.5})`);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          return grad;
        });
        ctx.fillStyle = haloGrad;
        ctx.fillRect(-padding, -padding, dimensions.width, dimensions.height);
      }

      const loadThreshold = loadProgress * 1.6;
      const scaledPoints = scaledPointsRef.current;

      // 4. CHROMATIC LAYER (Smooth Circles)
      if ((isPlaying || loadProgress < 0.5) && effectiveIntensity > 0.4) {
        ctx.globalCompositeOperation = 'screen';
        const offset = effectiveIntensity * 8;
        
        // Red Shift
        ctx.fillStyle = `rgba(255, 34, 34, ${0.6 * effectiveIntensity})`;
        const pathR = new Path2D();
        for (const p of scaledPoints) {
          if (p.revealIdx > loadThreshold) continue;
          pathR.moveTo(p.x - offset + POINT_RADIUS, p.y);
          pathR.arc(p.x - offset, p.y, POINT_RADIUS, 0, Math.PI * 2);
        }
        ctx.fill(pathR);

        // Blue Shift
        ctx.fillStyle = `rgba(34, 34, 255, ${0.6 * effectiveIntensity})`;
        const pathB = new Path2D();
        for (const p of scaledPoints) {
          if (p.revealIdx > loadThreshold) continue;
          pathB.moveTo(p.x + offset + POINT_RADIUS, p.y);
          pathB.arc(p.x + offset, p.y, POINT_RADIUS, 0, Math.PI * 2);
        }
        ctx.fill(pathB);
      }

      // 5. MAIN MATRIX LAYER (Circular points)
      ctx.globalCompositeOperation = 'screen';
      ctx.shadowBlur = 5;
      
      const batches = new Map<string, Path2D>();
      for (const p of scaledPoints) {
        if (p.revealIdx > loadThreshold) continue;
        
        let x = p.x;
        let y = p.y;
        
        // Glitch jitter
        const distToWipe = Math.abs(p.revealIdx - loadThreshold);
        if ((distToWipe < 0.08 || effectiveIntensity > 1.1) && Math.random() > 0.95) {
          x += (Math.random() - 0.5) * 40 * effectiveIntensity;
        }

        if (!batches.has(p.color)) batches.set(p.color, new Path2D());
        const path = batches.get(p.color)!;
        path.moveTo(x + POINT_RADIUS, y);
        path.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
      }

      batches.forEach((path, color) => {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.fill(path);
      });
      ctx.shadowBlur = 0;

      // 6. BLOOM WIPE (Glow Blade)
      if (loadProgress < 1) {
        ctx.save();
        ctx.filter = 'blur(45px)'; // Soften the glare
        ctx.globalCompositeOperation = 'lighter';
        
        const currentY = loadProgress * innerSize;
        const bladeHeight = 200;
        const bKey = `b-${Math.floor(currentY/5)}`;
        const bladeGrad = getOrCreateGradient(bKey, () => {
          const grad = ctx.createLinearGradient(0, currentY - bladeHeight/2, 0, currentY + bladeHeight/2);
          grad.addColorStop(0, 'rgba(99, 102, 241, 0)');
          grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.75 * (1 - loadProgress)})`);
          grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
          return grad;
        });
        ctx.fillStyle = bladeGrad;
        ctx.fillRect(0, 0, innerSize, innerSize);

        // Clip the blade reveal
        ctx.globalCompositeOperation = 'destination-in';
        const wipePos = loadProgress * 1.6;
        const s1 = Math.max(0, wipePos - 0.28);
        const s2 = Math.min(1, wipePos + 0.12);
        const maskGrad = ctx.createLinearGradient(0, 0, innerSize, innerSize);
        maskGrad.addColorStop(s1, 'rgba(0,0,0,0)');
        maskGrad.addColorStop(wipePos, 'rgba(0,0,0,1)');
        maskGrad.addColorStop(s2, 'rgba(0,0,0,0)');
        ctx.fillStyle = maskGrad;
        ctx.fillRect(0, 0, innerSize, innerSize);
        ctx.restore();
      }

      // 7. PLAYBACK BLOOM
      if (isPlaying && intensity > 0.1) {
        ctx.globalCompositeOperation = 'screen';
        const bloomSize = innerSize * (0.6 + intensity * 0.55);
        const bloomAlpha = 0.25 + intensity * 0.35;
        const bloomGrad = ctx.createRadialGradient(revolveX, revolveY, 0, revolveX, revolveY, bloomSize);
        bloomGrad.addColorStop(0, `rgba(255, 255, 255, ${bloomAlpha})`);
        bloomGrad.addColorStop(0.4, `rgba(139, 92, 246, ${bloomAlpha * 0.6})`);
        bloomGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bloomGrad;
        ctx.fillRect(-padding, -padding, dimensions.width, dimensions.height);
      }

      // 8. FINAL VIGNETTE & TEXTURE
      ctx.globalCompositeOperation = 'multiply';
      const vKey = 'vignette';
      const screenTexture = getOrCreateGradient(vKey, () => {
        const grad = ctx.createRadialGradient(innerSize/2, innerSize/2, 0, innerSize/2, innerSize/2, innerSize * 0.9);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(180,180,255,0.75)');
        return grad;
      });
      ctx.fillStyle = screenTexture;
      ctx.fillRect(-padding, -padding, dimensions.width, dimensions.height);

      ctx.restore();
      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationRef.current);
      gradientCacheRef.current.clear();
    };
  }, [dimensions, dataPoints, isPlaying, analyser, sequence.length]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: '#F5F5F5',
      scale: 2,
      useCORS: true
    });
    const link = document.createElement('a');
    link.download = `${songName || 'song'}-repetition-matrix.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
      <div ref={cardRef} className="w-full clay-card p-6 flex flex-col gap-4 relative">
        <div className="flex gap-4 items-center">
          <div className="relative group">
            {coverArt ? (
              <img src={coverArt} alt="Album Art" className="w-16 h-16 rounded-2xl shadow-xl border-2 border-white object-cover transition-transform group-hover:scale-110" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-400">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              </div>
            )}
            {isPlaying && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-ping"></div>}
          </div>
          
          <div className="flex flex-col flex-1">
            <h3 className="text-xl font-black text-slate-800 leading-tight truncate">{songName || "Analyzing Track..."}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-indigo-500 uppercase tracking-widest">{artistName || "Unknown Artist"}</span>
              {releaseYear && <span className="text-[10px] font-black text-slate-400 bg-white/50 px-2 py-0.5 rounded-full border border-slate-100">{releaseYear}</span>}
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowLyrics(!showLyrics)}
              className={`w-10 h-10 rounded-full clay-button flex items-center justify-center transition-all ${showLyrics ? 'bg-indigo-50 shadow-inner text-indigo-700' : 'text-indigo-500'}`}
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
            className="block cursor-crosshair" 
          />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 to-transparent"></div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-row justify-between items-end gap-4 relative z-10">
              <div className="flex flex-col gap-2 flex-1">
                  <div className="flex flex-col items-start gap-1">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Repetition Matrix (Neon Reveal)</div>
                      <div className="flex items-center gap-2 w-full max-w-[200px]">
                          <span className="text-[10px] text-slate-400 font-bold tracking-tighter">RARE</span>
                          <div className="flex-1 h-2 rounded-full border border-white/20" style={{ background: `linear-gradient(to right, ${HEATMAP_COLORS.join(', ')})` }}></div>
                          <span className="text-[10px] text-slate-400 font-bold tracking-tighter">HOT</span>
                      </div>
                  </div>
              </div>
              <div className="bg-white/90 text-slate-700 text-[10px] font-black px-3 py-1.5 rounded-full border border-slate-100 shadow-sm whitespace-nowrap tracking-widest flex gap-2 items-center">
                  <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`}></div>
                  {sequence.length} WORDS
              </div>
          </div>
          {previewUrl && (
            <MusicPlayer 
              previewUrl={previewUrl} 
              onToggle={setIsPlaying} 
              onAnalyserReady={(node) => setAnalyser(node)}
            />
          )}
        </div>
      </div>
      <div className="flex justify-center mt-2">
        <button onClick={handleDownload} className="clay-button px-8 py-3 text-sm flex items-center gap-2 group">
          <svg className="w-4 h-4 group-hover:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Snapshot Frame
        </button>
      </div>
    </div>
  );
};

export default Heatmap;
