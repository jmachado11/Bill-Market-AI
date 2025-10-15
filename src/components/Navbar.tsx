import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu as MenuIcon,
  X as CloseIcon,
  Search,
  Filter,
} from "lucide-react";


import { Input } from "@/components/ui/input";
import { EmailPrompt } from "@/components/EmailPrompt";

import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";

/* ─── publishable key (Vite or Next) ───────────────────────────── */
const pk =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

/* ─── props ────���───────────────────────────────────────────────── */
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
  const navigate = useNavigate();
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
    navigate("/"); // Navigate to landing page
  };

  /* ─────────── JSX (same UI + style) ─────────── */
  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B0F0E]/80 backdrop-blur supports-[backdrop-filter]:bg-[#0B0F0E]/60 shadow-sm">
        <div className="container mx-auto px-3 sm:p-6 lg:p-6 flex items-center justify-between">
          {/* Logo + title */}
          <Link to="/app" className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-lg">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F9ae0b9a9efa747faafdb185df7b3478c%2F12c966f4401c40ad8ef5d07f574c4bdf?format=webp&width=800"
                className="h-full w-full object-contain"
                alt="Bill Market AI Logo"
              />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white leading-tight">Bill Market AI</h1>

            </div>
          </Link>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-4 flex-1 justify-end">
            {/* search */}
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search bills…"
              className="max-w-xs bg-[#0B0F0E] border-white/15 text-white placeholder-white/40"
            />

            {/* filter toggle */}
            <button
              onClick={onFilterToggle}
              className="p-2 rounded-lg border border-white/15 text-white hover:bg-white/5 transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>

            {/* account / manage */}
            {!userEmail ? (
              // not "signed in": show sign in/up (opens the same EmailPrompt as before)
              <button onClick={() => setShowEmailPrompt(true)} disabled={loading} className="inline-flex px-4 py-2 bg-[#9FE870] text-[#0B0F0E] font-semibold rounded-lg hover:bg-[#9FE870]/90 transition-colors disabled:opacity-50">
                {loading ? "Loading…" : "Sign in / Sign up"}
              </button>
            ) : (
              // "signed in": show email button with a tiny dropdown (Manage + Sign out)
              <div className="relative">
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  className="min-w-[10rem] justify-between inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 text-white hover:bg-white/5 transition-colors"
                >
                  {userEmail}
                  <span className="ml-2">▾</span>
                </button>
                {accountOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0F1412] text-white shadow-lg shadow-[#9FE870]/10"
                    onMouseLeave={() => setAccountOpen(false)}
                  >
                    <button
                      onClick={handleManage}
                      className="w-full text-left px-4 py-2 hover:bg-white/5 rounded-t-xl disabled:opacity-60"
                      disabled={loading}
                    >
                      {loading ? "Opening…" : "Manage subscription"}
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 hover:bg-white/5 rounded-b-xl"
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
            className="sm:hidden p-2 rounded-lg border border-white/15 text-white hover:bg-white/5"
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
          <div className="sm:hidden border-t border-white/10 bg-[#0B0F0E]/80 backdrop-blur supports-[backdrop-filter]:bg-[#0B0F0E]/60">
            <div className="container mx-auto px-4 py-4 space-y-4">
              {/* search */}
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search bills…"
                  className="bg-[#0B0F0E] border-white/15 text-white placeholder-white/40"
                />
              </div>

              {/* filter */}
              <button
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-white hover:bg-white/5"
                onClick={() => {
                  setMobileOpen(false);
                  onFilterToggle();
                }}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>

              {/* account / manage on mobile */}
              {!userEmail ? (
                <button
                  onClick={() => setShowEmailPrompt(true)}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-2 bg-[#9FE870] text-[#0B0F0E] font-semibold rounded-lg hover:bg-[#9FE870]/90 disabled:opacity-50"
                >
                  {loading ? "…" : "Sign in / Sign up"}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground px-1">
                    Signed in as <span className="font-medium">{userEmail}</span>
                  </div>
                  <button
                    onClick={handleManage}
                    disabled={loading}
                    className="w-full flex items-center justify-center px-4 py-2 rounded-lg border border-white/15 text-white hover:bg-white/5"
                  >
                    {loading ? "…" : "Manage subscription"}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center px-4 py-2 rounded-lg border border-white/15 text-white hover:bg-white/5"
                  >
                    Sign out
                  </button>
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
