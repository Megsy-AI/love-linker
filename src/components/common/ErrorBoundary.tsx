import { Component, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { reportError } from "@/lib/errors";
import { captureAppError } from "@/lib/sentry";
import { isChunkLoadError, recoverFromChunkLoadError } from "@/lib/chunkRecovery";

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
    void reportError(error, {
      source: "react-error-boundary",
      context: { componentStack: info.componentStack?.slice(0, 1500) ?? null },
    });
    captureAppError(error, {
      source: "react-error-boundary",
      componentStack: info.componentStack?.slice(0, 1500) ?? null,
    });

    // React.lazy permanently caches a rejected import. Resetting this boundary
    // only throws the same error again and eventually causes React #185.
    // Recover a stale deploy with one guarded reload instead.
    recoverFromChunkLoadError(error);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.silentRetries = 0;
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (this.state.hasError) {
      const raw = this.state.error?.message ?? "";
      // Never leak raw "Minified React error #185; visit https://react.dev/..."
      // messages into the UI — they are confusing and non-actionable.
      const isReactMinified = /Minified React error #\d+/i.test(raw);
      const chunkFailed = isChunkLoadError(this.state.error);
      const detail = !raw || isReactMinified || chunkFailed
        ? "We couldn't load this screen. Reload to get the latest version."
        : raw.slice(0, 160);
      return (
        <div className="min-h-dvh bg-background text-foreground flex items-center justify-center p-6">
          <div className="text-center max-w-md space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">{detail}</p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return <ErrorBoundary resetKey={loc.pathname}>{children}</ErrorBoundary>;
}
