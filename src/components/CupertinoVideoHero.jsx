import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * CupertinoVideoHero Component
 * 
 * Implements the exact Cupertino Pure video stage from stitch_spear_dz_high_tech_5_in_1_store:
 * - Autoplays /videos/video-products-bundl.mp4 automatically on page load.
 * - Displays /images/last-frame-16-9.jpg seamlessly on top the exact moment playback ends.
 * - Integrates the 180deg white gradient merge into the canvas.
 * - Strictly NO icons, NO sound controls, NO buttons over the video frame.
 */
export default function CupertinoVideoHero({
  videoSrc = '/videos/video-products-bundl.mp4',
  lastFrameSrc = '/images/last-frame-16-9.jpg'
}) {
  const videoRef = useRef(null);
  const [isEnded, setIsEnded] = useState(false);

  // Exact millisecond freeze trigger
  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch (_) {}
    }
    setIsEnded(true);
  }, []);

  // Timeupdate guard to transition cleanly without black frame
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration && !isEnded) {
      if (video.currentTime >= video.duration - 0.06) {
        handleEnded();
      }
    }
  }, [handleEnded, isEnded]);

  // Autoplay on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.log('[CupertinoVideoHero] Autoplay notice:', err.message);
      });
    }
  }, []);

  return (
    <div className="relative w-full overflow-hidden bg-surface-container-low aspect-[4/5] sm:aspect-square flex flex-col justify-between select-none">
      
      {/* 1. Underlying Autoplay Video */}
      <video
        ref={videoRef}
        src={videoSrc}
        playsInline
        muted
        autoPlay
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        style={{ height: '80%' }}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isEnded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />

      {/* 2. Last Frame Image - Appears seamlessly on top of the video */}
      <img
        src={lastFrameSrc}
        alt="Pack High-Tech 5 en 1"
        loading="eager"
        style={{ height: '80%' }}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isEnded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* 3. 180deg White Gradient Seamless Merge requested by user */}
      <div
        className="absolute inset-x-0 bottom-0 h-3/5 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(rgba(255, 255, 255, 0) 30%, rgb(255, 255, 255) 60%)'
        }}
      />

    </div>
  );
}
