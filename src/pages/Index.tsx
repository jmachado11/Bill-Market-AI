import { useState, useMemo, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { BillCard } from '@/components/BillCard';
import { FilterSidebar } from '@/components/FilterSidebar';
import { BillDetails } from '@/components/BillDetails';
import { supabase } from '@/integrations/supabase/client';
import { Bill, SortOption, FilterOption } from '@/types/bill';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bills from Supabase
  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const response = await supabase.functions.invoke('get-bills');
        
        if (response.error) {
          throw response.error;
        }
        
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

  // Filter and sort bills
  const filteredAndSortedBills = useMemo(() => {
    let filtered = bills;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bill =>
        bill.title.toLowerCase().includes(query) ||
        bill.description.toLowerCase().includes(query) ||
        bill.sponsor.name.toLowerCase().includes(query) ||
        bill.affectedStocks.some(stock => 
          stock.symbol.toLowerCase().includes(query) ||
          stock.companyName.toLowerCase().includes(query)
        )
      );
    }

    // Apply likelihood filter
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

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime();
        case 'likelihood':
          return b.passingLikelihood - a.passingLikelihood*100;
        case 'decision-date':
          return new Date(a.estimatedDecisionDate).getTime() - new Date(b.estimatedDecisionDate).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [bills, searchQuery, sortBy, filterBy]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
      />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">
                AI Legislative Market Predictions
              </h2>
              <p className="text-muted-foreground">
                Legislative Bills ({filteredAndSortedBills.length})
              </p>
            </div>

            <div className="grid gap-6">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    Loading bills...
                  </p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-destructive text-lg">
                    {error}
                  </p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredAndSortedBills.length > 0 ? (
                filteredAndSortedBills.map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onViewDetails={setSelectedBill}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    No bills found matching your criteria
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Filter sidebar - Desktop */}
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

      {/* Filter sidebar - Mobile */}
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

      {/* Bill details modal */}
      <BillDetails
        bill={selectedBill}
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
      />
    </div>
  );
};

export default Index;
