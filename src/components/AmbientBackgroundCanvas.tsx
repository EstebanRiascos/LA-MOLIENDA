import React, { useState, useEffect, useRef } from 'react';
import logoSvg from '../assets/la_molienda_logo.svg';

interface FloatingLogo {
  id: number;
  top: string;
  left: string;
  size: number;
  duration: number; // in seconds
}

export const AmbientBackgroundCanvas: React.FC = () => {
  const [logos, setLogos] = useState<FloatingLogo[]>([]);
  const idCounterRef = useRef(1);

  // Generates randomized positions strictly in background margins/gutters
  // Alternates zones so consecutive logos NEVER appear in the same area
  const getRandomPosition = (lastZone: number) => {
    const zones = [0, 1, 2, 3];
    const availableZones = zones.filter((z) => z !== lastZone);
    const chosenZone = availableZones[Math.floor(Math.random() * availableZones.length)];

    let top = '50%';
    let left = '50%';
    const size = Math.floor(Math.random() * 6) + 26; // 26px to 31px (discrete & small)

    switch (chosenZone) {
      case 0: // Left canvas gutter
        left = `${(Math.random() * 2.2 + 0.8).toFixed(2)}%`;
        top = `${(Math.random() * 75 + 12).toFixed(2)}%`;
        break;
      case 1: // Right canvas gutter
        left = `${(Math.random() * 2.2 + 96.2).toFixed(2)}%`;
        top = `${(Math.random() * 75 + 12).toFixed(2)}%`;
        break;
      case 2: // Bottom margin periphery
        left = `${(Math.random() * 76 + 12).toFixed(2)}%`;
        top = `${(Math.random() * 4 + 93.5).toFixed(2)}%`;
        break;
      case 3: // Top margin periphery (beneath header)
        left = `${(Math.random() * 76 + 12).toFixed(2)}%`;
        top = `${Math.floor(Math.random() * 20 + 72)}px`;
        break;
    }

    return { top, left, size, zone: chosenZone };
  };

  useEffect(() => {
    let lastZone = -1;
    const duration = 4.2; // 4.2 seconds lifetime

    const spawnLogo = () => {
      const pos = getRandomPosition(lastZone);
      lastZone = pos.zone;

      const newLogo: FloatingLogo = {
        id: idCounterRef.current++,
        top: pos.top,
        left: pos.left,
        size: pos.size,
        duration,
      };

      setLogos((prev) => {
        // Keep at most 4 active floating logos at any time
        const trimmed = prev.slice(-3);
        return [...trimmed, newLogo];
      });
    };

    // Spawn 2 initial logos immediately at opposite ends
    spawnLogo();
    setTimeout(spawnLogo, 700);

    // Continuous spawner: creates a new random logo every 1.3s
    const interval = setInterval(spawnLogo, 1300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ambient-background-canvas" aria-hidden="true">
      {logos.map((logo) => (
        <div
          key={logo.id}
          className="ambient-dynamic-logo"
          style={{
            top: logo.top,
            left: logo.left,
            width: `${logo.size}px`,
            height: `${logo.size}px`,
            animationDuration: `${logo.duration}s`,
          }}
        >
          <img src={logoSvg} alt="" className="ambient-logo-img" />
        </div>
      ))}
    </div>
  );
};
