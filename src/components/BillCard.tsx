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
    if (likelihood >= 70) return 'bg-likelihood-high text-white';
    if (likelihood >= 40) return 'bg-likelihood-medium text-white';
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
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight mb-2 group-hover:text-primary transition-colors">
              {bill.title}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
          <div className="flex flex-col items-end gap-2">
            <div className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              getLikelihoodColor(bill.passingLikelihood)
            )}>
              {bill.passingLikelihood}% chance
            </div>
            <Badge variant={getStatusBadgeVariant(bill.status)} className="capitalize">
              {bill.status.replace('-', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {bill.description}
        </p>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            <strong>Last Action:</strong> {bill.lastAction} ({formatDate(bill.lastActionDate)})
          </div>
          <div className="text-sm text-muted-foreground">
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
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm"
                >
                  <span className="font-medium">{stock.symbol}</span>
                  {stock.predictedDirection === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-stock-up" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-stock-down" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {stock.confidence}%
                  </span>
                </div>
              ))}
              {bill.affectedStocks.length > 3 && (
                <div className="px-2 py-1 rounded-md bg-muted text-sm text-muted-foreground">
                  +{bill.affectedStocks.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => onViewDetails(bill)}
            variant="default"
            size="sm"
            className="flex-1"
          >
            View Details
          </Button>
          {bill.documentUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={bill.documentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};