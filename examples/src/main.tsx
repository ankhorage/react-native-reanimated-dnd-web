import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './sortable-demo';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing #root container');
}

createRoot(rootElement).render(<App />);
