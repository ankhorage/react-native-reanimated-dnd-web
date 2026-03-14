import React from 'react';
import { createRoot } from 'react-dom/client';
import { App as DraggableApp } from './draggable-harness';
import { App as SortableApp } from './sortable-demo';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Missing #root container');
}

const pathname = window.location.pathname;
const App = pathname.includes('/demos/draggable-') ? DraggableApp : SortableApp;

createRoot(rootElement).render(<App />);
