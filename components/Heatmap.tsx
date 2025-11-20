import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import { WordFrequency } from '../types';
import { HEATMAP_COLORS } from '../constants';

interface HeatmapProps {
  sequence: string[];
  wordData: WordFrequency[];
  coverArt?: string;
  songName?: string;
  artistName?: string;
}

const MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };
const POINT_RADIUS = 2;

const Heatmap: React.FC<HeatmapProps> = ({ sequence, wordData, coverArt, songName, artistName }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null); // Ref for the whole card to capture
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 });

  const freqMap = useMemo(() => {
    const map = new Map<string, number>();
    wordData.forEach(w => map.set(w.word, w.frequency));
    return map;
  }, [wordData]);

  const dataPoints = useMemo(() => {
    const points: { x: number; y: number; word: string; freq: number }[] = [];
    
    const wordIndices = new Map<string, number[]>();
    sequence.forEach((word, index) => {
      if (!wordIndices.has(word)) {
        wordIndices.set(word, []);
      }
      wordIndices.get(word)!.push(index);
    });

    wordIndices.forEach((indices, word) => {
      const freq = freqMap.get(word) || 0;
      for (const x of indices) {
        for (const y of indices) {
           points.push({ x, y, word, freq });
        }
      }
    });

    return points;
  }, [sequence, freqMap]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({ width, height: width }); 
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || sequence.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = height - MARGIN.top - MARGIN.bottom;
    const n = sequence.length;

    const xScale = d3.scaleLinear().domain([0, n]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, n]).range([0, innerHeight]);
    
    const colorScale = d3.scaleLinear<string>()
      .domain([0, 0.25, 0.5, 0.75, 1]) 
      .range(HEATMAP_COLORS)
      .interpolate(d3.interpolateRgb);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 20])
      .translateExtent([[-MARGIN.left, -MARGIN.top], [width + MARGIN.right, height + MARGIN.bottom]])
      .on("zoom", (event) => {
        const transform = event.transform;
        g.attr("transform", transform.toString());
        
        const currentScale = transform.k;
        if (currentScale > 8) {
           labelsGroup.style("opacity", 1);
        } else {
           labelsGroup.style("opacity", 0);
        }
      });

    svg.call(zoom);

    const g = svg.append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Chart background (Dark for contrast of colored dots)
    g.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "#1e242e") 
      .attr("stroke", "#334155");

    g.selectAll("circle")
      .data(dataPoints)
      .join("circle")
      .attr("cx", d => xScale(d.x))
      .attr("cy", d => yScale(d.y))
      .attr("r", POINT_RADIUS) 
      .attr("fill", d => colorScale(d.freq))
      .attr("opacity", 0.8);

    const labelsGroup = g.append("g")
        .style("opacity", 0)
        .style("pointer-events", "none");

    labelsGroup.selectAll("text")
      .data(sequence)
      .join("text")
      .attr("x", (d, i) => xScale(i))
      .attr("y", (d, i) => yScale(i))
      .text(d => d)
      .attr("font-size", 4)
      .attr("fill", "#cbd5e1")
      .attr("alignment-baseline", "middle")
      .attr("text-anchor", "middle")
      .attr("dy", -4);

  }, [sequence, dataPoints, dimensions, freqMap]);

  const handleDownload = async () => {
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: '#F5F5F5', // Ensure background is captured correctly
          scale: 2, // Higher resolution
          useCORS: true, // Attempt to handle cross-origin images
          allowTaint: true,
        });
        
        const link = document.createElement('a');
        link.download = `${songName || 'song'}-lyrical-matrix.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
      } catch (err) {
        console.error("Download failed", err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div ref={cardRef} className="w-full clay-card p-6 flex flex-col gap-6">
        {/* Chart Container */}
        <div ref={containerRef} className="w-full aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-white">
           <svg 
            ref={svgRef} 
            width={dimensions.width} 
            height={dimensions.height} 
            className="cursor-move touch-none block"
          />
        </div>

        {/* Footer */}
        <div className="flex flex-row gap-6 items-end">
            {/* Cover Art (Left) - Only render if present */}
            {coverArt && (
                <div className="shrink-0 w-24 h-24 rounded-lg shadow-md overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={coverArt} alt="Album Cover" className="w-full h-full object-cover" />
                </div>
            )}

            {/* Metadata & Legend (Right) */}
            <div className="flex-1 flex flex-col gap-2">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 leading-tight">{songName || "Unknown Song"}</h3>
                    <p className="text-sm font-medium text-slate-500">{artistName || "Unknown Artist"}</p>
                </div>
                
                <div className="flex flex-col items-start gap-1">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Word Frequency</div>
                    <div className="flex items-center gap-2 w-full max-w-[200px]">
                        <span className="text-xs text-slate-400 font-medium">Rare</span>
                        <div className="flex-1 h-2 rounded-full shadow-inner border border-slate-100" style={{
                        background: `linear-gradient(to right, ${HEATMAP_COLORS.join(', ')})`
                        }}></div>
                        <span className="text-xs text-slate-400 font-medium">Frequent</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <button 
        onClick={handleDownload}
        className="self-center clay-button px-6 py-2 text-sm flex items-center gap-2 hover:text-indigo-600"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        Download as JPEG
      </button>
    </div>
  );
};

export default Heatmap;