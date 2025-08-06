import { useState, useEffect, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { BillCard } from '@/components/BillCard';
import { FilterSidebar } from '@/components/FilterSidebar';
import { BillDetails } from '@/components/BillDetails';
import { supabase } from '@/integrations/supabase/client';
import { Bill, SortOption, FilterOption } from '@/types/bill';
import { loadStripe } from '@stripe/stripe-js';
import { EmailPrompt } from '@/components/EmailPrompt';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      const email = localStorage.getItem('user_email');
      if (!email) return;
      const res = await fetch(`/functions/check-subscription?email=${email}`);
      const data = await res.json();
      setIsSubscribed(data?.is_subscribed);
    };
    checkSubscription();
  }, []);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const response = await supabase.functions.invoke('get-bills');
        if (response.error) throw response.error;
        setBills(response.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching bills:', err);
        setError('Failed to load bills. Please try again later.');
        setBills([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, []);

  const filteredAndSortedBills = useMemo(() => {
    let filtered = bills;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bill =>
        bill.title.toLowerCase().includes(query) ||
        bill.description.toLowerCase().includes(query) ||
        bill.sponsor.name.toLowerCase().includes(query)
      );
    }

    if (filterBy !== 'all') {
      filtered = filtered.filter(bill => {
        switch (filterBy) {
          case 'high-likelihood':
            return bill.passingLikelihood >= 0.7;
          case 'medium-likelihood':
            return bill.passingLikelihood >= 0.4 && bill.passingLikelihood < 0.7;
          case 'low-likelihood':
            return bill.passingLikelihood < 0.4;
          default:
            return true;
        }
      });
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime();
        case 'likelihood':
          return b.passingLikelihood - a.passingLikelihood * 100;
        case 'decision-date':
          return new Date(a.estimatedDecisionDate).getTime() - new Date(b.estimatedDecisionDate).getTime();
        default:
          return 0;
      }
    });
  }, [bills, searchQuery, sortBy, filterBy]);

  const startStripeCheckout = async (email: string) => {
    const res = await fetch('/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const { id } = await res.json();
    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId: id });
  };

  const handleSubscribe = async () => {
    const email = localStorage.getItem('user_email');
    if (!email) {
      setShowEmailPrompt(true);
      return;
    }
    const res = await fetch(`/functions/check-subscription?email=${email}`);
    const data = await res.json();
    if (data?.is_subscribed) {
      setIsSubscribed(true);
    } else {
      await startStripeCheckout(email);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">AI Legislative Market Predictions</h2>
              <p className="text-muted-foreground">Legislative Bills ({filteredAndSortedBills.length})</p>
            </div>

            <div className="grid gap-6">
              {loading ? (
                <p className="text-center text-lg py-12 text-muted-foreground">Loading bills...</p>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-destructive text-lg">{error}</p>
                  <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">Retry</button>
                </div>
              ) : filteredAndSortedBills.length > 0 ? (
                <>
                  {filteredAndSortedBills.slice(0, isSubscribed ? filteredAndSortedBills.length : 5).map((bill) => (
                    <BillCard key={bill.id} bill={bill} onViewDetails={setSelectedBill} />
                  ))}

                  {!isSubscribed && filteredAndSortedBills.length > 5 && (
                    <div className="flex justify-center items-center mt-4">
                      <button
                        onClick={handleSubscribe}
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 text-lg font-semibold shadow"
                      >
                        Subscribe to Pro to Unlock More Bills
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-lg py-12 text-muted-foreground">No bills found matching your criteria</p>
              )}
            </div>
          </div>

          <div className="hidden lg:block w-80">
            <div className="sticky top-24">
              <FilterSidebar
                isOpen={true}
                onClose={() => {}}
                sortBy={sortBy}
                onSortChange={setSortBy}
                filterBy={filterBy}
                onFilterChange={setFilterBy}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <FilterSidebar
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
        />
      </div>

      <BillDetails
        bill={selectedBill}
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
      />

      {showEmailPrompt && (
        <EmailPrompt onSubmit={async (email: string) => {
          localStorage.setItem('user_email', email);
          setShowEmailPrompt(false);
          const res = await fetch(`/functions/check-subscription?email=${email}`);
          const data = await res.json();
          if (data?.is_subscribed) {
            setIsSubscribed(true);
          } else {
            await startStripeCheckout(email);
          }
        }} />
      )}
    </div>
  );
};

export default Index;
