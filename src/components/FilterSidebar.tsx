import { X, ArrowUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortOption, FilterOption } from '@/types/bill';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filterBy: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
}

export const FilterSidebar = ({
  isOpen,
  onClose,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange
}: FilterSidebarProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Backdrop for mobile */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <Card className="absolute right-0 top-0 h-full w-80 lg:relative lg:w-full lg:h-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters & Sort
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Sort Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <Label className="text-sm font-medium">Sort By</Label>
            </div>
            <Select value={sortBy} onValueChange={(value: SortOption) => onSortChange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="likelihood">Passing Likelihood</SelectItem>
                <SelectItem value="decision-date">Decision Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Filter by Likelihood</Label>
            <RadioGroup 
              value={filterBy} 
              onValueChange={(value: FilterOption) => onFilterChange(value)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="text-sm">All Bills</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high-likelihood" id="high" />
                <Label htmlFor="high" className="text-sm">
                  High Likelihood (70%+)
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-likelihood-high"></span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium-likelihood" id="medium" />
                <Label htmlFor="medium" className="text-sm">
                  Medium Likelihood (40-69%)
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-likelihood-medium"></span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low-likelihood" id="low" />
                <Label htmlFor="low" className="text-sm">
                  Low Likelihood (&lt;40%)
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-likelihood-low"></span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Additional Filters could go here */}
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                onSortChange('recent');
                onFilterChange('all');
              }}
              className="w-full"
            >
              Reset All Filters
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};