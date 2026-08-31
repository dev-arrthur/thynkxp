'use client';

import { useEffect } from 'react';

type MotionTarget = {
  selector: string;
  speed: number;
  direction: 'left' | 'right';
};

const TARGETS: MotionTarget[] = [
  { selector: '.thx-tool-track:not(.reverse)', speed: 34, direction: 'right' },
  { selector: '.thx-tool-track.reverse', speed: 31, direction: 'left' },
  { selector: '.thx-text-marquee:not(.reverse) > div', speed: 18, direction: 'left' },
  { selector: '.thx-text-marquee.reverse > div', speed: 16, direction: 'right' },
];

export default function ContinuousMarquees() {
  useEffect(() => {
    const items = TARGETS.map((target) => {
      const element = document.querySelector<HTMLElement>(target.selector);
      if (!element) return null;

      element.style.setProperty('animation', 'none', 'important');
      element.style.setProperty('translate', 'none', 'important');
      element.style.setProperty('will-change', 'transform');
      element.style.setProperty('backface-visibility', 'hidden');

      return {
        ...target,
        element,
        distance: Math.max(element.scrollWidth / 2, 1),
        offset: 0,
      };
    }).filter(Boolean) as Array<MotionTarget & {
      element: HTMLElement;
      distance: number;
      offset: number;
    }>;

    if (!items.length) return;

    const updateDistances = () => {
      items.forEach((item) => {
        item.distance = Math.max(item.element.scrollWidth / 2, 1);
        item.offset %= item.distance;
      });
    };

    const resizeObserver = new ResizeObserver(updateDistances);
    items.forEach((item) => resizeObserver.observe(item.element));
    window.addEventListener('resize', updateDistances, { passive: true });

    let frame = 0;
    let last = performance.now();

    const animate = (now: number) => {
      const deltaSeconds = Math.min((now - last) / 1000, 0.05);
      last = now;

      items.forEach((item) => {
        item.offset = (item.offset + item.speed * deltaSeconds) % item.distance;
        const x = item.direction === 'left'
          ? -item.offset
          : -item.distance + item.offset;

        item.element.style.setProperty(
          'transform',
          `translate3d(${x.toFixed(3)}px, 0, 0)`,
          'important',
        );
      });

      frame = requestAnimationFrame(animate);
    };

    updateDistances();
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDistances);
      items.forEach((item) => {
        item.element.style.removeProperty('animation');
        item.element.style.removeProperty('translate');
        item.element.style.removeProperty('will-change');
        item.element.style.removeProperty('backface-visibility');
        item.element.style.removeProperty('transform');
      });
    };
  }, []);

  return null;
}
