import { useEffect, useState } from "react";
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

  // "Signed in" = we have an email in localStorage (same as before)
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setUserEmail(localStorage.getItem("user_email"));
  }, []);

  /* ─────────── Stripe helpers (EXACT same behavior as before) ─────────── */
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
      { body: { email } } // ← unchanged
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

  const handleSignOut = async () => {
    // This is not Supabase Auth sign-out; we’re using the old email flow.
    localStorage.removeItem("user_email");
    setUserEmail(null);
    setAccountOpen(false);
  };

  /* ─────────── JSX (same UI + style) ─────────── */
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

            {/* account / manage */}
            {!userEmail ? (
              // not "signed in": show sign in/up (opens the same EmailPrompt as before)
              <Button onClick={() => setShowEmailPrompt(true)} disabled={loading}>
                {loading ? "Loading…" : "Sign in / Sign up"}
              </Button>
            ) : (
              // "signed in": show email button with a tiny dropdown (Manage + Sign out)
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="min-w-[10rem] justify-between"
                >
                  {userEmail}
                  <span className="ml-2">▾</span>
                </Button>
                {accountOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-md border bg-popover shadow-lg"
                    onMouseLeave={() => setAccountOpen(false)}
                  >
                    <button
                      onClick={handleManage}
                      className="w-full text-left px-4 py-2 hover:bg-accent rounded-t-md disabled:opacity-60"
                      disabled={loading}
                    >
                      {loading ? "Opening…" : "Manage subscription"}
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 hover:bg-accent rounded-b-md"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
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

              {/* account / manage on mobile */}
              {!userEmail ? (
                <Button
                  onClick={() => setShowEmailPrompt(true)}
                  disabled={loading}
                  className="w-full flex items-center justify-center"
                >
                  {loading ? "…" : "Sign in / Sign up"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground px-1">
                    Signed in as <span className="font-medium">{userEmail}</span>
                  </div>
                  <Button
                    onClick={handleManage}
                    disabled={loading}
                    className="w-full flex items-center justify-center"
                  >
                    {loading ? "…" : "Manage subscription"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center"
                  >
                    Sign out
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Email prompt (same contract as your original: returns an email string) */}
      {showEmailPrompt && (
        <EmailPrompt
          onAuthSuccess={async (email) => {
            localStorage.setItem("user_email", email); // ← same behavior as before
            setUserEmail(email);
            setShowEmailPrompt(false);
            // (optional) jump straight to manage flow after "sign in"
            // await handleManage();
          }}
          onClose={() => setShowEmailPrompt(false)}
        />
      )}
    </>
  );
};
