'use client';
import { useState, useEffect } from 'react';

// useIsMobile — returns true when viewport is < 768px
// Used sparingly; prefer CSS media queries via globals.css classes when possible.
export function useIsMobile(breakpoint = 767) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    // Safari fallback
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, [breakpoint]);
  return isMobile;
}
