import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CheckoutSuccess = () => {
  const { search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const email = params.get("email");

    // persist email locally so the rest of the app can pick it up
    if (email) localStorage.setItem("user_email", email);

    // optional: ping Edge Function to verify subscription immediately
    if (email) {
      supabase.functions.invoke("check-subscription", { body: { email } });
    }
  }, [search]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">🎉 Payment successful!</h1>
      <p className="mb-8">You now have full access to every bill.</p>
      <button
        onClick={() => navigate("/")}
        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
      >
        Go back to Bills
      </button>
    </div>
  );
};

export default CheckoutSuccess;
