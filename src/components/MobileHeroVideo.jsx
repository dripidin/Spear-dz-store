import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * MobileHeroVideo Component
 * 
 * Apple-style 3:4 portrait framed video player designed exclusively for mobile smartphones.
 * - Format: 3:4 portrait rectangle with pure white framing.
 * - Plays `/videos/video-layer-2.mp4` as the first visual element on mobile.
 * - The exact millisecond the video ends, seamlessly freezes on `/images/last-frame-video.png`
 *   in the exact same placement with zero layout shift or visual artifact.
 * - Provides discrete Apple-style replay and audio controls.
 */
export default function MobileHeroVideo({
  videoSrc = '/videos/video-layer-2.mp4',
  lastFrameSrc = '/images/last-frame-video.png',
  locale = 'ar',
  className = ''
}) {
  const isAr = locale === 'ar';
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Exact millisecond freeze trigger
  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch (_) {}
    }
    // Instantaneously transition to the last frame image in identical coordinates
    setIsEnded(true);
    setIsPlaying(false);
  }, []);

  // Timeupdate guard to ensure instant freeze at final frame without black flash
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration && !isEnded) {
      // If we are within 50ms of the end, lock to last frame
      if (video.currentTime >= video.duration - 0.06) {
        handleEnded();
      }
    }
  }, [handleEnded, isEnded]);

  // Autoplay attempt on mount for mobile
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          // Autoplay policy fallback: paused waiting for user touch
          console.log('[MobileHeroVideo] Autoplay policy waiting for touch:', err.message);
          setIsPlaying(false);
        });
    }
  }, []);

  // Replay handler
  const handleReplay = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    setIsEnded(false);
    video.currentTime = 0;
    video
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((err) => {
        console.warn('[MobileHeroVideo] Play error:', err.message);
      });
  };

  const toggleSound = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  return (
    <div className={`w-full flex flex-col items-center select-none ${className}`}>
      
      {/* 3:4 Format White Framing Container */}
      <div className="relative w-full max-w-[320px] sm:max-w-[340px] bg-white p-2.5 sm:p-3 rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] border-4 border-white transition-all">
        
        {/* 3:4 Aspect Ratio Video Stage */}
        <div
          className="relative w-full aspect-[3/4] overflow-hidden rounded-[24px] bg-[#f5f5f7] cursor-pointer"
          onClick={isEnded ? handleReplay : undefined}
          title={isEnded ? (isAr ? 'اضغط لإعادة المشاهدة' : 'Cliquer pour rejouer') : ''}
        >
          {/* 1. Underlying Video Layer */}
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            muted={isMuted}
            autoPlay
            preload="auto"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onError={() => setHasError(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
              isEnded ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          />

          {/* 2. Last Frame Image - Placed at exact same bounds at the exact millisecond video stops */}
          <img
            src={lastFrameSrc}
            alt="Pack High-Tech Showcase - Final Frame"
            loading="eager"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
              isEnded ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Overlay Status Badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-white/85 backdrop-blur-md text-[11px] font-semibold text-[#1d1d1f] shadow-sm flex items-center gap-1.5 border border-[#d2d2d7]/50">
              <span className={`w-2 h-2 rounded-full ${isEnded ? 'bg-emerald-500' : 'bg-[#0071e3] animate-pulse'}`} />
              <span>{isEnded ? (isAr ? 'عرض حقيقي' : 'Démonstration Réelle') : (isAr ? 'فيديو مباشر' : 'Aperçu 3D')}</span>
            </span>
          </div>

          {/* Bottom Controls Bar inside Frame */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between">
            {/* Audio Mute/Unmute */}
            <button
              type="button"
              onClick={toggleSound}
              className="p-2 rounded-full bg-white/85 backdrop-blur-md text-[#1d1d1f] hover:bg-white text-xs shadow-sm border border-[#d2d2d7]/50 transition-transform active:scale-95"
              aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            {/* Replay Pill when ended */}
            {isEnded && (
              <button
                type="button"
                onClick={handleReplay}
                className="px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all active:scale-95 animate-apple-fade"
              >
                <span>↺</span>
                <span>{isAr ? 'إعادة المشاهدة' : 'Rejouer'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Small White Frame Footnote */}
        <div className="mt-2 text-center text-[11px] text-[#86868b] font-medium">
          {isAr ? 'منتج مطابق 100% للصور والفيديو' : 'Produit 100% conforme à la vidéo'}
        </div>

      </div>

    </div>
  );
}
