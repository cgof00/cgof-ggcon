import { useEffect, useRef } from 'react';

export const usePerformanceMonitor = (label: string) => {
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    return () => {
      const duration = Date.now() - startTimeRef.current;
      if (duration > 100) {
        console.warn(`⚠️ [PERFORMANCE] ${label} levou ${duration}ms (lento!)`);
      } else {
        console.log(`✅ [PERFORMANCE] ${label} levou ${duration}ms (rápido)`);
      }
    };
  }, [label]);
};

export const measurePerformance = (label: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;
  const icon = duration < 50 ? '✅' : duration < 200 ? '⚡' : '⚠️';
  console.log(`${icon} [${label}] ${duration.toFixed(2)}ms`);
  return duration;
};

export const measureAsync = async (label: string, fn: () => Promise<any>) => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  const icon = duration < 50 ? '✅' : duration < 500 ? '⚡' : '⚠️';
  console.log(`${icon} [${label}] ${duration.toFixed(2)}ms`);
  return result;
};
