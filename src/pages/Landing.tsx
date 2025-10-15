import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Zap, TrendingUp, Shield, Activity, FileText, Brain, Target, Bell, Check, Star } from "lucide-react";
import { BillCard } from "@/components/BillCard";
import { BillDetails } from "@/components/BillDetails";
import { EmailPrompt } from "@/components/EmailPrompt";
import { Bill } from "@/types/bill";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";

const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

export default function Landing() {
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isBillDetailsOpen, setIsBillDetailsOpen] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleViewDetails = (bill: Bill) => {
    setSelectedBill(bill);
    setIsBillDetailsOpen(true);
  };

  const handleCloseBillDetails = () => {
    setIsBillDetailsOpen(false);
    setSelectedBill(null);
  };

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
      { body: { email } }
    );
    setLoading(false);
    if (error) return alert(error.message);

    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId: (data as { id: string }).id });
  };

  const handleSignInOrTrial = async () => {
    setShowEmailPrompt(true);
  };

  const handleAuthSuccess = async (email: string) => {
    localStorage.setItem("user_email", email);
    setShowEmailPrompt(false);

    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "check-subscription",
      { body: { email } }
    );
    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    if ((data as any).is_subscribed) {
      navigate("/app");
    } else {
      await startCheckout(email);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0E] text-white">
      {/* NAV */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B0F0E]/80 backdrop-blur supports-[backdrop-filter]:bg-[#0B0F0E]/60 shadow-sm">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-2">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 sm:h-16 sm:w-16">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2F9ae0b9a9efa747faafdb185df7b3478c%2F12c966f4401c40ad8ef5d07f574c4bdf?format=webp&width=800"
                  alt="Bill Market AI Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="truncate">
                <h1 className="text-base sm:text-xl font-bold text-white leading-tight">Bill Market AI</h1>
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Hide sign-in button on xs; show primary CTA */}
              <button
                onClick={handleSignInOrTrial}
                disabled={loading}
                className="hidden sm:inline-flex px-5 py-2 text-white font-medium hover:text-[#9FE870] transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Sign in"}
              </button>
              <button
                onClick={handleSignInOrTrial}
                disabled={loading}
                className="inline-flex px-4 sm:px-6 py-2 bg-[#9FE870] text-[#0B0F0E] font-semibold rounded-lg hover:bg-[#9FE870]/90 transition-colors items-center gap-2 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Start Free Trial"}
                <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-10 md:py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Copy */}
          <div className="space-y-6 md:space-y-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Giving you the same insights{" "}
              <span className="text-[#9FE870]">they have</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-white/70 leading-relaxed">
              Our advanced AI analyzes proposed legislation to predict stock market movements before they happen. Get ahead of the market with data-driven insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={handleSignInOrTrial}
                disabled={loading}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#9FE870] text-[#0B0F0E] font-semibold rounded-lg hover:bg-[#9FE870]/90 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Start Free Trial"}
                <Zap className="w-4 h-4" />
              </button>
              <button
                onClick={handleSignInOrTrial}
                disabled={loading}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border border-white/15 text-white font-semibold rounded-lg hover:bg-white/5 transition-colors inline-flex items-center justify-center disabled:opacity-50"
              >
                {loading ? "Loading..." : "Sign in"}
              </button>
            </div>

            {/* Stats */}
            <div className="pt-6 md:pt-8 border-t border-white/10">
              <div className="grid grid-cols-3 gap-4 sm:gap-8">
                <div className="text-center sm:text-left">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#9FE870]">87%</div>
                  <div className="text-xs sm:text-sm text-white/60">Accuracy rate</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#9FE870]">1000+</div>
                  <div className="text-xs sm:text-sm text-white/60">Bills analyzed</div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-[#9FE870]">2300+</div>
                  <div className="text-xs sm:text-sm text-white/60">Companies mapped</div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-[#0F1412] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-md shadow-[#9FE870]/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#9FE870]/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[#9FE870]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2">Real time analysis</h3>
                  <p className="text-white/60 sm:text-lg">
                    Instant predictions as bills are proposed, giving you the earliest market advantage.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0F1412] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-md shadow-[#9FE870]/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#9FE870]/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-[#9FE870]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2">High accuracy</h3>
                  <p className="text-white/60 sm:text-lg">
                    Our AI model has been trained on thousands of historical bills and market reactions.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0F1412] rounded-2xl border border-white/10 p-5 sm:p-6 shadow-md shadow-[#9FE870]/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#9FE870]/10 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-[#9FE870]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2">Actionable insights</h3>
                  <p className="text-white/60 sm:text-lg">
                    Clear buy/sell recommendations with confidence scores and impact timelines.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-12 md:py-16 lg:py-24">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">
            How our AI predictions work
          </h2>
          <p className="text-base sm:text-xl md:text-2xl text-white/70 max-w-3xl md:max-w-4xl mx-auto">
            Our sophisticated AI system processes government legislation in real-time to give you an edge in the market.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-12 md:mb-16">
          {[
            { icon: FileText, title: "Bill detection", copy: "Our system monitors government databases and instantly identifies new proposed legislation." },
            { icon: Brain, title: "AI Analysis", copy: "Advanced NLP analyzes bill content, identifying potential market impacts across sectors." },
            { icon: Target, title: "Impact Prediction", copy: "Models predict which stocks will rise or fall based on historical patterns." },
            { icon: Bell, title: "Actionable Alerts", copy: "Get notifications with confidence scores and recommended actions for timely edges." },
          ].map((step, i) => (
            <div key={i} className="relative">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#9FE870] rounded-full flex items-center justify-center">
                  <span className="text-[#0B0F0E] text-sm sm:text-base font-bold">{i + 1}</span>
                </div>
              </div>
              <div className="bg-[#0F1412] rounded-2xl border border-white/10 p-6 sm:p-8 pt-12 shadow-md shadow-[#9FE870]/10">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#9FE870]/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <step.icon className="w-7 h-7 sm:w-8 sm:h-8 text-[#9FE870]" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4 text-center">{step.title}</h3>
                <p className="text-white/60 text-center text-sm sm:text-base">{step.copy}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Understanding Predictions */}
        <div className="bg-[#0F1412] rounded-2xl border border-white/10 p-6 sm:p-8 md:p-12 shadow-lg shadow-[#9FE870]/10">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
            <div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-6 md:mb-8">Understanding our Predictions</h3>
              <div className="space-y-5 sm:space-y-6">
                {[
                  { title: "Confidence score", copy: "Shows how certain the AI is about the prediction (0–100%)." },
                  { title: "Estimated decision date", copy: "Shows the estimated date the bill is likely to pass." },
                  { title: "Affected stocks", copy: "Lists stocks that may be impacted by the proposed bill." },
                ].map((row, idx) => (
                  <div key={idx} className="flex items-start gap-3 sm:gap-4">
                    <div className="w-2 h-2 bg-[#9FE870] rounded-full mt-2"></div>
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold mb-1">{row.title}</h4>
                      <p className="text-white/60 text-sm sm:text-base">{row.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-2xl">
                <h4 className="text-base sm:text-lg font-semibold text-white/70 mb-4 sm:mb-6 text-center">Example prediction</h4>
                <div className="rounded-2xl shadow-md shadow-[#9FE870]/10 overflow-hidden">
                  <BillCard
                    bill={{
                      id: "example-1",
                      title: "Artificial Intelligence Research and Development Act",
                      description:
                        "Establishes national AI research initiatives and provides funding for AI safety research at universities and private institutions.",
                      sponsor: { name: "Rep. David Park", party: "D", state: "WA" },
                      introducedDate: "2024-02-01",
                      lastAction: "Introduced in House",
                      lastActionDate: "2024-02-01",
                      estimatedDecisionDate: "2024-05-15",
                      passingLikelihood: 0.72,
                      status: "committee",
                      chamber: "house",
                      affectedStocks: [
                        {
                          symbol: "NVDA",
                          companyName: "NVIDIA Corporation",
                          predictedDirection: "up",
                          confidence: 0.89,
                          reasoning: "Increased AI research funding would drive demand for high-performance computing chips.",
                        },
                        {
                          symbol: "GOOGL",
                          companyName: "Alphabet Inc.",
                          predictedDirection: "up",
                          confidence: 0.83,
                          reasoning: "Government AI initiatives could benefit leading AI research companies through partnerships.",
                        },
                        {
                          symbol: "MSFT",
                          companyName: "Microsoft Corporation",
                          predictedDirection: "up",
                          confidence: 0.87,
                          reasoning: "Cloud computing and AI platform demand would increase with expanded research initiatives.",
                        },
                      ],
                      affectedStocksId: ["nvda", "googl", "msft"],
                      documentUrl: "#",
                    }}
                    onViewDetails={handleViewDetails}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BILL DETAILS DIALOG */}
      <BillDetails bill={selectedBill} isOpen={isBillDetailsOpen} onClose={handleCloseBillDetails} />

      {/* EMAIL PROMPT */}
      {showEmailPrompt && (
        <EmailPrompt onAuthSuccess={handleAuthSuccess} onClose={() => setShowEmailPrompt(false)} />
      )}

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-12 md:py-16 lg:py-24">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white/70 text-center mb-8 md:mb-12">
          What our users are saying
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
          {[{
            name: "James Machado",
            role: "Day trader",
            quote: `"This platform helped me identify the EV sector boom before anyone else. Made 40% returns in two months."`,
          },{
            name: "Sameen Majid",
            role: "Portfolio Manager",
            quote: `"The accuracy is incredible. I've been using it for 6 months and it's consistently outperformed my previous strategies."`,
          }].map((t, i) => (
            <div key={i} className="bg-[#0F1412] rounded-2xl border border-white/10 p-6 sm:p-8 shadow-md shadow-[#9FE870]/10">
              <div className="mb-4 sm:mb-6">
                <div className="inline-block bg-[#9FE870]/15 text-[#9FE870] px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold mb-4">
                  Premium user
                </div>
                <p className="text-white/70 italic text-base sm:text-lg mb-4 sm:mb-6">{t.quote}</p>
                <div className="border-t border-white/10 pt-3 sm:pt-4">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-white/60">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING / TRIAL */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-12 md:py-16 lg:py-24">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">Start Your Free Trial</h2>
          <p className="text-base sm:text-xl md:text-2xl text-white/70">
            30-day free trial, then $10/month. No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-[#0F1412] rounded-2xl border border-white/10 p-6 sm:p-8 md:p-12 shadow-lg shadow-black/40 text-center">
            <div className="mb-6 sm:mb-8">
              <div className="bg-[#9FE870] text-[#0B0F0E] px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 mb-4 sm:mb-6">
                <Star className="w-4 h-4" />
                30-Day Free Trial
              </div>

              <div className="text-5xl sm:text-6xl font-bold mb-2 sm:mb-4">
                <span className="text-[#9FE870]">Free</span>
              </div>
              <p className="text-lg sm:text-xl text-white/70 mb-1 sm:mb-2">for 30 days</p>
              <p className="text-base sm:text-lg text-white/60">then $10/month</p>
            </div>

            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 text-left max-w-md mx-auto">
              {[
                "Unlimited bill predictions",
                "Real-time stock impact analysis",
                "Email and push notifications",
                "Portfolio integration",
                "Cancel anytime",
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-[#9FE870] flex-shrink-0" />
                  <span className="text-sm sm:text-base">{feat}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSignInOrTrial}
              disabled={loading}
              className="w-full py-3 sm:py-4 bg-[#9FE870] text-[#0B0F0E] font-semibold rounded-lg hover:bg-[#9FE870]/90 transition-colors inline-flex items-center justify-center gap-2 text-base sm:text-lg disabled:opacity-50"
            >
              {loading ? "Loading..." : "Start Free Trial"}
              <Zap className="w-5 h-5" />
            </button>

            <p className="text-xs sm:text-sm text-white/60 mt-3 sm:mt-4">Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white/5 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-6 sm:py-8">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-white/60">
              Bill Market AI is a research tool. Not investment advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
