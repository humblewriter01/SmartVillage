import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackLocale?: 'en' | 'ha';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SmartVillage Uncaught Error Boundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      const isHausa = this.props.fallbackLocale === 'ha' ||
        (typeof window !== 'undefined' && window.localStorage?.getItem('smartvillage.locale') === 'ha');

      return (
        <div className="min-h-screen bg-[#f6faf7] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-rose-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-2xs">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {isHausa ? 'Wani abu ya faru' : 'Something went wrong'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Wani abu ya faru. Don Allah sake buɗe manhajar.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Something went wrong. Please restart the app.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left overflow-x-auto text-[11px] font-mono text-slate-600 max-h-24">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isHausa ? 'Sake Loda Manhaja' : 'Reload Application'}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
