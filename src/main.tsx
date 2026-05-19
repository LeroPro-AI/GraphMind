import React, { StrictMode, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SettingsProvider } from './context/SettingsContext.tsx';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CRITICAL UI EXCEPTION:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center p-10 font-sans text-center">
          <div className="w-full max-w-md border border-red-500/30 bg-red-500/5 p-8 rounded-sm">
            <h1 className="text-[10px] uppercase tracking-[0.4em] font-bold text-red-500 mb-4">Neural Buffer Error</h1>
            <h2 className="text-2xl font-serif italic mb-6">Component Sequence Interrupted</h2>
            <p className="text-xs text-white/40 mb-8 leading-relaxed">
              The neural mapping engine encountered a critical state inconsistency. 
            </p>
            <pre className="text-[10px] font-mono bg-black/40 p-4 mb-8 overflow-auto border border-white/5 text-red-400 text-left">
              {this.state.error?.message}
            </pre>
            <button 
              onClick={() => window.location.reload()} 
              className="px-8 py-3 border border-red-500 text-red-500 text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.1)]"
            >
              Reset Protocol
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
