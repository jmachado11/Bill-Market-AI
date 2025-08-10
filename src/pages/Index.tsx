import { useState, useEffect, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";

import { Navbar } from "@/components/Navbar";
import { BillCard } from "@/components/BillCard";
import { FilterSidebar } from "@/components/FilterSidebar";
import { BillDetails } from "@/components/BillDetails";
import { EmailPrompt } from "@/components/EmailPrompt";

import { supabase } from "@/integrations/supabase/client";
import { Bill, SortOption, FilterOption } from "@/types/bill";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

const Index = () => {
  /* ──────────────── UI + data state ──────────────── */
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [bills, setBills] = useState<Bill[]>([]);
  const [selected, setSelected] = useState<Bill | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pro, setPro] = useState(false);
  const [askMail, setAskMail] = useState(false);

  /* ────────── initial subscription check (Supabase Auth + guard) ─────────── */
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) console.error("getSession error:", sessErr);

        const email = session?.user?.email ?? null;
        const uid = session?.user?.id ?? null;

        if (!cancelled) {
          setUserEmail(email);
          setUserId(uid);
        }

        if (!email) {
          if (!cancelled) setPro(false);
          return; // don't call the function without an email
        }

        const { data, error } = await supabase.functions.invoke("check-subscription", {
          body: { email },
          headers: { "Content-Type": "application/json" },
        });

        if (error) {
          console.error("check-subscription error:", error);
          if (!cancelled) setPro(false);
          return;
        }

        if (!cancelled) setPro((data as any)?.is_subscribed);
      } catch (e) {
        console.error("Subscription check failed:", e);
        if (!cancelled) setPro(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      sync();
    });

    sync();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  /* ───────────── fetch bills on load ─────────────── */
  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke("get-bills");
        if (error) throw error;
        setBills((data as Bill[]) ?? []);
      } catch (e) {
        console.error("Error fetching bills:", e);
        setError("Failed to load bills. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  /* ─────────────── filter / sort ──────────────── */
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

    if (filterBy !== "all") {
      out = out.filter((b) => {
        if (filterBy === "high-likelihood") return b.passingLikelihood >= 0.7;
        if (filterBy === "medium-likelihood") return b.passingLikelihood >= 0.4 && b.passingLikelihood < 0.7;
        if (filterBy === "low-likelihood") return b.passingLikelihood < 0.4;
        return true;
      });
    }

    return [...out].sort((a, b) => {
      if (sortBy === "recent")
        return +new Date(b.introducedDate) - +new Date(a.introducedDate);
      if (sortBy === "likelihood")
        return b.passingLikelihood - a.passingLikelihood;
      if (sortBy === "decision-date")
        return +new Date(a.estimatedDecisionDate) - +new Date(b.estimatedDecisionDate);
      return 0;
    });
  }, [bills, searchQuery, sortBy, filterBy]);

  /* ─────────────── Stripe helpers ──────────────── */
  const checkout = async (email: string, uid: string | null) => {
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      { body: { email, user_id: uid } }
    );
    if (error) throw error;

    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId: (data as any).id });
  };

  const handleSubscribe = async () => {
    const email = userEmail;
    const uid = userId;

    if (!email) return setAskMail(true);

    const { data, error } = await supabase.functions.invoke("check-subscription", {
      body: { email },
    });
    if (error) return console.error(error);

    if ((data as any).is_subscribed) setPro(true);
    else await checkout(email, uid);
  };

  /* ─────────────────── JSX ─────────────────── */
  return (
    <div className="min-h-screen bg-background">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* ── Left column ── */}
          <main className="flex-1 min-w-0">
            <header className="mb-6">
              <h2 className="text-2xl font-bold mb-2">
                AI Legislative Market Predictions
              </h2>
              <p className="text-muted-foreground">
                Legislative Bills ({displayBills.length})
              </p>
            </header>

            <div className="grid gap-6">
              {loading ? (
                <p className="text-center text-lg py-12 text-muted-foreground">
                  Loading bills…
                </p>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-destructive text-lg">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                  >
                    Retry
                  </button>
                </div>
              ) : displayBills.length ? (
                <>
                  {displayBills
                    .slice(0, pro ? displayBills.length : 5)
                    .map((b) => (
                      <BillCard key={b.id} bill={b} onViewDetails={setSelected} />
                    ))}

                  {!pro && displayBills.length > 5 && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={handleSubscribe}
                        className="
                          sm:px-6 sm:py-3 px-4 py-2
                          bg-primary text-white rounded-lg font-semibold shadow
                          hover:bg-primary/90
                          text-sm sm:text-lg
                        "
                      >
                        <span className="hidden sm:inline">
                          Subscribe to Pro to Unlock More Bills
                        </span>
                        <span className="sm:hidden">Unlock Pro</span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-lg py-12 text-muted-foreground">
                  No bills found matching your criteria
                </p>
              )}
            </div>
          </main>

          {/* ── Right column (desktop filters) ── */}
          <aside className="hidden lg:block w-80">
            <div className="sticky top-24">
              <FilterSidebar
                isOpen
                onClose={() => {}}
                sortBy={sortBy}
                onSortChange={setSortBy}
                filterBy={filterBy}
                onFilterChange={setFilterBy}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <div className="lg:hidden">
        <FilterSidebar
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
        />
      </div>

      {/* Bill details drawer */}
      <BillDetails
        bill={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
      />

      {/* Email+Password auth modal */}
      {askMail && (
        <EmailPrompt
          onAuthSuccess={async () => {
            setAskMail(false);
            await handleSubscribe();
          }}
          onClose={() => setAskMail(false)}
        />
      )}
    </div>
  );
};

export default Index;
