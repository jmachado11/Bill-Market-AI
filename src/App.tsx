import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import Bookmarks from "./pages/Bookmarks";
import AuthCallback from "./pages/AuthCallback";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Analytics } from "@vercel/analytics/next";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import CheckoutCancel  from "@/pages/CheckoutCancel";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const AppRoutes = () => {
  // Sync session state on window focus and periodically
  useEffect(() => {
    // When user returns to the window/tab, refresh the session
    const handleFocus = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session refresh on focus failed:", error);
          return;
        }
        
        if (session?.user?.email) {
          localStorage.setItem("user_email", session.user.email);
        } else {
          localStorage.removeItem("user_email");
        }
      } catch (e) {
        console.error("Focus handler error:", e);
      }
    };

    // Listen for window focus events
    window.addEventListener("focus", handleFocus);

    // Also check session periodically (every 5 minutes) to catch silent token refreshes
    const sessionCheckInterval = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.user?.email) {
          localStorage.setItem("user_email", session.user.email);
        }
      } catch (e) {
        console.error("Periodic session check error:", e);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(sessionCheckInterval);
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="/success" element={<CheckoutSuccess />} />
      <Route path="/cancel"  element={<CheckoutCancel  />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
