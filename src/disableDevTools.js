// src/lib/disableDevTools.js
import { useEffect } from 'react';

export const DisableDevTools = () => {
  useEffect(() => {
    // Simple devtools disable check
    const checkDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        console.log('DevTools detected');
        // You can add more actions here if needed
      }
    };
    
    window.addEventListener('resize', checkDevTools);
    return () => window.removeEventListener('resize', checkDevTools);
  }, []);

  return null;
};