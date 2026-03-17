import { useEffect } from "react";

const DEFAULT_TITLE =
  "Aspexis | Minecraft Player Stats - Hypixel, Wynncraft & More";

/**
 * Sets the document title while the component is mounted.
 * Pass a prefix string to get "<prefix> | Aspexis", or omit/pass ""
 * to restore the full default title.
 */
export function usePageTitle(prefix?: string) {
  useEffect(() => {
    document.title = prefix ? `${prefix} | Aspexis` : DEFAULT_TITLE;

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [prefix]);
}
