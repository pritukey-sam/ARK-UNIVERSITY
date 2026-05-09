import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
 if (!seconds || isNaN(seconds)) return '00:00';
 
 const h = Math.floor(seconds / 3600);
 const m = Math.floor((seconds % 3600) / 60);
 const s = Math.floor(seconds % 60);

 const mm = m.toString().padStart(2, '0');
 const ss = s.toString().padStart(2, '0');

 if (h > 0) {
 const hh = h.toString().padStart(2, '0');
 return `${hh}:${mm}:${ss}`;
 }
 return `${mm}:${ss}`;
}

export function parseDuration(input: string): number {
 if (!input) return 0;
 
 // Case: Only numbers (treat as minutes)
 if (/^\d+$/.test(input)) {
 return parseInt(input, 10) * 60;
 }

 // Case: HH:MM:SS or MM:SS
 const parts = input.split(':').map(p => parseInt(p, 10));
 
 if (parts.some(p => isNaN(p))) return 0;

 if (parts.length === 3) {
 // HH:MM:SS
 return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
 } else if (parts.length === 2) {
 // MM:SS
 return (parts[0] * 60) + parts[1];
 }

 return 0;
}
