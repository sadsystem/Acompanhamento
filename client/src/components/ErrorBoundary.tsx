import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-background flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="text-lg font-semibold text-red-600 mb-4">Ocorreu um erro</div>
            <div className="text-sm text-gray-600 mb-4">
              A aplicação encontrou um erro inesperado. Por favor, recarregue a página.
            </div>
            <div className="bg-gray-100 p-4 rounded-md text-xs text-left mb-4 max-h-32 overflow-auto">
              {this.state.error?.message || 'Erro desconhecido'}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}