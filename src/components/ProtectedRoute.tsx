import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setIsAuthenticated(false);
          navigate("/", { replace: true });
        } else {
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        setIsAuthenticated(false);
        navigate("/", { replace: true });
      }
    };

    checkAuth();
  }, [navigate]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0B0F0E] text-white flex items-center justify-center">
        <p className="text-white/60">Loading…</p>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};
