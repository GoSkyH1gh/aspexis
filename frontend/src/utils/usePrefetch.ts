import { useEffect } from "react";

/**
 * Hook to prefetch lazy-loaded modules in the background after a delay.
 * This improves perceived performance by loading heavy components during idle time.
 *
 * @param modules - Array of dynamic import functions to prefetch
 * @param delay - Milliseconds to wait before prefetching (default: 1500ms)
 */
export function usePrefetch(
  modules: Array<() => Promise<unknown>>,
  delay = 1500,
) {
  useEffect(() => {
    const timer = setTimeout(() => {
      modules.forEach((module) => {
        module().catch((err) => {
          // Silently fail - component will load on-demand if prefetch fails
          console.warn("Prefetch failed:", err);
        });
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, modules]);
}
