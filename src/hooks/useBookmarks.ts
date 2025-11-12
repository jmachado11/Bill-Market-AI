import { useState, useCallback, useEffect } from 'react';

const BOOKMARKS_STORAGE_KEY = 'bookmarked_bills';

export const useBookmarks = () => {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        setBookmarkedIds(new Set(ids));
      } catch (e) {
        console.error('Failed to parse bookmarks from localStorage:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const isBookmarked = useCallback((billId: string) => {
    return bookmarkedIds.has(billId);
  }, [bookmarkedIds]);

  const toggleBookmark = useCallback((billId: string) => {
    setBookmarkedIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(billId)) {
        updated.delete(billId);
      } else {
        updated.add(billId);
      }
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(updated)));
      return updated;
    });
  }, []);

  return {
    isLoaded,
    bookmarkedIds,
    isBookmarked,
    toggleBookmark,
  };
};
