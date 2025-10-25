import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BillCard } from "@/components/BillCard";
import { BillDetails } from "@/components/BillDetails";
import { supabase } from "@/integrations/supabase/client";
import { Bill } from "@/types/bill";
import { useBookmarks } from "@/hooks/useBookmarks";
import { ChevronLeft } from "lucide-react";

const Bookmarks = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [selected, setSelected] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { bookmarkedIds, isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke("get-bills");
        if (error) throw error;
        
        const allBills = (data as Bill[]) ?? [];
        const bookmarked = allBills.filter((b) => bookmarkedIds.has(b.id));
        setBills(bookmarked);
      } catch (e) {
        console.error("Error fetching bills:", e);
        setError("Failed to load bookmarks. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchBills();
  }, [bookmarkedIds]);

  const displayBills = useMemo(() => {
    let out = bills;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      out = out.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.sponsor.name.toLowerCase().includes(q)
      );
    }

    return out;
  }, [bills, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0B0F0E] text-white">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterToggle={() => {}}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 text-[#9FE870] hover:text-[#9FE870]/80 transition-colors mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to all bills
          </Link>
          
          <header>
            <h2 className="text-2xl font-bold mb-2">
              Bookmarked Bills
            </h2>
            <p className="text-white/60">
              Total bookmarked ({displayBills.length})
            </p>
          </header>
        </div>

        <div className="grid gap-6">
          {loading ? (
            <p className="text-center text-lg py-12 text-white/60">
              Loading bookmarks…
            </p>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 text-lg">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-[#9FE870] text-[#0B0F0E] font-semibold rounded-lg hover:bg-[#9FE870]/90"
              >
                Retry
              </button>
            </div>
          ) : displayBills.length ? (
            <>
              {displayBills.map((b) => (
                <BillCard
                  key={b.id}
                  bill={b}
                  onViewDetails={setSelected}
                  isBookmarked={isBookmarked(b.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-white/60 mb-4">
                {searchQuery
                  ? "No bookmarked bills match your search"
                  : "You haven't bookmarked any bills yet"}
              </p>
              {!searchQuery && (
                <Link
                  to="/app"
                  className="inline-block px-4 py-2 bg-[#9FE870] text-[#0B0F0E] font-semibold rounded-lg hover:bg-[#9FE870]/90"
                >
                  Browse bills
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bill details drawer */}
      <BillDetails
        bill={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};

export default Bookmarks;
