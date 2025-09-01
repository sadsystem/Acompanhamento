import { useState, useEffect } from 'react';
import versionInfo from '../config/version.json';
import { Badge } from './ui/badge';

export function VersionDisplay() {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="fixed top-2 right-4 z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Badge 
        variant="outline" 
        className="bg-white/80 backdrop-blur-sm text-xs cursor-help transition-all duration-200"
      >
        {isHovered 
          ? `${versionInfo.name} v${versionInfo.version} (${versionInfo.environment})` 
          : `v${versionInfo.version}`
        }
      </Badge>
    </div>
  );
}
