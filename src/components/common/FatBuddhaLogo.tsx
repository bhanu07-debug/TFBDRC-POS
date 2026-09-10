import React from 'react';
import { usePOS } from '../../context/POSContext';

interface FatBuddhaLogoProps {
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  className?: string;
  showBorder?: boolean;
  monochrome?: boolean;
  alt?: string;
}

export const FatBuddhaLogo: React.FC<FatBuddhaLogoProps> = ({
  size = 'md',
  className = '',
  showBorder = true,
  monochrome = false,
  alt = 'The Fat Buddha Delight Official Logo'
}) => {
  const { settings } = usePOS();

  // Determine dimension in pixels
  let pixelSize = 40;
  if (typeof size === 'number') {
    pixelSize = size;
  } else {
    switch (size) {
      case 'xs': pixelSize = 24; break;
      case 'sm': pixelSize = 32; break;
      case 'md': pixelSize = 40; break;
      case 'lg': pixelSize = 52; break;
      case 'xl': pixelSize = 72; break;
      case '2xl': pixelSize = 96; break;
      case 'hero': pixelSize = 140; break;
      default: pixelSize = 40;
    }
  }

  // If user configured a custom image URL in Settings (data URL or external URL that isn't the old demo unsplash)
  const customLogo = settings.logoUrl && 
    !settings.logoUrl.includes('images.unsplash.com/photo-1555396273') &&
    settings.logoUrl !== '/logo.svg' &&
    settings.logoUrl !== '';

  if (customLogo) {
    return (
      <div 
        className={`relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${
          showBorder ? 'border-2 border-amber-500/60 shadow-md shadow-amber-500/20' : ''
        } ${className}`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <img
          src={settings.logoUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center"
        />
      </div>
    );
  }

  // Official High-Resolution The Fat Buddha Delight Logo Emblem
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 transition-transform duration-200 select-none ${
        showBorder ? 'border-2 border-amber-500/70 shadow-lg shadow-amber-500/25' : ''
      } ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      title={alt}
    >
      <img
        src="/logo.svg"
        alt={alt}
        className="w-full h-full object-contain"
        onError={(e) => {
          // Graceful inline fallback if standalone file has issue
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
};
