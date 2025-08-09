import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { inject } from '@vercel/analytics';
inject();
import { injectSpeedInsights } from '@vercel/speed-insights';
injectSpeedInsights();

createRoot(document.getElementById("root")!).render(<App />);
