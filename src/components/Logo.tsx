import React from 'react';

export function ChirwonLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="#0b2a75" />
      <circle cx="100" cy="100" r="90" fill="none" stroke="white" strokeWidth="2" />
      <circle cx="100" cy="100" r="65" fill="none" stroke="white" strokeWidth="2" />
      
      {/* Top Text */}
      <path id="top-arc" d="M 35,100 A 65,65 0 0,1 165,100" fill="none" />
      <text fill="white" fontSize="13" fontWeight="bold" letterSpacing="1" fontFamily="sans-serif">
        <textPath href="#top-arc" startOffset="50%" textAnchor="middle">CHIRWON HIGH SCHOOL</textPath>
      </text>

      {/* Bottom Text */}
      <path id="bot-arc" d="M 175,100 A 75,75 0 0,1 25,100" fill="none" />
      <text fill="white" fontSize="18" fontWeight="bold" letterSpacing="2" fontFamily="sans-serif">
        <textPath href="#bot-arc" startOffset="50%" textAnchor="middle">칠원고등학교</textPath>
      </text>
      
      {/* Dots */}
      <circle cx="25" cy="120" r="3" fill="white" />
      <circle cx="175" cy="120" r="3" fill="white" />

      {/* Center Traditional Symbol */}
      <g stroke="white" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* Abstract structure in the core */}
        <path d="M 100,45 L 100,140 M 60,80 L 140,80 M 70,105 L 130,105 M 85,140 L 115,140" />
        <path d="M 85,60 L 115,60 M 60,115 A 40,30 0 0,0 140,115" />
      </g>
      
      {/* Ribbon at bottom */}
      <path d="M 70,165 Q 100,155 130,165" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
