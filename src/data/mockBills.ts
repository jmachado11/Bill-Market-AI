import { Bill } from '@/types/bill';

export const mockBills: Bill[] = [
  {
    id: '1',
    title: 'Clean Energy Infrastructure Investment Act',
    description: 'A comprehensive bill to modernize America\'s energy infrastructure with renewable energy sources and create green jobs.',
    sponsor: {
      name: 'Rep. Sarah Johnson',
      party: 'D',
      state: 'CA'
    },
    introducedDate: '2024-01-15',
    lastAction: 'Referred to Committee on Energy and Commerce',
    lastActionDate: '2024-01-18',
    estimatedDecisionDate: '2024-03-15',
    passingLikelihood: 78,
    status: 'committee',
    chamber: 'house',
    affectedStocks: [
      {
        symbol: 'TSLA',
        companyName: 'Tesla Inc.',
        predictedDirection: 'up',
        confidence: 85,
        reasoning: 'Increased federal support for EV infrastructure would benefit Tesla\'s charging network and vehicle sales.'
      },
      {
        symbol: 'ENPH',
        companyName: 'Enphase Energy',
        predictedDirection: 'up',
        confidence: 82,
        reasoning: 'Solar energy infrastructure investments would drive demand for residential solar solutions.'
      },
      {
        symbol: 'XOM',
        companyName: 'Exxon Mobil',
        predictedDirection: 'down',
        confidence: 71,
        reasoning: 'Shift away from fossil fuels could impact traditional oil company valuations.'
      }
    ]
  },
  {
    id: '2',
    title: 'Healthcare Price Transparency Enhancement Act',
    description: 'Requires hospitals and insurance companies to provide clear, upfront pricing for all medical services and procedures.',
    sponsor: {
      name: 'Sen. Michael Chen',
      party: 'R',
      state: 'TX'
    },
    introducedDate: '2024-01-22',
    lastAction: 'Passed Senate Committee on Health, Education, Labor and Pensions',
    lastActionDate: '2024-02-05',
    estimatedDecisionDate: '2024-02-28',
    passingLikelihood: 92,
    status: 'floor',
    chamber: 'senate',
    affectedStocks: [
      {
        symbol: 'UNH',
        companyName: 'UnitedHealth Group',
        predictedDirection: 'down',
        confidence: 76,
        reasoning: 'Price transparency requirements could pressure insurance companies to reduce premiums and improve efficiency.'
      },
      {
        symbol: 'CVS',
        companyName: 'CVS Health',
        predictedDirection: 'up',
        confidence: 68,
        reasoning: 'Transparent pricing could benefit integrated healthcare providers with competitive pricing models.'
      }
    ]
  },
  {
    id: '3',
    title: 'Artificial Intelligence Research and Development Act',
    description: 'Establishes national AI research initiatives and provides funding for AI safety research at universities.',
    sponsor: {
      name: 'Rep. David Park',
      party: 'D',
      state: 'WA'
    },
    introducedDate: '2024-02-01',
    lastAction: 'Introduced in House',
    lastActionDate: '2024-02-01',
    estimatedDecisionDate: '2024-05-15',
    passingLikelihood: 45,
    status: 'introduced',
    chamber: 'house',
    affectedStocks: [
      {
        symbol: 'NVDA',
        companyName: 'NVIDIA Corporation',
        predictedDirection: 'up',
        confidence: 89,
        reasoning: 'Increased AI research funding would drive demand for high-performance computing chips.'
      },
      {
        symbol: 'GOOGL',
        companyName: 'Alphabet Inc.',
        predictedDirection: 'up',
        confidence: 83,
        reasoning: 'Government AI initiatives could benefit leading AI research companies through partnerships.'
      },
      {
        symbol: 'MSFT',
        companyName: 'Microsoft Corporation',
        predictedDirection: 'up',
        confidence: 87,
        reasoning: 'Cloud computing and AI platform demand would increase with expanded research initiatives.'
      }
    ]
  },
  {
    id: '4',
    title: 'Social Media Privacy Protection Act',
    description: 'Comprehensive data privacy legislation requiring explicit user consent for data collection and providing users with data portability rights.',
    sponsor: {
      name: 'Sen. Maria Rodriguez',
      party: 'D',
      state: 'NY'
    },
    introducedDate: '2024-01-10',
    lastAction: 'Markup scheduled in committee',
    lastActionDate: '2024-02-12',
    estimatedDecisionDate: '2024-04-01',
    passingLikelihood: 67,
    status: 'committee',
    chamber: 'senate',
    affectedStocks: [
      {
        symbol: 'META',
        companyName: 'Meta Platforms',
        predictedDirection: 'down',
        confidence: 91,
        reasoning: 'Stricter privacy regulations could significantly impact advertising revenue models.'
      },
      {
        symbol: 'GOOGL',
        companyName: 'Alphabet Inc.',
        predictedDirection: 'down',
        confidence: 88,
        reasoning: 'Data collection restrictions would affect targeted advertising capabilities.'
      },
      {
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        predictedDirection: 'up',
        confidence: 72,
        reasoning: 'Apple\'s privacy-focused approach could provide competitive advantage under new regulations.'
      }
    ]
  },
  {
    id: '5',
    title: 'Infrastructure Maintenance and Modernization Act',
    description: 'Allocates federal funding for bridge repairs, road maintenance, and broadband expansion in rural areas.',
    sponsor: {
      name: 'Rep. James Wilson',
      party: 'R',
      state: 'OH'
    },
    introducedDate: '2024-01-25',
    lastAction: 'Passed House Committee on Transportation and Infrastructure',
    lastActionDate: '2024-02-10',
    estimatedDecisionDate: '2024-03-20',
    passingLikelihood: 84,
    status: 'floor',
    chamber: 'house',
    affectedStocks: [
      {
        symbol: 'CAT',
        companyName: 'Caterpillar Inc.',
        predictedDirection: 'up',
        confidence: 79,
        reasoning: 'Infrastructure spending would increase demand for heavy machinery and construction equipment.'
      },
      {
        symbol: 'VZ',
        companyName: 'Verizon Communications',
        predictedDirection: 'up',
        confidence: 74,
        reasoning: 'Broadband expansion initiatives would benefit telecommunications infrastructure providers.'
      }
    ]
  }
];