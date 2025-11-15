import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        // Supabase automatically parses the callback URL with the token
        // and establishes the session in localStorage
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setStatus("error");
          setErrorMsg("Failed to confirm email. Please try again or contact support.");
          console.error("Session error:", error);
          // Redirect to login after 3 seconds
          setTimeout(() => navigate("/"), 3000);
          return;
        }

        if (session) {
          // Session is now established, store email and redirect to subscription check
          const email = session.user?.email;
          if (email) {
            localStorage.setItem("user_email", email);
          }
          
          setStatus("success");
          
          // Give user a moment to see the success message, then redirect
          setTimeout(() => {
            navigate("/", { replace: true, state: { showCheckoutFlow: true } });
          }, 1500);
        } else {
          // No session found
          setStatus("error");
          setErrorMsg("Confirmation failed. Please sign in with your email and password.");
          setTimeout(() => navigate("/"), 3000);
        }
      } catch (e) {
        console.error("Auth callback error:", e);
        setStatus("error");
        setErrorMsg("An unexpected error occurred. Please try signing in manually.");
        setTimeout(() => navigate("/"), 3000);
      }
    };

    handleConfirmation();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0F0E] text-white">
      {status === "processing" && (
        <>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9FE870] mb-4"></div>
          <p className="text-lg text-white/70">Confirming your email...</p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-3xl font-bold mb-2">Email confirmed!</h1>
          <p className="text-white/70 mb-4">Redirecting you to set up your account...</p>
        </>
      )}

      {status === "error" && (
        <>
          <div className="text-5xl mb-4">⚠</div>
          <h1 className="text-3xl font-bold mb-2">Confirmation failed</h1>
          <p className="text-white/70 mb-4">{errorMsg}</p>
          <p className="text-sm text-white/50">Redirecting in 3 seconds...</p>
        </>
      )}
    </div>
  );
};

export default AuthCallback;
