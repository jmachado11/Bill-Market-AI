import { Link } from "react-router-dom";
import { Zap, TrendingUp, Shield, Activity, FileText, Brain, Target, Bell, Check, Star } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#fefefe]">
      {/* Hero Section */}
      <section className="px-4 py-16 md:py-24 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-[#487ef4]" />
              <span className="text-xl font-semibold text-[#487ef4]">Bill market</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Giving you the same insights{" "}
              <span className="text-[#487ef4]">they have</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-black/40 leading-relaxed">
              Our advanced AI analyzes proposed legislation to predict stock market movements before they happen. Get ahead of the market with data-driven insights.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/app"
                className="px-8 py-4 bg-[#487ef4] text-white font-semibold rounded-lg hover:bg-[#487ef4]/90 transition-colors inline-flex items-center justify-center gap-2"
              >
                Start Free Trial
                <Zap className="w-4 h-4" />
              </Link>
              <button className="px-8 py-4 border border-black/20 text-black font-semibold rounded-lg hover:bg-black/5 transition-colors">
                View demo
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
                  <div className="text-2xl md:text-3xl font-bold text-[#487ef4]">$2.1M+</div>
                  <div className="text-sm text-black/70">Saved for users</div>
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
        <div className="bg-white rounded-2xl border border-black/20 p-8 md:p-12 shadow-lg shadow-[#487ef4]/20">
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
                      Shows a list of stocks that are going to be affected by the proposed bill as well as predictions about the stock
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-black/70 mb-8">Example prediction</h4>
                <div className="text-lg font-semibold">Place example bill from main website</div>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      {/* Pricing */}
      <section className="px-4 py-16 md:py-24 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">Choose Your Plan</h2>
          <p className="text-xl md:text-2xl text-black/60">
            Start with our 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Starter Plan */}
          <div className="bg-white rounded-2xl border border-black/20 p-8 shadow-lg shadow-[#487ef4]/25">
            <h3 className="text-2xl md:text-3xl font-bold text-center mb-2">Starter</h3>
            <p className="text-black/50 text-center mb-6">Perfect for individual investors</p>
            
            <div className="text-center mb-8">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-black/50">/month</span>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>5 predictions available</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>Basic bill analysis</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>Email alerts</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>Access to basic features</span>
              </div>
            </div>
            
            <button className="w-full py-3 border border-black/20 text-black font-semibold rounded-lg hover:bg-black/5 transition-colors">
              Start free trial
            </button>
          </div>
          
          {/* Professional Plan */}
          <div className="relative bg-white rounded-2xl border-2 border-[#487ef4] p-8 shadow-lg shadow-[#487ef4]/25 scale-105">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-[#487ef4] text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                <Star className="w-4 h-4" />
                Most popular
              </div>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-bold text-center mb-2 mt-4">Professional</h3>
            <p className="text-black/50 text-center mb-6">Best for active traders</p>
            
            <div className="text-center mb-8">
              <span className="text-4xl font-bold">$10</span>
              <span className="text-black/50">/month</span>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>Unlimited predictions</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>Advanced bill analysis</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>Real-time alerts</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>Portfolio integration</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>Priority support</span>
              </div>
            </div>
            
            <button className="w-full py-4 bg-[#487ef4] text-white font-semibold rounded-lg hover:bg-[#487ef4]/90 transition-colors flex items-center justify-center gap-2">
              Get premium
              <Zap className="w-5 h-5" />
            </button>
          </div>
          
          {/* Enterprise Plan */}
          <div className="bg-white rounded-2xl border border-black/20 p-8 shadow-lg shadow-[#487ef4]/25">
            <h3 className="text-2xl md:text-3xl font-bold text-center mb-2">Enterprise</h3>
            <p className="text-black/50 text-center mb-6">For institutions and fund managers</p>
            
            <div className="text-center mb-8">
              <span className="text-4xl font-bold">$Custom</span>
              <span className="text-black/50">/month</span>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>Custom predictions volume</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>White-label solutions</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>API access</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>Custom integrations</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[#487ef4]" />
                <span>Dedicated support</span>
              </div>
            </div>
            
            <button className="w-full py-3 border border-black/20 text-black font-semibold rounded-lg hover:bg-black/5 transition-colors">
              Contact sales
            </button>
          </div>
        </div>
        
        {/* Money Back Guarantee */}
        <div className="max-w-md mx-auto mt-12">
          <div className="bg-white rounded-2xl border border-black/20 p-6 shadow-lg shadow-[#487ef4]/25">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#487ef4]/15 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-[#487ef4]" />
              </div>
              <div>
                <div className="font-semibold">30-day Money-back guarantee</div>
                <div className="text-sm text-black/50">Not satisfied? Get a full refund, no questions asked.</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
