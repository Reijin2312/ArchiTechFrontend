import { Component, ReactNode } from 'react';
import { logger } from '@/shared/lib/logger';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    logger.error('ErrorBoundary caught error', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert" className="p-4 text-red-600">
          Что-то пошло не так. Перезагрузите страницу.
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;