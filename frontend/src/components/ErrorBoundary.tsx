import React, { Component, ReactNode, ErrorInfo } from "react";
import { Link } from "react-router-dom";
import { FaExclamationTriangle } from "react-icons/fa";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex error-page">
          <h3 className="error-page-icon">:(</h3>
          <h1 className="error-page-header">Something went terribly wrong</h1>
          <p>
            An unexpected error occured while trying to render this page - that's why you're here now.
          </p>
          <Link to="/" onClick={() => this.setState({ hasError: false })} className="error-page-link">
            Return to Homepage
          </Link>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
