import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface StudyTimerProps {
  onTimeUpdate: (time: number) => void;
  isActive: boolean;
  initialTime?: number;
  className?: string;
}

const StudyTimer = ({ onTimeUpdate, isActive, initialTime = 0, className = '' }: StudyTimerProps) => {
  const [time, setTime] = useState(initialTime);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  // Initialize with initial time if provided
  useEffect(() => {
    if (initialTime > 0) {
      setTime(initialTime);
      onTimeUpdate(initialTime);
    }
  }, [initialTime, onTimeUpdate]);

  useEffect(() => {
    // On first render, only update if active
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (isActive) {
        console.log('StudyTimer started on first render');
      }
    }

    // Clear any existing timer first to avoid multiple timers
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start a new timer if active
    if (isActive) {
      console.log('StudyTimer activated');
      intervalRef.current = setInterval(() => {
        setTime(prevTime => {
          const newTime = prevTime + 1;
          onTimeUpdate(newTime);
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, onTimeUpdate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center ${className}`}>
      <Clock className={`h-4 w-4 mr-2 ${isActive ? 'text-green-500 animate-pulse' : 'opacity-70'}`} />
      <span>{formatTime(time)}</span>
    </div>
  );
};

export default StudyTimer;
