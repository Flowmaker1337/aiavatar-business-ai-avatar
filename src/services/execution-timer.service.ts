import {performance} from 'perf_hooks';

export class ExecutionTimerService {
    private readonly label: string;
    private startTime: number;

    constructor(label: string) {
        this.label = label;
        this.startTime = -1;
    }

    start() {
        this.startTime = performance.now();
    }

    stop() {
        if (this.startTime === -1) {
            console.warn(`Use first start in ExecutionTimerService for label: ${this.label}`);
            return;
        }

        const duration = performance.now() - this.startTime;
        const formatted = ExecutionTimerService.formatDuration(duration);
        console.log(`Time executed for ${this.label}: ${formatted}`);
    }

    private static formatDuration(ms: number): string {
        const totalMs = Math.floor(ms);
        const hours = Math.floor(totalMs / (1000 * 60 * 60));
        const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
        const milliseconds = totalMs % 1000;

        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || minutes > 0 || hours > 0) parts.push(`${seconds}s`);
        parts.push(`${milliseconds}ms`);

        return parts.join(' ');
    }
}