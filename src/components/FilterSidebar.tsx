import { X, ArrowUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  onFilterChange,
}: FilterSidebarProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Mobile Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <Card className="absolute right-0 top-0 h-full w-full sm:w-96 lg:relative lg:w-full lg:h-auto rounded-none lg:rounded-2xl bg-[#0F1412] border border-white/10 text-white shadow-lg shadow-[#9FE870]/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4 lg:px-6 lg:pt-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-5 w-5" />
            Filters & Sort
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 px-4 pb-6 lg:px-6">
          {/* Sort Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <Label className="text-sm font-medium">Sort By</Label>
            </div>
            <Select
              value={sortBy}
              onValueChange={(value: SortOption) => onSortChange(value)}
            >
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
            <Label className="text-sm font-medium">Filter</Label>
            <RadioGroup
              value={filterBy}
              onValueChange={(value: FilterOption) => onFilterChange(value)}
              className="space-y-2"
            >
              {[
                {
                  id: 'all',
                  value: 'all',
                  label: 'All Bills',
                  dotClass: '',
                },
                {
                  id: 'decision-soon',
                  value: 'decision-soon',
                  label: 'Decision Soon (Next 2 weeks)',
                  dotClass: '',
                },
                {
                  id: 'high',
                  value: 'high-likelihood',
                  label: 'High Likelihood (70%+)',
                  dotClass: 'bg-likelihood-high',
                },
                {
                  id: 'medium',
                  value: 'medium-likelihood',
                  label: 'Medium Likelihood (40-69%)',
                  dotClass: 'bg-likelihood-medium',
                },
                {
                  id: 'low',
                  value: 'low-likelihood',
                  label: 'Low Likelihood (<40%)',
                  dotClass: 'bg-likelihood-low',
                },
              ].map(({ id, value, label, dotClass }) => (
                <div key={id} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={id} />
                  <Label htmlFor={id} className="text-sm flex items-center gap-1">
                    {label}
                    {dotClass && (
                      <span
                        className={`ml-1 inline-block h-2 w-2 rounded-full ${dotClass}`}
                      />
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Reset Button */}
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
