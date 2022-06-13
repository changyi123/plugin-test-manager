import React from 'react';

class ErrorBoundary extends React.Component<
  unknown,
  {
    error?: Error;
    hasError: boolean;
  }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.info(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Error: {this.state.error.name}</h1>
          <p>{this.state.error.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary as any;
