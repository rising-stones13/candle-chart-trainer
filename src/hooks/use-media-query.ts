'use client';

import { useState, useEffect } from 'react';

/**
 * A custom React hook that tracks the state of a media query.
 * @param {string} query - The media query string to watch.
 * @returns {boolean} - `true` if the media query matches, otherwise `false`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check on mount (and guard for server-side rendering)
    if (typeof window === 'undefined') {
      return;
    }
    
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => {
      setMatches(media.matches);
    };

    // Use the modern addEventListener method
    media.addEventListener('change', listener);

    return () => {
      // Use the modern removeEventListener method
      media.removeEventListener('change', listener);
    };
  }, [matches, query]);

  return matches;
}
