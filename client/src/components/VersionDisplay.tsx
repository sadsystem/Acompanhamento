import { useState, useEffect } from 'react';
import versionInfo from '../config/version.json';
import { Badge } from './ui/badge';
import { SystemDiagnostics } from './SystemDiagnostics';

export function VersionDisplay() {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="fixed top-2 right-4 z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SystemDiagnostics 
        trigger={
          <Badge 
            variant="outline" 
            className="bg-white/80 backdrop-blur-sm text-xs cursor-pointer hover:bg-white/90 transition-all duration-200"
          >
            {isHovered 
              ? `SDA - Sistema de Acompanhamento v${versionInfo.version} (${versionInfo.environment})` 
              : `v${versionInfo.version}`
            }
          </Badge>
        }
      />
    </div>
  );
}
