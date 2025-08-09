import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Menu as MenuIcon,
  X as CloseIcon,
  Search,
  Filter,
  TrendingUp,
} from "lucide-react";

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

/* ─── props ────────────────────────────────────────────────────── */
interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onFilterToggle: () => void;
}

/* ─── component ────────────────────────────────────────────────── */
export const Navbar = ({
  searchQuery,
  onSearchChange,
  onFilterToggle,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ─────────── Stripe helpers ─────────── */
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

  /* ─────────── JSX ─────────── */
  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-3 sm:p-6 lg:p-6 flex items-center justify-between">
          {/* Logo + title */}
          <Link to="/" className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg">
              <img
                src="Bill Market Logo - Alternate.png"
                className="h-full w-full object-contain"
                alt="Bill Market Logo"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Bill Market AI</h1>
              <p className="text-xs text-muted-foreground">
                Invest Like a Politician
              </p>
            </div>
          </Link>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-4 flex-1 justify-end">
            {/* search */}
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search bills…"
              className="max-w-xs"
            />

            {/* filter toggle */}
            <button
              onClick={onFilterToggle}
              className="p-2 rounded hover:bg-blue-500"
            >
              <Filter className="w-5 h-5" />
            </button>

            {/* manage subscription */}
            <Button onClick={handleManage} disabled={loading}>
              {loading ? "Loading…" : "Manage Subscription"}
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden p-2 rounded hover:blue"
          >
            {mobileOpen ? (
              <CloseIcon className="w-6 h-6" />
            ) : (
              <MenuIcon className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile collapsible panel */}
        {mobileOpen && (
          <div className="sm:hidden border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="container mx-auto px-4 py-4 space-y-4">
              {/* search */}
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search bills…"
                />
              </div>

              {/* filter */}
              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => {
                  setMobileOpen(false);
                  onFilterToggle();
                }}
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>

              {/* manage subscription */}
              <Button
                onClick={handleManage}
                disabled={loading}
                className="w-full flex items-center justify-center"
              >
                {loading ? "…" : "Manage Subscription"}
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* email prompt */}
      {showEmailPrompt && (
        <EmailPrompt
          onSubmit={async (email) => {
            localStorage.setItem("user_email", email);
            setShowEmailPrompt(false);
            await handleManage();
          }}
        />
      )}
    </>
  );
};
