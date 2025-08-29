import { Clock } from 'lucide-react';

interface StudyTimerProps {
  onTimeUpdate: (time: number) => void; // kept for backward-compat; not used here
  isActive: boolean; // controls icon styling only
  initialTime?: number;
  className?: string;
}

const StudyTimer = ({ onTimeUpdate: _onTimeUpdate, isActive, initialTime = 0, className = '' }: StudyTimerProps) => {
  // Pure display component. Parent controls time increments to avoid double ticking.
  const time = initialTime;

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
