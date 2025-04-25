import { Suspense } from 'react';
import Header from "../components/common/Header";
import ErrorBoundary from '../components/ErrorBoundary';
import AIPoweredInsights from '../components/analytics/AIPoweredInsights';

const LoadingFallback = () => (
    <div className="p-6 bg-gray-800/50 rounded-lg animate-pulse">
        <div className="h-8 bg-gray-700/50 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
            <div className="h-4 bg-gray-700/50 rounded w-full"></div>
            <div className="h-4 bg-gray-700/50 rounded w-5/6"></div>
            <div className="h-4 bg-gray-700/50 rounded w-4/6"></div>
        </div>
    </div>
);

const AnalyticsPage = () => {
    return (
        <div className='flex-1 overflow-auto relative z-10'>
            <Header title='Analytics Dashboard' />
            <main className='max-w-[80vw] mx-auto py-6 px-4 lg:px-8'>
                <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                        <AIPoweredInsights />
                    </Suspense>
                </ErrorBoundary>
            </main>
        </div>
    );
};

export default AnalyticsPage;
