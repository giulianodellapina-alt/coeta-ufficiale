import React from 'react';
import { cn } from '../lib/utils';

interface EkoclubLogoProps {
  className?: string;
  size?: number | string;
}

export const EkoclubLogo: React.FC<EkoclubLogoProps> = ({ className, size = "100%" }) => {
  const [imageState, setImageState] = React.useState<'transparent' | 'operativo' | 'nucleo' | 'svg' | 'error'>('operativo');

  const logoStyle: React.CSSProperties = { 
    width: size, 
    height: size, 
    objectFit: 'contain',
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
    display: 'block'
  };

  if (imageState === 'error') {
    return <div className={cn("flex items-center justify-center font-bold text-blue-500", className)} style={logoStyle}>EKOCLUB</div>;
  }

  if (imageState === 'transparent') {
    return (
      <img 
        src="/logo_ekoclub_trasparente.png" 
        alt="Logo Ekoclub Trasparente"
        style={logoStyle}
        className={cn(className)}
        onError={() => setImageState('operativo')}
      />
    );
  }

  if (imageState === 'operativo') {
    return (
      <img 
        src={typeof window !== 'undefined' ? `${window.location.origin}/logo_operativo.jpg` : '/logo_operativo.jpg'} 
        alt="Logo Operativo Ekoclub"
        style={logoStyle}
        className={cn(className)}
        onError={() => setImageState('nucleo')}
      />
    );
  }

  if (imageState === 'nucleo') {
    return (
      <img 
        src={typeof window !== 'undefined' ? `${window.location.origin}/logo_nucleo.png` : '/logo_nucleo.png'} 
        alt="Logo Nucleo Ekoclub"
        style={logoStyle}
        className={cn(className)}
        onError={() => setImageState('svg')}
      />
    );
  }

  return (
    <svg 
      viewBox="0 0 200 200" 
      width={size} 
      height={size} 
      style={logoStyle}
      className={cn(className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Clip for the left half of the circle */}
        <clipPath id="leftHalf">
          <rect x="0" y="0" width="100" height="200" />
        </clipPath>
        {/* Clip for the right half of the circle */}
        <clipPath id="rightHalf">
          <rect x="100" y="0" width="100" height="200" />
        </clipPath>
        {/* Path for the arched banner at the bottom */}
        <path id="bannerPath" d="M 30,165 Q 100,185 170,165" fill="transparent" />
      </defs>

      {/* Main Circle Border */}
      <circle cx="100" cy="100" r="90" fill="white" stroke="black" strokeWidth="4" />
      
      {/* Green Left Half background */}
      <circle cx="100" cy="100" r="88" fill="#16a34a" clipPath="url(#leftHalf)" />
      
      {/* Red Right Half background */}
      <circle cx="100" cy="100" r="88" fill="#dc2626" clipPath="url(#rightHalf)" />

      {/* The Fir Tree (White) */}
      <path 
        d="M 100,25 
           L 125,70 L 115,70 
           L 145,110 L 132,110 
           L 165,160 
           L 35,160 
           L 68,110 L 55,110 
           L 85,70 L 75,70 
           Z" 
        fill="white" 
        stroke="black" 
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* odv text */}
      <text 
        x="100" 
        y="152" 
        textAnchor="middle" 
        fontFamily="serif" 
        fontWeight="bold" 
        fontSize="12" 
        fill="black"
      >
        odv
      </text>

      {/* The Banner at the bottom */}
      <path 
        d="M 15,165 
           Q 100,195 185,165 
           L 175,135 
           Q 100,165 25,135 
           Z" 
        fill="white" 
        stroke="black" 
        strokeWidth="2" 
      />

      {/* EKOCLUB INTERNATIONAL text inside the banner */}
      <text 
        fontFamily="sans-serif" 
        fontWeight="900" 
        fontSize="16" 
        fill="black"
        letterSpacing="-0.5"
      >
        <textPath href="#bannerPath" startOffset="50%" textAnchor="middle">
          EKOCLUB INTERNATIONAL
        </textPath>
      </text>
    </svg>
  );
};
