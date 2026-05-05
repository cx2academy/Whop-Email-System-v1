import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo = ({ className = "", size = 34 }: LogoProps) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`shrink-0 ${className}`}
  >
    <defs>
      <linearGradient id="logo-top-flap-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ADE80" />
        <stop offset="100%" stopColor="#15803D" />
      </linearGradient>
      <linearGradient id="logo-bot-flap-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#4ADE80" />
        <stop offset="100%" stopColor="#22C55E" />
      </linearGradient>
    </defs>
    <g transform="rotate(-12 50 50)">
      {/* Top Flap */}
      <path d="M 5 36 L 50 6 L 95 36 Z" fill="url(#logo-top-flap-grad)" stroke="url(#logo-top-flap-grad)" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Inside Pocket */}
      <path d="M 5 40 L 95 40 L 95 86 L 5 86 Z" fill="#064E3B" stroke="#064E3B" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Left Flap */}
      <path d="M 5 40 L 50 66 L 5 86 Z" fill="#16A34A" stroke="#16A34A" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Right Flap */}
      <path d="M 95 40 L 50 66 L 95 86 Z" fill="#15803D" stroke="#15803D" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Bottom Flap */}
      <path d="M 5 86 L 50 56 L 95 86 Z" fill="url(#logo-bot-flap-grad)" stroke="url(#logo-bot-flap-grad)" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Gap Lines */}
      <path d="M 5 86 L 50 56 L 95 86" fill="none" stroke="#09090B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);
