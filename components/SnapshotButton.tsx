import React, { useState } from 'react';
import { toBlob } from 'html-to-image';

interface SnapshotButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
}

const SnapshotButton: React.FC<SnapshotButtonProps> = ({ targetRef, filename }) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleDownload = async () => {
    const sourceNode = targetRef.current;
    if (!sourceNode) return;
    
    setIsCapturing(true);
    
    try {
      // 1. CREATE A CLONE FOR TRANSFORMATION
      // html-to-image is much more accurate with real DOM nodes. 
      // We clone it so we can modify the styles for the "Poster" look without affecting the live UI.
      const clone = sourceNode.cloneNode(true) as HTMLDivElement;
      
      // We need to attach the clone to the document to allow for style calculation, 
      // but we hide it off-screen.
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px';
      container.style.backgroundColor = '#F5F5F5';
      container.appendChild(clone);
      document.body.appendChild(container);

      // 2. APPLY POSTER STYLES TO CLONE
      const POSTER_WIDTH = 800;
      const VIZ_SIZE = 680;

      // Reset main card styles
      Object.assign(clone.style, {
        background: '#F5F5F5',
        boxShadow: 'none',
        border: 'none',
        borderRadius: '0',
        padding: '60px',
        width: `${POSTER_WIDTH}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: '50px',
        height: 'auto',
        transform: 'none',
        opacity: '1'
      });

      // Sync the internal canvas from the source to the clone manually
      // because cloneNode does not copy the drawing context (bitmap) of a canvas.
      const sourceCanvas = sourceNode.querySelector('canvas');
      const clonedCanvas = clone.querySelector('canvas');
      if (sourceCanvas && clonedCanvas) {
        clonedCanvas.width = sourceCanvas.width;
        clonedCanvas.height = sourceCanvas.height;
        const ctx = clonedCanvas.getContext('2d');
        if (ctx) ctx.drawImage(sourceCanvas, 0, 0);
      }

      // Hide interactive UI elements in the clone
      const elementsToHide = clone.querySelectorAll('[data-html2canvas-ignore="true"], [data-music-player], button, .bg-gradient-to-tr');
      elementsToHide.forEach(el => {
        if (el instanceof HTMLElement) el.style.display = 'none';
      });

      // Fix the legend bar (gradient)
      const legendBar = clone.querySelector('[data-legend-bar]') as HTMLElement;
      if (legendBar) {
        const parent = legendBar.parentElement;
        if (parent) {
          Object.assign(parent.style, {
            display: 'flex',
            width: '400px',
            gap: '16px',
            alignItems: 'center'
          });
        }
        Object.assign(legendBar.style, {
          width: '250px',
          height: '12px',
          borderRadius: '6px'
        });
      }

      // Fix Visualization container
      const vizContainer = clone.querySelector('canvas')?.parentElement;
      if (vizContainer) {
        Object.assign(vizContainer.style, {
          width: `${VIZ_SIZE}px`,
          height: `${VIZ_SIZE}px`,
          boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
          borderRadius: '40px',
          display: 'block',
          margin: '0 auto',
          overflow: 'hidden',
          backgroundColor: '#010204'
        });
        const innerCanvas = vizContainer.querySelector('canvas');
        if (innerCanvas) {
          Object.assign(innerCanvas.style, {
            width: `${VIZ_SIZE}px`,
            height: `${VIZ_SIZE}px`,
            display: 'block'
          });
        }
      }

      // Typography scaling
      const title = clone.querySelector('h3');
      if (title) {
        Object.assign(title.style, {
          fontSize: '64px',
          fontWeight: '950',
          color: '#1e293b',
          lineHeight: '1',
          letterSpacing: '-0.02em',
          display: 'block',
          marginBottom: '8px'
        });
      }

      const artist = clone.querySelector('.text-indigo-500') as HTMLElement;
      if (artist) {
        Object.assign(artist.style, {
          fontSize: '24px',
          letterSpacing: '0.2em',
          fontWeight: '800',
          display: 'block'
        });
      }

      // 3. GENERATE IMAGE
      // We use a small delay to ensure styles and images are fully processed in the clone
      await new Promise(resolve => setTimeout(resolve, 300));

      const blob = await toBlob(clone, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#F5F5F5'
      });

      if (!blob) throw new Error("Could not generate image blob.");

      // 4. DOWNLOAD
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${filename.replace(/\s+/g, '_')}_matrix.png`;
      link.href = url;
      link.click();

      // 5. CLEANUP
      document.body.removeChild(container);
      setTimeout(() => URL.revokeObjectURL(url), 500);

    } catch (err: any) {
      console.error("Poster generation failed:", err);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="flex justify-center mt-10 pb-20">
      <button 
        onClick={handleDownload} 
        disabled={isCapturing}
        className="clay-button px-14 py-6 text-sm flex items-center gap-4 group active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isCapturing ? (
          <svg className="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-8 h-8 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
        )}
        <span className="font-black tracking-widest uppercase">
          {isCapturing ? 'Generating...' : 'Download Matrix Poster'}
        </span>
      </button>
    </div>
  );
};

export default SnapshotButton;