import { Calendar, User, TrendingUp, TrendingDown, ExternalLink, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bill } from '@/types/bill';
import { cn } from '@/lib/utils';

interface BillCardProps {
  bill: Bill;
  onViewDetails: (bill: Bill) => void;
}

export const BillCard = ({ bill, onViewDetails }: BillCardProps) => {
  const getLikelihoodColor = (likelihood: number) => {
    if (likelihood >= 0.7) return 'bg-likelihood-high text-white';
    if (likelihood >= 0.4) return 'bg-likelihood-medium text-white';
    return 'bg-likelihood-low text-white';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'passed': return 'default';
      case 'floor': return 'secondary';
      case 'committee': return 'outline';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-300 bg-[#0F1412] border border-white/10 text-white shadow-[#9FE870]/5 hover:border-[#9FE870]/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Title and Meta Info */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight mb-2 group-hover:text-primary transition-colors">
              {bill.title}
            </CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{bill.sponsor.name} ({bill.sponsor.party}-{bill.sponsor.state})</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Introduced {formatDate(bill.introducedDate)}</span>
              </div>
            </div>
          </div>

          {/* Likelihood and Status */}
          <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2">
            <div className={cn(
              'px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap',
              getLikelihoodColor(bill.passingLikelihood)
            )}>
              {Math.round(bill.passingLikelihood * 100)}% chance
            </div>
            <Badge variant={getStatusBadgeVariant(bill.status)} className="capitalize">
              {bill.status.replace('-', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-white/70 line-clamp-2">
          {bill.description}
        </p>

        <div className="space-y-2">
          <div className="text-sm text-white/60">
            <strong>Last Action:</strong> {bill.lastAction} ({formatDate(bill.lastActionDate)})
          </div>
          <div className="text-sm text-white/60">
            <strong>Est. Decision:</strong> {formatDate(bill.estimatedDecisionDate)}
          </div>
        </div>

        {bill.affectedStocks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4" />
              <span>Predicted Stock Impact</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {bill.affectedStocks.slice(0, 3).map((stock) => (
                <div
                  key={stock.symbol}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-sm"
                >
                  <span className="font-medium">{stock.symbol}</span>
                  {stock.predictedDirection === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-stock-up" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-stock-down" />
                  )}
                  <span className="text-xs text-white/60">
                    {Math.round(stock.confidence * 100)}%
                  </span>
                </div>
              ))}
              {bill.affectedStocks.length > 3 && (
                <div className="px-2 py-1 rounded-md bg-white/5 text-sm text-white/60">
                  +{bill.affectedStocks.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={() => onViewDetails(bill)}
            className="w-full sm:w-auto px-4 py-2 bg-[#9FE870] text-[#0B0F0E] font-semibold rounded-lg hover:bg-[#9FE870]/90"
          >
            View Details
          </button>
          {bill.documentUrl && (
            bill.documentUrl === '#' ? (
              <button className="w-full sm:w-auto px-4 py-2 rounded-lg border border-white/15 text-white/60 cursor-not-allowed">
                <ExternalLink className="h-4 w-4" />
              </button>
            ) : (
              <a href={bill.documentUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-lg border border-white/15 text-white hover:bg-white/5">
                  <ExternalLink className="h-4 w-4" />
                </a>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
};
