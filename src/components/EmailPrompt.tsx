import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onAuthSuccess: (email: string) => void;
  onClose?: () => void;
}

export function EmailPrompt({ onAuthSuccess, onClose }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: "https://billmarketai.com" },
        });
        if (error) throw error;
        if (!data.user) throw new Error("Signup failed: no user returned");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      onAuthSuccess(email);
      onClose?.();
    } catch (e: any) {
      setErr(e?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0F1412] border border-white/10 p-6 sm:p-8 text-white shadow-xl shadow-[#9FE870]/10">
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex w-full rounded-lg border border-white/10 bg-white/5 p-1">
            <button
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "signin"
                  ? "bg-[#9FE870] text-[#0B0F0E] shadow"
                  : "text-white/80 hover:bg-white/10"
              }`}
              onClick={() => setMode("signin")}
              disabled={loading}
            >
              Sign in
            </button>
            <button
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-[#9FE870] text-[#0B0F0E] shadow"
                  : "text-white/80 hover:bg-white/10"
              }`}
              onClick={() => setMode("signup")}
              disabled={loading}
            >
              Sign up
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading && email && password) submit();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm text-white/70 mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0F0E] border border-white/15 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#9FE870] focus:border-transparent"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0F0E] border border-white/15 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#9FE870] focus:border-transparent"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "Create a strong password" : "Your password"}
            />
          </div>

          {err && (
            <p className="text-destructive text-sm">{err}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 bg-[#9FE870] text-[#0B0F0E] font-semibold rounded-lg hover:bg-[#9FE870]/90 transition-colors inline-flex items-center justify-center disabled:opacity-50"
          >
            {loading
              ? "Please wait…"
              : mode === "signup"
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        <button
          className="mt-3 w-full py-3 border border-white/15 text-white font-semibold rounded-lg hover:bg-white/5 transition-colors"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default EmailPrompt;
