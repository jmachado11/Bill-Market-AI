import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailPrompt } from "@/components/EmailPrompt";

import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";

/* ─── publishable key (Vite or Next) ───────────────────────────── */
const pk =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const stripePromise = pk ? loadStripe(pk) : null;

/* ─── component ────────────────────────────────────────────────── */
interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onFilterToggle: () => void;
}
export const Navbar = ({
  searchQuery,
  onSearchChange,
  onFilterToggle,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);

  /* 1️⃣  Fetch Stripe customer portal URL */
  const openPortal = async (email: string) => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "create-portal-session",
      { body: { email } }
    );
    setLoading(false);
    if (error) return alert(error.message);
    window.location.href = (data as { url: string }).url;
  };

  /* 2️⃣  Start new checkout */
  const startCheckout = async (email: string) => {
    if (!stripePromise) return alert("Stripe not configured.");
    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      { body: { email } }
    );
    setLoading(false);
    if (error) return alert(error.message);

    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId: (data as { id: string }).id });
  };

  /* 3️⃣  Main click handler */
  const handleManage = async () => {
    const email = localStorage.getItem("user_email");
    if (!email) {
      setShowEmailPrompt(true);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "check-subscription",
      { body: { email } }
    );
    setLoading(false);
    if (error) return alert(error.message);

    if ((data as any).is_subscribed) {
      await openPortal(email);
    } else {
      await startCheckout(email);
    }
  };

  /* ─── JSX ────────────────────────────────────────────────────── */
  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 sm:p-6 lg:p-8 flex items-center justify-between">
          {/* Logo + title */}
         <div className="flex justify-center sm:justify-start">
            <div className="flex items-center space-x-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg">
                <img
                  src="Bill Market Logo - Alternate.png"
                  className="h-full w-full object-contain"
                  alt="Bill Market Logo"
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-xl font-bold text-foreground">
                  Bill Market AI
                </h1>
                <p className="text-base sm:text-sm text-muted-foreground">
                  Invest Like a Politician
                </p>
              </div>
            </div>
          </div>

          {/* Search (hidden on very small screens) */}
          <div className="flex-1 mx-6 max-w-xl hidden sm:flex">
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search bills by title, sponsor, or topic…"
            />
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-3">
            {/* Toggle filter on mobile */}
            <button
              onClick={onFilterToggle}
              className="sm:hidden p-2 rounded hover:bg-accent"
            >
              <Filter className="w-5 h-5" />
            </button>

            {/* Manage sub button */}
            <Button onClick={handleManage} disabled={loading}>
              {loading ? "Loading…" : "Manage Subscription"}
            </Button>
          </div>
        </div>
      </nav>

      {/* email prompt modal */}
      {showEmailPrompt && (
        <EmailPrompt
          onSubmit={async (email) => {
            localStorage.setItem("user_email", email);
            setShowEmailPrompt(false);
            await handleManage(); // retry with email now stored
          }}
        />
      )}
    </>
  );
};
