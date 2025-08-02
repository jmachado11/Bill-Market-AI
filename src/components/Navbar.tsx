import { Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterToggle: () => void;
}

export const Navbar = ({ searchQuery, onSearchChange, onFilterToggle }: NavbarProps) => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          {/* Logo and Title */}
          <div className="flex justify-center sm:justify-start">
            <div className="flex items-center space-x-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg">
                <img
                  src="Bill Market Logo - Alternate.png"
                  className="h-full w-full object-contain"
                  alt="Bill Market Logo"
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-xl font-bold text-foreground">
                  Bill Market AI
                </h1>
                <p className="text-base sm:text-sm text-muted-foreground">
                  Invest Like a Politician
                </p>
              </div>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search bills by title, sponsor, or topic..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onFilterToggle}
              className="flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </Button>
          </div>

        </div>
      </div>
    </nav>
  );
};
