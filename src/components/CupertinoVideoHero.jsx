import React from 'react';

/**
 * CupertinoVideoHero Component
 * 
 * Implements the Cupertino Pure showcase stage:
 * - Displays high-resolution pack showcase image directly (/images/last-frame-16-9.jpg).
 * - Instant loading without video buffering, autoplay policies, or black frame flicker.
 * - Integrates the signature 180deg white gradient merge into the canvas.
 * - Strictly NO icons, NO sound controls, NO buttons over the visual frame.
 */
export default function CupertinoVideoHero({
  imageSrc,
  lastFrameSrc,
  altText = 'PACK HIGH-TECH 5 EN 1'
}) {
  const activeImage = imageSrc || lastFrameSrc || '/images/last-frame-16-9.jpg';

  return (
    <div className="relative w-full overflow-hidden bg-surface-container-low aspect-[4/5] sm:aspect-square flex flex-col justify-between select-none">
      
      {/* 1. Instant-Loading Product Showcase Image */}
      <img
        src={activeImage}
        alt={altText}
        loading="eager"
        fetchPriority="high"
        style={{ height: '80%' }}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 2. 180deg White Gradient Seamless Merge into order form */}
      <div
        className="absolute inset-x-0 bottom-0 h-3/5 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(rgba(255, 255, 255, 0) 30%, rgb(255, 255, 255) 60%)'
        }}
      />

    </div>
  );
}

