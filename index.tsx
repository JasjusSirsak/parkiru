import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles.css';

const THEME_MODE_KEY = 'parkiru:theme-mode';
const THEME_ACCENT_KEY = 'parkiru:theme-accent';

function applyPersistedTheme(): void {
  const savedMode = localStorage.getItem(THEME_MODE_KEY);
  const mode = savedMode === 'light' ? 'light' : 'dark';

  const root = document.documentElement;
  if (mode === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');

  const savedAccent = localStorage.getItem(THEME_ACCENT_KEY);
  if (savedAccent) {
    const match = savedAccent.match(/^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*$/);
    if (match) root.style.setProperty('--accent', `${match[1]} ${match[2]} ${match[3]}`);
  }
}

applyPersistedTheme();

// Send logs to parent frame (like a preview system)
function postToParent(level: string, ...args: any[]): void {
  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: 'iframe-console',
        level,
        args,
      },
      '*'
    );
  }
}

// Global error handler
window.onerror = function (message, source, lineno, colno, error) {
  const errPayload = {
    message,
    source,
    lineno,
    colno,
    stack: error?.stack,
  };
  postToParent('error', '[Meku_Error_Caught]', errPayload);
};

// Unhandled promise rejection
window.onunhandledrejection = function (event) {
  postToParent('error', '[Meku_Error_Caught]', { reason: event.reason });
};

// Patch console
(['log', 'warn', 'info', 'error'] as const).forEach((level) => {
  const original = console[level];
  console[level] = (...args: any[]) => {
    postToParent(level, ...args);
    original(...args);
  };
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);