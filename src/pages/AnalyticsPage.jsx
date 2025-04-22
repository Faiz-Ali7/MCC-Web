import Header from "../components/common/Header";
import AIPoweredInsights from "../components/analytics/AIPoweredInsights";

const AnalyticsPage = () => {
    return (
        <div className='flex-1 overflow-auto relative z-10'>
            <Header title='Analytics Dashboard' />
            <main className='max-w-[80vw] mx-auto py-6 px-4 lg:px-8'>
                <AIPoweredInsights />
            </main>
        </div>
    );
};

export default AnalyticsPage;
