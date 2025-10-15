import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CheckoutSuccess = () => {
  const { search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const urlEmail = params.get("email");

    (async () => {
      // Prefer the authed user’s email; fall back to URL param if necessary
      const { data: sessionRes } = await supabase.auth.getSession();
      const email = sessionRes.session?.user?.email ?? urlEmail;
      if (email) {
        // Warm subscription status so the UI flips to Pro immediately
        await supabase.functions.invoke("check-subscription", {
          body: { email },
        });
      }
    })();
  }, [search]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F0E] text-white">
      <h1 className="text-3xl font-bold mb-2">🎉 Payment successful!</h1>
      <p className="mb-8 text-white/70">You now have full access to every bill.</p>
      <button
        onClick={() => navigate("/app")}
        className="px-6 py-3 bg-[#9FE870] text-[#0B0F0E] font-semibold rounded-lg hover:bg-[#9FE870]/90"
      >
        Go back to Bills
      </button>
    </div>
  );
};

export default CheckoutSuccess;
