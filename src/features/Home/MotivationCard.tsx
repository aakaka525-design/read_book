import { memo } from 'react';
import { Flame, Target } from 'lucide-react';

interface MotivationCardProps {
    streak?: number;
    todayMinutes?: number;
    goalMinutes?: number;
    dailyReading?: Record<string, number>;
}

const MotivationCard = memo(function MotivationCard({ streak = 0, todayMinutes = 0, goalMinutes = 30, dailyReading = {} }: MotivationCardProps) {
    // Generate Heatmap Data (Last 28 days)
    const heatmapData = Array.from({ length: 28 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (27 - i));
        const dateStr = d.toISOString().split('T')[0];
        const minutes = dailyReading[dateStr] || 0;

        let level = 0;
        if (minutes > 0) level = 1;
        if (minutes > 15) level = 2;
        if (minutes > 45) level = 3;
        if (minutes > 90) level = 4;

        return { date: dateStr, level, minutes };
    });

    const getIntensityColor = (level: number) => {
        switch (level) {
            case 0: return 'bg-white/5 dark:bg-white/5';
            case 1: return 'bg-emerald-500/30';
            case 2: return 'bg-emerald-500/50';
            case 3: return 'bg-emerald-500/70';
            case 4: return 'bg-emerald-500';
            default: return 'bg-white/5';
        }
    };

    const progressPercentage = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));
    const remainingMinutes = Math.max(0, goalMinutes - todayMinutes);

    return (
        <div className="row-span-2 relative overflow-hidden rounded-3xl bg-zinc-900 dark:bg-black border border-zinc-800 p-6 flex flex-col justify-between text-white group">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[url('https://grain-url-placeholder')] opacity-20 mix-blend-overlay"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2" />

            {/* Header: Streak */}
            <div className="relative z-10 flex justify-between items-start mb-6">
                <div>
                    <div className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Current Streak</div>
                    <div className="flex items-center gap-2">
                        <Flame className="text-orange-500 fill-orange-500 animate-pulse" size={24} />
                        <span className="text-3xl font-black font-mono tracking-tight">{streak}</span>
                        <span className="text-sm font-bold text-zinc-500 pt-2">DAYS</span>
                    </div>
                </div>

                {/* Ring Progress (Simplified CSS) */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-zinc-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        <path
                            className="text-emerald-500 transition-all duration-1000 ease-out"
                            strokeDasharray={`${progressPercentage}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                    </svg>
                    <Target size={14} className="absolute text-emerald-500" />
                </div>
            </div>

            {/* Middle: Daily Goal Context */}
            <div className="relative z-10 mb-6">
                <div className="flex justify-between items-end mb-2">
                    <p className="font-bold">Today's Goal</p>
                    <p className="text-xs text-zinc-400">{todayMinutes} / {goalMinutes} min</p>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                    {remainingMinutes > 0
                        ? <>Just <span className="text-white font-bold">{remainingMinutes} mins</span> more to keep your streak alive!</>
                        : <span className="text-emerald-400 font-bold">Goal achieved! Amazing work! 🎉</span>
                    }
                </p>
            </div>

            {/* Bottom: Heatmap */}
            <div className="relative z-10">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Last 30 Days</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                    {heatmapData.map((item, index) => (
                        <div
                            key={index}
                            className={`aspect-square rounded-sm ${getIntensityColor(item.level)} transition-all duration-300 hover:scale-110`}
                            title={`Date: ${item.date}, ${item.minutes}m`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
});

export default MotivationCard;
