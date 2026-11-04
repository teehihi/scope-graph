import { useEffect, useRef, useState } from 'react';

/**
 * Sticky header behaviour: always visible at the top of the page,
 * hidden while scrolling down, shown again while scrolling up.
 * `hideAfter` is how far down the page must be before hiding starts,
 * so a small wiggle at the very top does not flicker the header.
 */
export function useHideHeaderOnScroll(hideAfter = 64): boolean {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const currentY = window.scrollY;
      const previousY = lastScrollY.current;
      lastScrollY.current = currentY;

      if (currentY <= 8 || currentY < previousY) {
        setIsVisible(true);
      } else if (currentY > previousY && currentY > hideAfter) {
        setIsVisible(false);
      }
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideAfter]);

  return isVisible;
}
