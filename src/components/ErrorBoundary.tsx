import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Copy, Check, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { copyToClipboard } from '../utils/exportUtils';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  onReset?: () => void;
  scope?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isExpanded: boolean;
  isCopied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isExpanded: false,
    isCopied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary caught error${this.props.scope ? ` in ${this.props.scope}` : ''}]:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isExpanded: false,
      isCopied: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopy = async () => {
    const text = [
      `[Error Scope]: ${this.props.scope || 'App'}`,
      `[Message]: ${this.state.error?.message || 'Unknown Error'}`,
      `[Stack]:\n${this.state.error?.stack || 'No stack trace available'}`,
      `[Component Stack]:\n${this.state.errorInfo?.componentStack || 'No component stack'}`,
      `[Timestamp]: ${new Date().toISOString()}`,
    ].join('\n\n');

    await copyToClipboard(text);
    this.setState({ isCopied: true });
    setTimeout(() => this.setState({ isCopied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred.';
      const title = this.props.fallbackTitle || 'Component Error / စနစ်ချို့ယွင်းချက်';
      const subtitle =
        this.props.fallbackSubtitle ||
        'An error prevented this component from displaying correctly. You can try recovering below without losing your entire session.';

      return (
        <div className="my-6 max-w-3xl mx-auto rounded-3xl bg-zinc-950/95 border-2 border-rose-500/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden text-zinc-200">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-lg">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Crash Prevented
                </span>
                {this.props.scope && (
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Scope: {this.props.scope}
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{title}</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{subtitle}</p>
            </div>
          </div>

          {/* Error Message Box */}
          <div className="mb-6 p-4 rounded-2xl bg-zinc-900 border border-rose-950 font-mono text-xs sm:text-sm text-rose-300 break-all select-text shadow-inner">
            <div className="flex items-center gap-2 text-rose-400 font-bold mb-1 text-xs uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5" />
              <span>Captured Exception</span>
            </div>
            {errorMessage}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again / ပြန်လည်စတင်ရန်</span>
            </button>

            <button
              onClick={this.handleReload}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Page</span>
            </button>

            <button
              onClick={this.handleCopy}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              {this.state.isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Error Log</span>
                </>
              )}
            </button>

            <button
              onClick={() => this.setState({ isExpanded: !this.state.isExpanded })}
              className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              <span>{this.state.isExpanded ? 'Hide Trace' : 'View Stack Trace'}</span>
              {this.state.isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Collapsible Stack Trace */}
          {this.state.isExpanded && (
            <div className="mt-6 pt-4 border-t border-zinc-800 space-y-3">
              <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                Component Stack &amp; Diagnostic Trace
              </span>
              <pre className="p-4 rounded-xl bg-black border border-zinc-900 text-zinc-400 font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap break-all">
                {this.state.error?.stack || 'No JavaScript error stack.'}
                {'\n\nComponent Stack:'}
                {this.state.errorInfo?.componentStack || 'No React component stack available.'}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
