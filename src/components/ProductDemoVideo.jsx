import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * ProductDemoVideo Component
 * 
 * High-performance demonstration video player for the PACK HIGH-TECH 5 EN 1.
 * When playback finishes, the native `ended` event freezes the exact final frame onto
 * an aligned canvas, preventing layout shifts, blanking, resetting, or unwanted loops.
 * 
 * @param {string} videoSrc - Path to video asset (default: /videos/pack-high-tech-demo.mp4)
 * @param {string} posterSrc - Fallback poster asset (default: /images/pack-high-tech-poster.jpg)
 * @param {string} className - Optional container styling classes
 */
export default function ProductDemoVideo({
  videoSrc = '/videos/pack-high-tech-demo.mp4',
  posterSrc = '/images/pack-high-tech-poster.jpg',
  className = ''
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Freeze final frame onto canvas when video ends
  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video) return;

    // 1. Explicitly pause video on its final timecode
    try {
      video.pause();
    } catch (_) {}

    // 2. Capture final rendered frame to canvas
    if (canvas && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          setIsFrozen(true);
        } else {
          // Canvas 2d context unavailable, keep video paused at last frame
          setIsFrozen(true);
        }
      } catch (err) {
        console.warn('[ProductDemoVideo] Frame capture notice:', err.message);
        // Fallback: keep paused video visible on its last frame
        setIsFrozen(true);
      }
    } else {
      setIsFrozen(true);
    }

    setIsPlaying(false);
  }, []);

  // Handle Play / Pause manual toggle
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isFrozen) {
      // Replay from start if clicked while frozen
      handleReplay();
      return;
    }

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch((e) => {
        console.warn('[ProductDemoVideo] Play interrupted:', e.message);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Explicit Replay handler
  const handleReplay = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    setIsFrozen(false);

    if (video) {
      video.currentTime = 0;
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('[ProductDemoVideo] Replay auto-play prevented:', e.message);
      });
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  const handleError = () => {
    setHasError(true);
    setErrorMessage('Vidéo de démonstration en cours de chargement.');
  };

  return (
    <div
      ref={containerRef}
      id="product-demo-video-container"
      className={`relative w-full aspect-video overflow-hidden rounded-2xl bg-[#0a0a0c] border border-cyan-500/30 shadow-[0_0_35px_rgba(0,242,254,0.18)] select-none group ${className}`}
    >
      {/* 1. Underlying HTML5 Video Element */}
      <video
        ref={videoRef}
        id="pack-demo-video"
        src={videoSrc}
        poster={posterSrc}
        playsInline
        muted={isMuted}
        autoPlay
        loop={false}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={handleError}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
      />

      {/* 2. Persistent Final Frame Canvas */}
      <canvas
        ref={canvasRef}
        id="pack-demo-video-final-frame"
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200 ${
          isFrozen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 3. Fallback poster image if video fails to decode */}
      {hasError && (
        <img
          src={posterSrc}
          alt="Pack High-Tech 5 en 1 Aperçu"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* 4. Optical Specular Rim / Ambient Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0a0a0c]/80 via-transparent to-black/20" />

      {/* 5. Cyber-Luxury Status Badge (Top-Left) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-2 bg-[#0a0a0c]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-cyan-500/30">
        <span className={`w-2 h-2 rounded-full ${isFrozen ? 'bg-amber-400' : isPlaying ? 'bg-cyan-400 animate-pulse' : 'bg-slate-400'}`} />
        <span className="text-[11px] font-mono font-medium tracking-wider text-slate-200 uppercase">
          {isFrozen ? 'Fin de la démo' : isPlaying ? 'Démo Live Pack 5-en-1' : 'En pause'}
        </span>
      </div>

      {/* 6. Sound Toggle (Top-Right) */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 rounded-full bg-[#0a0a0c]/80 backdrop-blur-md border border-white/10 text-slate-200 hover:text-cyan-400 hover:border-cyan-400/50 transition-colors"
      >
        {isMuted ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        )}
      </button>

      {/* 7. Centered Interaction Controls (Replay or Play Trigger) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        {isFrozen ? (
          <button
            type="button"
            id="video-replay-button"
            onClick={handleReplay}
            className="pointer-events-auto flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-[#0a0a0c] font-semibold text-sm shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6 0 2.97-2.16 5.44-5 5.92v2.02c3.95-.49 7-3.85 7-7.94 0-4.42-3.58-8-8-8zm-6 8c0-1.65.67-3.15 1.76-4.24L6.34 7.34C4.9 8.79 4 10.79 4 13c0 4.09 3.05 7.45 7 7.94v-2.02c-2.84-.48-5-2.95-5-5.92z"/>
            </svg>
            <span>Revoir la Démonstration</span>
          </button>
        ) : !isPlaying ? (
          <button
            type="button"
            id="video-play-button"
            onClick={togglePlayPause}
            className="pointer-events-auto p-5 rounded-full bg-cyan-500/90 text-[#0a0a0c] shadow-[0_0_30px_rgba(0,242,254,0.6)] hover:scale-110 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-7 h-7 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* 8. Bottom Information Strip */}
      <div className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-6 sm:right-6 z-10 flex items-center justify-between text-xs text-slate-300">
        <span className="font-medium text-white drop-shadow">Pack 5 en 1 — Test Réel en Algérie</span>
        <span className="font-mono text-cyan-300 font-bold bg-black/60 px-2 py-0.5 rounded border border-cyan-500/20">
          20,400 DZD
        </span>
      </div>
    </div>
  );
}
