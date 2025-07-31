import { X, Calendar, User, Building2, TrendingUp, TrendingDown, ExternalLink, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
      year: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl leading-tight pr-8">
            {bill.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bill Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Sponsor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><strong>Name:</strong> {bill.sponsor.name}</div>
                <div><strong>Party:</strong> {bill.sponsor.party}</div>
                <div><strong>State:</strong> {bill.sponsor.state}</div>
                <div><strong>Chamber:</strong> {bill.chamber === 'house' ? 'House of Representatives' : 'Senate'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline & Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><strong>Introduced:</strong> {formatDate(bill.introducedDate)}</div>
                <div><strong>Last Action:</strong> {formatDate(bill.lastActionDate)}</div>
                <div><strong>Est. Decision:</strong> {formatDate(bill.estimatedDecisionDate)}</div>
                <div className="flex items-center gap-2">
                  <strong>Status:</strong>
                  <Badge variant="outline" className="capitalize">
                    {bill.status.replace('-', ' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Passing Likelihood */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Passing Likelihood Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">Probability of Passing</span>
                  <span className={cn('text-2xl font-bold', getLikelihoodColor(bill.passingLikelihood))}>
                    {bill.passingLikelihood*100}%
                  </span>
                </div>
                <Progress value={bill.passingLikelihood*100} className="h-3" />
                <div className="text-sm text-muted-foreground">
                  <strong>Last Action:</strong> {bill.lastAction}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bill Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{bill.description}</p>
              {bill.documentUrl && (
                <div className="mt-4">
                  <Button variant="outline" asChild>
                    <a href={bill.documentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Bill Text
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Impact Analysis */}
          {bill.affectedStocks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Predicted Stock Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bill.affectedStocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">{stock.symbol}</span>
                            {stock.predictedDirection === 'up' ? (
                              <TrendingUp className="h-5 w-5 text-stock-up" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-stock-down" />
                            )}
                            <Badge 
                              variant="outline" 
                              className={cn(
                                stock.predictedDirection === 'up' 
                                  ? 'border-stock-up text-stock-up' 
                                  : 'border-stock-down text-stock-down'
                              )}
                            >
                              {stock.confidence}% confidence
                            </Badge>
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            {stock.companyName}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">{stock.reasoning}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};