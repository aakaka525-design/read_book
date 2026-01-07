import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#FEFAF6] dark:bg-[#121212] z-50">
            <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"></div>
                <Loader2 size={48} className="text-amber-500 animate-spin relative z-10" />
            </div>
            <p className="mt-4 text-amber-900/60 dark:text-gray-400 text-sm font-medium animate-pulse">
                Loading Application...
            </p>
        </div>
    );
}
