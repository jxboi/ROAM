import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { isChunkLoadError } from '../lib/lazy-route';

type Props = { children: ReactNode; /** Changing this value clears the error, e.g. on navigation. */ resetKey?: string };
type ErrorState = { error: Error | null };

/**
 * Without a boundary, one thrown render turns the whole app into a blank page
 * and takes the user's unsaved trip edits with it. This keeps the failure local
 * and always offers a way back.
 */
export class ErrorBoundary extends Component<Props, ErrorState> {
  override state: ErrorState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorState {
    return { error };
  }

  override componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ROAM: unrecoverable render error', error, info.componentStack);
  }

  /**
   * React caches a lazy import's rejection for the life of the page, so
   * re-rendering a route whose chunk failed just re-throws the same error.
   * Only a fresh load can recover that one.
   */
  private retry() {
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ error: null });
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="container">
        <div className="empty-state" role="alert">
          <div className="empty-icon error-icon"><TriangleAlert size={34} /></div>
          <h2>That road just closed on us.</h2>
          <p>Something went wrong on this page. Your saved rides and trips are still stored in this browser.</p>
          <div className="error-actions">
            <button className="button primary" onClick={() => this.retry()}>Try this page again</button>
            <a className="button secondary" href="/">Back to the rides</a>
          </div>
        </div>
      </div>
    );
  }
}
