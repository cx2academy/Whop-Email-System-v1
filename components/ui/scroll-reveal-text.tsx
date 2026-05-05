'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface ScrollRevealTextProps {
  text: string;
  className?: string;
  children?: React.ReactNode;
}

export function ScrollRevealText({ text, className = "", children }: ScrollRevealTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Tracks exactly how far the container has scrolled.
  // 0 = top of container at top of viewport
  // 1 = bottom of container at bottom of viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const words = text.split(" ");

  return (
    // 315vh container gives 215vh of scrollable distance (if viewport is 100vh).
    // Hero is 100vh, so reveal ends when we've scrolled 100vh (progress 0.5 approximately).
    <div 
      ref={containerRef} 
      className="relative h-[315vh] bg-white"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px'
      }}
    >
      <div className="sticky top-[72px] h-[calc(100vh-72px)] flex flex-col items-center justify-center overflow-hidden">
        <div className={`max-w-5xl mx-auto text-center px-6 ${className}`}>
          <div className="flex flex-wrap justify-center mb-12">
            {words.map((word, i) => {
              // Recalibrated for 200vh scroll distance:
              // Starts at 0.07 (14vh scroll) to add a slight delay as hero slides up.
              const animationStart = 0.07;
              const totalAnimationRange = 0.15; 
              const step = totalAnimationRange / words.length;
              
              const start = animationStart + (i * step);
              const end = start + step;
              
              return (
                <Word 
                  key={i} 
                  progress={scrollYProgress} 
                  range={[start, end]}
                >
                  {word}
                </Word>
              );
            })}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Word({ children, progress, range }: { children: string; progress: any; range: [number, number] }) {
  // We map the raw scroll progress to an opacity value [0, 1] strictly matching this word's sub-range
  const opacity = useTransform(progress, range, [0, 1]);

  return (
    <span className="relative inline-block mr-[0.25em] mb-[0.1em] font-medium">
      {/* Light grey base string (always visible behind) */}
      <span className="text-zinc-200">{children}</span>
      
      {/* True black string fading in directly on top */}
      <motion.span 
        style={{ opacity }} 
        className="absolute left-0 top-0 text-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
      >
        {children}
      </motion.span>
    </span>
  );
}
