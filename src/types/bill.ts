export interface Bill {
  id: string;
  title: string;
  description: string;
  sponsor: {
    name: string;
    party: string;
    state: string;
  };
  introducedDate: string;
  lastAction: string;
  lastActionDate: string;
  estimatedDecisionDate: string;
  passingLikelihood: number; // 0-100
  status: 'introduced' | 'committee' | 'floor' | 'passed' | 'failed';
  chamber: 'house' | 'senate';
  affectedStocksId: string[];
  documentUrl?: string;
}

export interface StockPrediction {
  id:string;
  billId:string;
  symbol: string;
  companyName: string;
  predictedDirection: 'up' | 'down';
  confidence: number; // 0-100
  reasoning: string;
}

export type SortOption = 'recent' | 'likelihood' | 'decision-date';
export type FilterOption = 'all' | 'high-likelihood' | 'medium-likelihood' | 'low-likelihood';