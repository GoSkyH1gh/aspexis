import { useState, useEffect, useCallback } from "react";

const HISTORY_KEY = "search_history";
const MAX_HISTORY = 5;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load search history", e);
      return [];
    }
  });

  const addToHistory = useCallback((term: string) => {
    if (!term || !term.trim()) return;
    
    const cleanTerm = term.trim();
    
    setHistory((prev) => {
      // Remove existing to re-add at top (deduplication)
      // We essentially want to filter out any case-insensitive match
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== cleanTerm.toLowerCase()
      );
      
      const newHistory = [cleanTerm, ...filtered].slice(0, MAX_HISTORY);
      
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        // Dispatch event for other instances
        window.dispatchEvent(new Event("search-history-updated"));
      } catch (e) {
        console.error("Failed to save search history", e);
      }
      
      return newHistory;
    });
  }, []);

  const removeFromHistory = useCallback((term: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter((item) => item !== term);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
        window.dispatchEvent(new Event("search-history-updated"));
      } catch (e) {
        console.error("Failed to update search history", e);
      }
      return newHistory;
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) {
          setHistory(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to sync search history", e);
      }
    };

    window.addEventListener("search-history-updated", handleStorageChange);
    // Also listen to storage events (for other tabs)
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("search-history-updated", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return { history, addToHistory, removeFromHistory };
}
