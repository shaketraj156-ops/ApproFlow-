import React from 'react';
import valid8LogoImg from '../../assets/valid8-logo.png';

export function Valid8Logo({ className = 'w-9 h-9', alt = 'Valid8' }) {
  return (
    <img
      src={valid8LogoImg}
      alt={alt}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}

export default Valid8Logo;
