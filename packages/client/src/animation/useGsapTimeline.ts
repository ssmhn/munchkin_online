import { useRef, useEffect } from 'react';
import gsap from 'gsap';

export function useGsapTimeline(config?: gsap.TimelineVars) {
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    tlRef.current = gsap.timeline({ paused: true, ...config });
    return () => {
      tlRef.current?.kill();
    };
  }, []);

  return tlRef;
}
