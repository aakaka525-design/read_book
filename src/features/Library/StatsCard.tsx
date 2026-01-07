import { memo } from 'react';
import { useAppContext } from '../../contexts/AppContext';

const StatsCard = memo(() => {
    const { getTotalReadingTime, getStreak, dailyReading } = useAppContext();

    const totalMinutes = getTotalReadingTime();
    const totalHours = Math.floor(totalMinutes / 60);
    const streak = getStreak();

    // Daily Goal: 30 minutes
    const today = new Date().toISOString().split('T')[0];
    const todayMinutes = dailyReading[today] || 0;
    const dailyGoal = 30;
    const goalPercent = Math.min(100, Math.round((todayMinutes / dailyGoal) * 100));

    // Generate Heatmap Data
    const heatmapDays = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        const dateStr = d.toISOString().split('T')[0];
        const minutes = dailyReading[dateStr] || 0;

        let level = 0;
        if (minutes > 0) level = 1;
        if (minutes > 15) level = 2;
        if (minutes > 45) level = 3;
        if (minutes > 90) level = 4;

        return { date: dateStr, level, minutes };
    });

    return (
        <div className="bento-card col-span-1 md:col-span-2 row-span-1 bg-card border border-[var(--border-color)] rounded-2xl shadow-sm p-6 flex flex-col justify-between h-full">
            {/* Top Row: Stats */}
            <div className="flex items-center justify-around mb-4">
                <div className="text-center">
                    <div className="text-3xl font-extrabold text-[var(--accent-color)]">{totalHours}</div>
                    <div className="text-xs text-secondary uppercase tracking-wider">总小时</div>
                </div>

                {/* Daily Goal Ring */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-200 dark:text-gray-800" />
                        <circle
                            cx="32" cy="32" r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-[var(--accent-color)] transition-all duration-1000 ease-out"
                            strokeDasharray={2 * Math.PI * 28}
                            strokeDashoffset={2 * Math.PI * 28 * (1 - goalPercent / 100)}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold">{todayMinutes}m</span>
                        <span className="text-[10px] text-secondary">/30</span>
                    </div>
                </div>

                <div className="text-center">
                    <div className="text-3xl font-extrabold text-[var(--accent-color)]">{streak}</div>
                    <div className="text-xs text-secondary uppercase tracking-wider">连续天数</div>
                </div>
            </div>

            {/* Bottom Row: Heatmap */}
            <div className="hidden sm:flex justify-between items-end gap-1 mt-2">
                {heatmapDays.map((day) => (
                    <div
                        key={day.date}
                        className="w-full h-8 rounded-sm transition-all hover:scale-110 relative group"
                        style={{
                            backgroundColor: day.level === 0 ? 'var(--bg-secondary)' :
                                day.level === 1 ? 'rgba(var(--accent-rgb), 0.3)' :
                                    day.level === 2 ? 'rgba(var(--accent-rgb), 0.5)' :
                                        day.level === 3 ? 'rgba(var(--accent-rgb), 0.7)' :
                                            'rgba(var(--accent-rgb), 1)'
                        }}
                    >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                            {day.date}: {day.minutes} min
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default StatsCard;
