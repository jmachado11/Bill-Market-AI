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
      // User has a subscription, navigate to app
      navigate('/app');
    } else {
      // User doesn't have subscription, start checkout
      await startCheckout(email);
    }
  };

  return (
    <div className="min-h-screen bg-[#fefefe]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-black/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg">
                <img
                  src="Bill Market Logo - Alternate.png"
                  className="h-full w-full object-contain"
                  alt="Bill Market Logo"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Bill Market AI</h1>
                <p className="text-xs text-muted-foreground">
                  Invest Like a Politician
                </p>
              </div>
            </Link>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSignInOrTrial}
                disabled={loading}
                className="px-6 py-2 text-black font-medium hover:text-[#487ef4] transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Sign in"}
              </button>
              <button
                onClick={handleSignInOrTrial}
                disabled={loading}
                className="px-6 py-2 bg-[#487ef4] text-white font-semibold rounded-lg hover:bg-[#487ef4]/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Start Free Trial"}
                <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="px-4 py-16 md:py-24 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Giving you the same insights{" "}
              <span className="text-[#487ef4]">they have</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-black/40 leading-relaxed">
              Our advanced AI analyzes proposed legislation to predict stock market movements before they happen. Get ahead of the market with data-driven insights.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSignInOrTrial}
                disabled={loading}
                className="px-8 py-4 bg-[#487ef4] text-white font-semibold rounded-lg hover:bg-[#487ef4]/90 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Start Free Trial"}
                <Zap className="w-4 h-4" />
              </button>
              <button
                onClick={handleSignInOrTrial}
                disabled={loading}
                className="px-8 py-4 border border-black/20 text-black font-semibold rounded-lg hover:bg-black/5 transition-colors inline-flex items-center justify-center disabled:opacity-50"
              >
                {loading ? "Loading..." : "Sign in"}
              </button>
            </div>
            
            <div className="pt-8 border-t border-black/15">
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#487ef4]">87%</div>
                  <div className="text-sm text-black/70">Accuracy rate</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#487ef4]">1000+</div>
                  <div className="text-sm text-black/70">Bills analyzed</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-[#487ef4]">2300+</div>
                  <div className="text-sm text-black/70">Companies Mapped</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-black/20 p-6 shadow-lg shadow-[#487ef4]/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#487ef4]/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#487ef4]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Real time analysis</h3>
                  <p className="text-black/35 text-lg">
                    Instant predictions as bills are proposed, giving you the earliest market advantage.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-black/20 p-6 shadow-lg shadow-[#487ef4]/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#487ef4]/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#487ef4]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">High accuracy</h3>
                  <p className="text-black/35 text-lg">
                    Our AI model has been trained on thousands of historical bills and market reactions.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-black/20 p-6 shadow-lg shadow-[#487ef4]/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#487ef4]/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-[#487ef4]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Actionable insights</h3>
                  <p className="text-black/35 text-lg">
                    Clear buy/sell recommendations with confidence scores and impact timelines.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How AI Works Section */}
      <section className="px-4 py-16 md:py-24 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            How our AI predictions work
          </h2>
          <p className="text-xl md:text-2xl text-black/60 max-w-4xl mx-auto">
            Our sophisticated AI system processes government legislation in real-time to give you an edge in the market.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="relative">
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
              <div className="w-10 h-10 bg-[#487ef4] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">1</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-black/20 p-8 pt-12 shadow-lg shadow-[#487ef4]/25">
              <div className="w-16 h-16 bg-[#487ef4]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-[#487ef4]" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">Bill detection</h3>
              <p className="text-black/50 text-center">
                Our system monitors government databases and instantly identifies new proposed legislation.
              </p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
              <div className="w-10 h-10 bg-[#487ef4] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">2</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-black/20 p-8 pt-12 shadow-lg shadow-[#487ef4]/25">
              <div className="w-16 h-16 bg-[#487ef4]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-[#487ef4]" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">AI Analysis</h3>
              <p className="text-black/50 text-center">
                Advanced NLP algorithms analyze bill content, identifying potential market impacts across sectors.
              </p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
              <div className="w-10 h-10 bg-[#487ef4] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">3</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-black/20 p-8 pt-12 shadow-lg shadow-[#487ef4]/25">
              <div className="w-16 h-16 bg-[#487ef4]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-[#487ef4]" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">Impact Prediction</h3>
              <p className="text-black/50 text-center">
                Machine learning models predict which stocks will rise or fall based on historical patterns.
              </p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
              <div className="w-10 h-10 bg-[#487ef4] rounded-full flex items-center justify-center">
                <span className="text-white font-bold">4</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-black/20 p-8 pt-12 shadow-lg shadow-[#487ef4]/25">
              <div className="w-16 h-16 bg-[#487ef4]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="w-8 h-8 text-[#487ef4]" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">Actionable Alerts</h3>
              <p className="text-black/50 text-center">
                Receive instant notifications with confidence scores and recommended trading actions giving you a timley edge.
              </p>
            </div>
          </div>
        </div>
        
        {/* Understanding Predictions */}
        <div className="bg-white rounded-2xl border border-black/20 p-8 md:p-12 shadow-2xl shadow-[#487ef4]/30">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl md:text-3xl font-semibold mb-8">Understanding our Predictions</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-[#487ef4] rounded-full mt-2"></div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Confidence score</h4>
                    <p className="text-black/50">Shows how certain the AI is about the prediction (0-100%)</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-[#487ef4] rounded-full mt-2"></div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Estimated decision date</h4>
                    <p className="text-black/50">Shows the estimated date the bill is going to pass</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-[#487ef4] rounded-full mt-2"></div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">Affected stocks</h4>
                    <p className="text-black/50">
                      Shows a list of stocks that are going to be affected by the proposed bill
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="w-full max-w-2xl">
                <h4 className="text-lg font-semibold text-black/70 mb-6 text-center">Example prediction</h4>
                <div className="transform scale-90 sm:scale-95 shadow-xl shadow-[#487ef4]/25 rounded-2xl">
                  <BillCard
                    bill={{
                      id: 'example-1',
                      title: 'Artificial Intelligence Research and Development Act',
                      description: 'Establishes national AI research initiatives and provides funding for AI safety research at universities and private institutions.',
                      sponsor: {
                        name: 'Rep. David Park',
                        party: 'D',
                        state: 'WA'
                      },
                      introducedDate: '2024-02-01',
                      lastAction: 'Introduced in House',
                      lastActionDate: '2024-02-01',
                      estimatedDecisionDate: '2024-05-15',
                      passingLikelihood: 0.72,
                      status: 'committee',
                      chamber: 'house',
                      affectedStocks: [
                        {
                          symbol: 'NVDA',
                          companyName: 'NVIDIA Corporation',
                          predictedDirection: 'up',
                          confidence: 0.89,
                          reasoning: 'Increased AI research funding would drive demand for high-performance computing chips.'
                        },
                        {
                          symbol: 'GOOGL',
                          companyName: 'Alphabet Inc.',
                          predictedDirection: 'up',
                          confidence: 0.83,
                          reasoning: 'Government AI initiatives could benefit leading AI research companies through partnerships.'
                        },
                        {
                          symbol: 'MSFT',
                          companyName: 'Microsoft Corporation',
                          predictedDirection: 'up',
                          confidence: 0.87,
                          reasoning: 'Cloud computing and AI platform demand would increase with expanded research initiatives.'
                        }
                      ],
                      affectedStocksId: ['nvda', 'googl', 'msft'],
                      documentUrl: '#'
                    }}
                    onViewDetails={handleViewDetails}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bill Details Dialog */}
      <BillDetails
        bill={selectedBill}
        isOpen={isBillDetailsOpen}
        onClose={handleCloseBillDetails}
      />

      {/* Email Prompt */}
      {showEmailPrompt && (
        <EmailPrompt
          onAuthSuccess={handleAuthSuccess}
          onClose={() => setShowEmailPrompt(false)}
        />
      )}

      {/* Testimonials */}
      <section className="px-4 py-16 md:py-24 max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold text-black/70 text-center mb-12">
          What our users are saying
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl border border-black/20 p-8 shadow-lg shadow-[#487ef4]/20">
            <div className="mb-6">
              <div className="inline-block bg-[#487ef4]/15 text-[#487ef4] px-3 py-1 rounded-full text-xs font-semibold mb-4">
                Premium user
              </div>
              <p className="text-black/50 italic text-lg mb-6">
                "This platform helped me identify the EV sector boom before anyone else. Made 40% returns in two months."
              </p>
              <div className="border-t border-black/20 pt-4">
                <div className="font-semibold">James Machado</div>
                <div className="text-sm text-black/50">Day trader</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-black/20 p-8 shadow-lg shadow-[#487ef4]/20">
            <div className="mb-6">
              <div className="inline-block bg-[#487ef4]/15 text-[#487ef4] px-3 py-1 rounded-full text-xs font-semibold mb-4">
                Premium user
              </div>
              <p className="text-black/50 italic text-lg mb-6">
                "The accuracy is incredible. I've been using it for 6 months and it's consistently outperformed my previous strategies."
              </p>
              <div className="border-t border-black/20 pt-4">
                <div className="font-semibold">Sameen Majid</div>
                <div className="text-sm text-black/50">Portfolio Manager</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Trial Section */}
      <section className="px-4 py-16 md:py-24 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">Start Your Free Trial</h2>
          <p className="text-xl md:text-2xl text-black/60">
            30-day free trial, then $10/month. No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border-2 border-[#487ef4] p-8 md:p-12 shadow-lg shadow-[#487ef4]/25 text-center">
            <div className="mb-8">
              <div className="bg-[#487ef4] text-white px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 mb-6">
                <Star className="w-4 h-4" />
                30-Day Free Trial
              </div>

              <div className="text-6xl font-bold mb-4">
                <span className="text-[#487ef4]">Free</span>
              </div>
              <p className="text-xl text-black/60 mb-2">for 30 days</p>
              <p className="text-lg text-black/50">then $10/month</p>
            </div>

            <div className="space-y-4 mb-8 text-left max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4] flex-shrink-0" />
                <span>Unlimited bill predictions</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4] flex-shrink-0" />
                <span>Real-time stock impact analysis</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4] flex-shrink-0" />
                <span>Email and push notifications</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4] flex-shrink-0" />
                <span>Portfolio integration</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4] flex-shrink-0" />
                <span>Cancel anytime</span>
              </div>
            </div>

            <button
              onClick={handleSignInOrTrial}
              disabled={loading}
              className="w-full py-4 bg-[#487ef4] text-white font-semibold rounded-lg hover:bg-[#487ef4]/90 transition-colors inline-flex items-center justify-center gap-2 text-lg disabled:opacity-50"
            >
              {loading ? "Loading..." : "Start Free Trial"}
              <Zap className="w-5 h-5" />
            </button>

            <p className="text-sm text-black/50 mt-4">Cancel anytime</p>
          </div>
        </div>
      </section>
      {/* Compliance Footer */}
      <footer className="bg-black/5 border-t border-black/10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-sm text-black/60">
              Bill Market AI is a research tool. Not investment advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
