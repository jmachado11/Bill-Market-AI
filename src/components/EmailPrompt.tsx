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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
        <div className="flex gap-2 mb-4">
          <button
            className={`flex-1 py-2 rounded-md ${
              mode === "signin" ? "bg-primary text-white" : "bg-muted"
            }`}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            className={`flex-1 py-2 rounded-md ${
              mode === "signup" ? "bg-primary text-white" : "bg-muted"
            }`}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full mb-3 px-3 py-2 border rounded-md bg-background"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <label className="block text-sm mb-1">Password</label>
        <input
          className="w-full mb-3 px-3 py-2 border rounded-md bg-background"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />

        {err && <p className="text-destructive text-sm mb-3">{err}</p>}

        <button
          onClick={submit}
          disabled={loading || !email || !password}
          className="w-full py-2 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {loading
            ? "Please wait…"
            : mode === "signup"
            ? "Create account"
            : "Sign in"}
        </button>

        <button
          className="mt-3 w-full py-2 rounded-md bg-muted"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default EmailPrompt;
