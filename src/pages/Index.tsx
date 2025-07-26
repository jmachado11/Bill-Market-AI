import { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { BillCard } from '@/components/BillCard';
import { FilterSidebar } from '@/components/FilterSidebar';
import { BillDetails } from '@/components/BillDetails';
import { mockBills } from '@/data/mockBills';
import { Bill, SortOption, FilterOption } from '@/types/bill';

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // Filter and sort bills
  const filteredAndSortedBills = useMemo(() => {
    let filtered = mockBills;

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
            return bill.passingLikelihood >= 70;
          case 'medium-likelihood':
            return bill.passingLikelihood >= 40 && bill.passingLikelihood < 70;
          case 'low-likelihood':
            return bill.passingLikelihood < 40;
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
          return b.passingLikelihood - a.passingLikelihood;
        case 'decision-date':
          return new Date(a.estimatedDecisionDate).getTime() - new Date(b.estimatedDecisionDate).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [searchQuery, sortBy, filterBy]);

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
                Legislative Bills ({filteredAndSortedBills.length})
              </h2>
              <p className="text-muted-foreground">
                Track proposed legislation and predicted market impact
              </p>
            </div>

            <div className="grid gap-6">
              {filteredAndSortedBills.length > 0 ? (
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
