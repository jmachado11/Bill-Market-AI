import { useState, useEffect, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";

import { Navbar } from "@/components/Navbar";
import { BillCard } from "@/components/BillCard";
import { FilterSidebar } from "@/components/FilterSidebar";
import { BillDetails } from "@/components/BillDetails";
import { EmailPrompt } from "@/components/EmailPrompt";

import { supabase } from "@/integrations/supabase/client";
import { Bill, SortOption, FilterOption } from "@/types/bill";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!
);

/* -------------------------------------------------------------------------- */
/*                               React Component                              */
/* -------------------------------------------------------------------------- */

const Index = () => {
  /* ── UI state ──────────────────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  /* ── Data/state ────────────────────────────────────────────────────────── */
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  /* ── UX helpers ────────────────────────────────────────────────────────── */
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);

  /* ---------------------------------------------------------------------- */
  /*                       Initial subscription check                       */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const checkSubscription = async () => {
      const email = localStorage.getItem("user_email");
      if (!email) return;

      try {
        const { data, error } = await supabase.functions.invoke(
          "check-subscription",
          { body: { email } }
        );
        if (error) throw error;
        setIsSubscribed((data as any)?.is_subscribed);
      } catch (err) {
        console.error("Subscription check failed:", err);
      }
    };

    checkSubscription();
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                              Load bills                                */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke("get-bills");
        if (error) throw error;
        setBills((data as Bill[]) ?? []);
        setError(null);
      } catch (err) {
        console.error("Error fetching bills:", err);
        setError("Failed to load bills. Please try again later.");
        setBills([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                        Derived list: filter + sort                     */
  /* ---------------------------------------------------------------------- */
  const filteredAndSortedBills = useMemo(() => {
    let filtered = bills;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.sponsor.name.toLowerCase().includes(q)
      );
    }

    // Likelihood filter
    if (filterBy !== "all") {
      filtered = filtered.filter((b) => {
        if (filterBy === "high-likelihood") return b.passingLikelihood >= 0.7;
        if (filterBy === "medium-likelihood")
          return b.passingLikelihood >= 0.4 && b.passingLikelihood < 0.7;
        if (filterBy === "low-likelihood") return b.passingLikelihood < 0.4;
        return true;
      });
    }

    // Sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === "recent")
        return (
          new Date(b.introducedDate).getTime() -
          new Date(a.introducedDate).getTime()
        );
      if (sortBy === "likelihood")
        return b.passingLikelihood - a.passingLikelihood; // ← fixed bug
      if (sortBy === "decision-date")
        return (
          new Date(a.estimatedDecisionDate).getTime() -
          new Date(b.estimatedDecisionDate).getTime()
        );
      return 0;
    });
  }, [bills, searchQuery, sortBy, filterBy]);

  /* ---------------------------------------------------------------------- */
  /*                        Stripe checkout wrapper                         */
  /* ---------------------------------------------------------------------- */
  const startStripeCheckout = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        { body: { email } }
      );
      if (error) throw error;

      const { id } = data as { id?: string };
      if (!id) return alert("Stripe session failed to create.");

      const stripe = await stripePromise;
      if (!stripe) return alert("Stripe.js failed to load.");

      await stripe.redirectToCheckout({ sessionId: id });
    } catch (err) {
      console.error("Stripe checkout failed:", err);
      alert("Failed to start checkout.");
    }
  };

  /* ---------------------------------------------------------------------- */
  /*                         Subscribe button handler                       */
  /* ---------------------------------------------------------------------- */
  const handleSubscribe = async () => {
    const email = localStorage.getItem("user_email");
    if (!email) {
      setShowEmailPrompt(true);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "check-subscription",
        { body: { email } }
      );
      if (error) throw error;

      if ((data as any)?.is_subscribed) {
        setIsSubscribed(true);
      } else {
        await startStripeCheckout(email);
      }
    } catch (err) {
      console.error("Subscribe handler error:", err);
    }
  };

  /* ---------------------------------------------------------------------- */
  /*                                  JSX                                   */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-background">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* ───── Left column (bill list) ───── */}
          <div className="flex-1 min-w-0">
            <header className="mb-6">
              <h2 className="text-2xl font-bold mb-2">
                AI Legislative Market Predictions
              </h2>
              <p className="text-muted-foreground">
                Legislative Bills ({filteredAndSortedBills.length})
              </p>
            </header>

            <div className="grid gap-6">
              {loading ? (
                <p className="text-center text-lg py-12 text-muted-foreground">
                  Loading bills...
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
              ) : filteredAndSortedBills.length ? (
                <>
                  {filteredAndSortedBills
                    .slice(
                      0,
                      isSubscribed ? filteredAndSortedBills.length : 5
                    )
                    .map((bill) => (
                      <BillCard
                        key={bill.id}
                        bill={bill}
                        onViewDetails={setSelectedBill}
                      />
                    ))}

                  {!isSubscribed && filteredAndSortedBills.length > 5 && (
                    <div className="flex justify-center items-center mt-4">
                      <button
                        onClick={handleSubscribe}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 text-lg font-semibold shadow"
                      >
                        Subscribe to Pro to Unlock More Bills
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
          </div>

          {/* ───── Right column (filters) ───── */}
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

      {/* Drawer with bill details */}
      <BillDetails
        bill={selectedBill}
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
      />

      {/* Ask for an email if needed */}
      {showEmailPrompt && (
        <EmailPrompt
          onSubmit={async (email) => {
            localStorage.setItem("user_email", email);
            setShowEmailPrompt(false);

            try {
              const { data, error } = await supabase.functions.invoke(
                "check-subscription",
                { body: { email } }
              );
              if (error) throw error;

              if ((data as any)?.is_subscribed) {
                setIsSubscribed(true);
              } else {
                await startStripeCheckout(email);
              }
            } catch (err) {
              console.error("Email prompt subscription check failed:", err);
            }
          }}
        />
      )}
    </div>
  );
};

export default Index;
