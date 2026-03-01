import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateExamId = () => 
  Math.random().toString(36).substring(2, 8).toUpperCase();

export const calculateScore = (response: string | null, correctAnswer: string) => {
  if (!response) return 0; // unattempted
  if (response === correctAnswer) return 4; // correct
  return -1; // wrong
};

export const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};

export const getPerformanceLabel = (percentage: number) => {
  if (percentage >= 75) return { label: 'STRONG', icon: '⭐', color: 'text-emerald-600' };
  if (percentage >= 60) return { label: 'GOOD', icon: '✓', color: 'text-blue-600' };
  return { label: 'NEEDS WORK', icon: '⚠️', color: 'text-amber-600' };
};

export const getTimeStatus = (seconds: number) => {
  if (seconds > 360) return 'too_slow'; // > 6min
  if (seconds > 240) return 'slightly_slow'; // > 4min
  return 'good_pace'; // 2-4min or less
};
