import { createRoot } from 'react-dom/client';
import Home from './app/page';
import './app/globals.css';
import './app/glass.css';
import './app/lab-refinement.css';
import { observeMobileViewport } from './lib/mobile-viewport';
const stopViewport = observeMobileViewport();
if (import.meta.hot) import.meta.hot.dispose(stopViewport);
createRoot(document.getElementById('root')!).render(<Home/>);
