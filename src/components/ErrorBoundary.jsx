import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error,
            errorInfo
        });
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-red-900/20 rounded-lg border border-red-500/50">
                    <h2 className="text-red-400 text-lg font-semibold mb-4">
                        An error occurred while loading the analytics
                    </h2>
                    <div className="bg-black/30 p-4 rounded mb-4">
                        <p className="text-gray-300 font-mono text-sm">
                            {this.state.error?.message}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-sm"
                        >
                            Retry
                        </button>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;