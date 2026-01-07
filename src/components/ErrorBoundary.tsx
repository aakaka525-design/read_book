import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-body">
                    <div className="text-center p-8 max-w-md">
                        <h1 className="text-2xl font-bold mb-4 text-red-500">出错了</h1>
                        <p className="text-secondary mb-6">
                            {this.state.error?.message || '发生了未知错误'}
                        </p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-6 py-2 bg-accent text-white rounded-full hover:opacity-90"
                        >
                            返回首页
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
