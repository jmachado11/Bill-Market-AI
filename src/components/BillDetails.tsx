import {
  X,
  Calendar,
  User,
  Building2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Bill } from '@/types/bill';
import { cn } from '@/lib/utils';

interface BillDetailsProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BillDetails = ({ bill, isOpen, onClose }: BillDetailsProps) => {
  if (!bill) return null;

  const getLikelihoodColor = (likelihood: number) => {
    if (likelihood >= 0.7) return 'text-likelihood-high';
    if (likelihood >= 0.4) return 'text-likelihood-medium';
    return 'text-likelihood-low';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto px-4 sm:px-6 bg-[#0F1412] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl leading-tight pr-8">
            {bill.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-[#0F1412] border border-white/10 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Sponsor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Name:</strong> {bill.sponsor.name}</div>
                <div><strong>Party:</strong> {bill.sponsor.party}</div>
                <div><strong>State:</strong> {bill.sponsor.state}</div>
                <div><strong>Chamber:</strong> {bill.chamber === 'house' ? 'House of Representatives' : 'Senate'}</div>
              </CardContent>
            </Card>

            <Card className="bg-[#0F1412] border border-white/10 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline & Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Introduced:</strong> {formatDate(bill.introducedDate)}</div>
                <div><strong>Last Action:</strong> {formatDate(bill.lastActionDate)}</div>
                <div><strong>Est. Decision:</strong> {formatDate(bill.estimatedDecisionDate)}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <strong>Status:</strong>
                  <Badge variant="outline" className="capitalize">
                    {bill.status.replace('-', ' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Passing Likelihood */}
          <Card className="bg-[#0F1412] border border-white/10 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Passing Likelihood Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm sm:text-base font-medium">Probability of Passing</span>
                <span className={cn('text-xl font-bold', getLikelihoodColor(bill.passingLikelihood))}>
                  {Math.round(bill.passingLikelihood * 100)}%
                </span>
              </div>
              <Progress value={bill.passingLikelihood * 100} className="h-3" />
              <div className="text-sm text-white/60">
                <strong>Last Action:</strong> {bill.lastAction}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="bg-[#0F1412] border border-white/10 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bill Description
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/70 leading-relaxed">
              <p>{bill.description}</p>
              {bill.documentUrl && (
                <div className="mt-4">
                  <a href={bill.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 rounded-lg border border-white/15 text-white hover:bg-white/5">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Bill Text
                    </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Impact */}
          {bill.affectedStocks.length > 0 && (
            <Card className="bg-[#0F1412] border border-white/10 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Predicted Stock Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {bill.affectedStocks.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">{stock.symbol}</span>
                        {stock.predictedDirection === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-stock-up" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-stock-down" />
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            stock.predictedDirection === 'up'
                              ? 'border-stock-up text-stock-up'
                              : 'border-stock-down text-stock-down'
                          )}
                        >
                          {Math.round(stock.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <div className="text-sm text-white/60">
                        {stock.companyName}
                      </div>
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground">
                      {stock.reasoning}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
