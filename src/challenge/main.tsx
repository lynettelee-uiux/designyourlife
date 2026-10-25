import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import ChallengeApp from './ChallengeApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChallengeApp />
  </StrictMode>,
);
