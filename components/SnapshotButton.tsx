import React, { useState } from 'react';
import html2canvas from 'html2canvas';

interface SnapshotButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
}

const SnapshotButton: React.FC<SnapshotButtonProps> = ({ targetRef, filename }) => {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleDownload = async () => {
    const sourceCard = targetRef.current;
    if (!sourceCard) return;
    
    setIsCapturing(true);
    
    try {
      // Small delay to ensure any layout calculations or active frames are stable
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(sourceCard, {
        backgroundColor: null, // Transparent background for the card area
        scale: 2, // High resolution
        useCORS: true, // Required for album art
        logging: false,
        onclone: (clonedDoc) => {
          const card = clonedDoc.getElementById('matrix-capture-card');
          if (!card) return;

          // 1. MANUALLY SYNC CANVAS BITMAP
          // html2canvas sometimes misses the bitmap of an actively drawn canvas.
          // We find the original canvas and the cloned one, then copy the pixels.
          const originalCanvas = sourceCard.querySelector('canvas');
          const clonedCanvas = card.querySelector('canvas');
          if (originalCanvas && clonedCanvas) {
            const destCtx = clonedCanvas.getContext('2d');
            if (destCtx) {
              // We need to ensure the dimensions match for the drawImage call
              clonedCanvas.width = originalCanvas.width;
              clonedCanvas.height = originalCanvas.height;
              destCtx.drawImage(originalCanvas, 0, 0);
            }
          }

          // 2. STRIP CONTAINER STYLES
          // Removing the neumorphic card background for a clean export
          Object.assign(card.style, {
            background: 'none',
            backgroundColor: 'transparent',
            boxShadow: 'none',
            border: 'none',
            borderRadius: '0',
            padding: '40px',
            width: '800px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '40px',
            minHeight: 'auto'
          });

          // 3. HIDE DECORATIVE & INTERACTIVE ELEMENTS
          const elementsToHide = card.querySelectorAll('[data-html2canvas-ignore="true"], [data-music-player], button, .bg-gradient-to-tr');
          elementsToHide.forEach(el => {
            if (el instanceof HTMLElement) el.style.display = 'none';
          });

          // 4. FIX GRADIENT ELEMENTS (Prevent non-finite error)
          const legendBar = card.querySelector('[data-legend-bar]') as HTMLElement;
          if (legendBar) {
            const parent = legendBar.parentElement;
            if (parent) {
              Object.assign(parent.style, {
                display: 'flex',
                width: '300px',
                gap: '12px',
                alignItems: 'center'
              });
            }
            Object.assign(legendBar.style, {
              width: '200px',
              minWidth: '200px',
              maxWidth: '200px',
              height: '10px',
              display: 'block',
              flex: 'none',
              borderRadius: '5px'
            });
          }

          // 5. FIX VISUALIZATION CONTAINER
          const vizContainer = card.querySelector('canvas')?.parentElement;
          if (vizContainer) {
            Object.assign(vizContainer.style, {
              width: '720px',
              height: '720px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
              borderRadius: '32px',
              aspectRatio: 'unset',
              display: 'block',
              margin: '0 auto',
              overflow: 'hidden'
            });
            const innerCanvas = vizContainer.querySelector('canvas');
            if (innerCanvas) {
              Object.assign(innerCanvas.style, {
                width: '720px',
                height: '720px',
                display: 'block'
              });
            }
          }

          // 6. ADJUST TYPOGRAPHY
          const title = card.querySelector('h3');
          if (title) {
            Object.assign(title.style, {
              fontSize: '56px',
              fontWeight: '900',
              color: '#1e293b',
              lineHeight: '1',
              marginBottom: '6px'
            });
          }

          const artist = card.querySelector('.text-indigo-500') as HTMLElement;
          if (artist) {
            Object.assign(artist.style, {
              fontSize: '22px',
              letterSpacing: '0.15em',
              fontWeight: '800'
            });
          }

          // Clean up cloned body
          clonedDoc.body.style.backgroundColor = 'transparent';
          const children = Array.from(clonedDoc.body.children);
          children.forEach(child => {
            if (child instanceof HTMLElement && child !== card && !card.contains(child)) {
              child.style.display = 'none';
            }
          });
        }
      });
      
      // RELIABLE DOWNLOAD VIA BLOB
      // This prevents "Corrupted Image" errors caused by data URL length limits
      canvas.toBlob((blob) => {
        if (!blob) throw new Error("Canvas to Blob conversion failed");
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${filename.replace(/\s+/g, '_')}_matrix.png`;
        link.href = url;
        link.click();
        
        // Clean up the object URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }, 'image/png');

    } catch (err) {
      console.error("Snapshot generation failed:", err);
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