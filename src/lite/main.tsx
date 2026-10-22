import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import LiteApp from './LiteApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LiteApp />
  </StrictMode>,
);
