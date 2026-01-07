import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

export function useReadingTimer(isActive: boolean) {
    const { addReadingTime } = useAppContext();
    const lastActivityRef = useRef<number>(0);
    useEffect(() => {
        if (lastActivityRef.current === 0) lastActivityRef.current = Date.now();
    }, []);
    const intervalRef = useRef<number | null>(null);
    const [isIdle, setIsIdle] = useState(false);

    // Config
    const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    const REPORT_INTERVAL = 30 * 1000;    // 30 seconds

    // Reset idle timer on activity
    useEffect(() => {
        const handleActivity = () => {
            lastActivityRef.current = Date.now();
            if (isIdle) setIsIdle(false);
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('scroll', handleActivity);
        window.addEventListener('click', handleActivity);

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            window.removeEventListener('click', handleActivity);
        };
    }, [isIdle]);

    // Timer loop
    useEffect(() => {
        if (!isActive) return;

        intervalRef.current = window.setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;

            if (timeSinceLastActivity < IDLE_THRESHOLD) {
                // User is active, add time (0.5 minutes for 30s interval)
                addReadingTime(0.5);
            } else {
                setIsIdle(true);
            }
        }, REPORT_INTERVAL);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, addReadingTime]);

    return { isIdle };
}
