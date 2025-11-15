import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CheckoutCancel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleReturnToSite = async () => {
    const email = localStorage.getItem("user_email");

    setLoading(true);
    try {
      // Get the session to extract the auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setLoading(false);
        console.error("No active session:", sessionError);
        navigate("/");
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "check-subscription",
        { 
          body: { email },
          headers: { Authorization: `Bearer ${session.access_token}` }
        }
      );
      setLoading(false);

      if (error || !email) {
        console.error("Error checking subscription or no email:", error);
        navigate("/");
        return;
      }

      if ((data as any).is_subscribed) {
        navigate("/app");
      } else {
        navigate("/");
      }
    } catch (e) {
      setLoading(false);
      console.error("Handle return error:", e);
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F0E] text-white">
      <h1 className="text-3xl font-bold mb-2">Payment cancelled</h1>
      <p className="mb-8 text-white/70">No worries—your card was not charged.</p>
      <button
        onClick={handleReturnToSite}
        disabled={loading}
        className="px-6 py-3 bg-[#9FE870] text-[#0B0F0E] font-semibold rounded-lg hover:bg-[#9FE870]/90 disabled:opacity-50"
      >
        {loading ? "Loading..." : "Return to site"}
      </button>
    </div>
  );
};

export default CheckoutCancel;
