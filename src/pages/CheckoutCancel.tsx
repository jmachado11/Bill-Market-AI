import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CheckoutCancel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleReturnToSite = async () => {
    const email = localStorage.getItem("user_email");

    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "check-subscription",
      { body: { email } }
    );
    setLoading(false);

    if (error || !email) {
      console.error("Error checking subscription or no email:", error);
      // On error or no email, go to landing page
      navigate("/");
      return;
    }

    if ((data as any).is_subscribed) {
      // User has subscription, go to app
      navigate("/app");
    } else {
      // User doesn't have subscription, go to landing page
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">Payment cancelled</h1>
      <p className="mb-8">No worries—your card was not charged.</p>
      <button
        onClick={handleReturnToSite}
        disabled={loading}
        className="px-6 py-3 bg-secondary rounded-lg hover:bg-secondary/90 disabled:opacity-50"
      >
        {loading ? "Loading..." : "Return to site"}
      </button>
    </div>
  );
};

export default CheckoutCancel;
