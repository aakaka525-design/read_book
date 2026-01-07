/**
 * Worker Client - 类型安全的 Worker 通信脚手架
 * 
 * 解决问题：
 * 1. 请求-响应映射（避免并发时消息混乱）
 * 2. 类型安全
 * 3. 超时处理
 * 4. 错误捕获
 */

// ============== Types ==============
export interface WorkerMessage<T = any> {
    id: string;
    type: string;
    payload: T;
}

export interface WorkerResponse<T = any> {
    id: string;
    type: string;
    payload: T;
    error?: string;
}

type PendingRequest<T> = {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
};

// ============== WorkerClient Class ==============
export class WorkerClient {
    private worker: Worker;
    private pending = new Map<string, PendingRequest<any>>();
    private idCounter = 0;
    private defaultTimeout: number;

    // Backpressure control (#10)
    private queue: Array<{ type: string; payload: unknown }> = [];
    private inFlight = 0;
    private maxConcurrent: number;

    constructor(workerUrl: URL, options?: { timeout?: number; maxConcurrent?: number }) {
        this.worker = new Worker(workerUrl, { type: 'module' });
        this.defaultTimeout = options?.timeout ?? 30000; // 30s default
        this.maxConcurrent = options?.maxConcurrent ?? 10; // Default concurrency limit

        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            const { id, payload, error } = e.data;
            const pending = this.pending.get(id);

            if (!pending) {
                // Might be a response to a fire-and-forget or already timed out
                // Decrement in-flight counter for queue processing
                this.inFlight = Math.max(0, this.inFlight - 1);
                this.processQueue();
                return;
            }

            clearTimeout(pending.timeout);
            this.pending.delete(id);
            this.inFlight = Math.max(0, this.inFlight - 1);
            this.processQueue();

            if (error) {
                pending.reject(new Error(error));
            } else {
                pending.resolve(payload);
            }
        };

        this.worker.onerror = (e) => {
            console.error('[WorkerClient] Worker error:', e.message);
            // Reject all pending requests
            this.pending.forEach((p, id) => {
                clearTimeout(p.timeout);
                p.reject(new Error('Worker crashed'));
                this.pending.delete(id);
            });
            this.inFlight = 0;
            this.queue = [];
        };
    }

    /**
     * Process the next item in queue if under concurrency limit
     */
    private processQueue(): void {
        while (this.queue.length > 0 && this.inFlight < this.maxConcurrent) {
            const item = this.queue.shift()!;
            this.sendImmediate(item.type, item.payload);
        }
    }

    /**
     * Internal immediate send (bypasses queue)
     */
    private sendImmediate<TPayload>(type: string, payload: TPayload): void {
        const id = `fire_${++this.idCounter}`;
        const message: WorkerMessage<TPayload> = { id, type, payload };
        this.inFlight++;
        this.worker.postMessage(message);
    }

    /**
     * 发送请求并等待响应
     */
    request<TPayload, TResponse>(
        type: string,
        payload: TPayload,
        options?: { timeout?: number }
    ): Promise<TResponse> {
        return new Promise((resolve, reject) => {
            const id = `req_${++this.idCounter}_${Date.now()}`;
            const timeout = options?.timeout ?? this.defaultTimeout;

            const timeoutHandle = setTimeout(() => {
                this.pending.delete(id);
                this.inFlight = Math.max(0, this.inFlight - 1);
                this.processQueue();
                reject(new Error(`Worker request timeout: ${type}`));
            }, timeout);

            this.pending.set(id, { resolve, reject, timeout: timeoutHandle });
            this.inFlight++;

            const message: WorkerMessage<TPayload> = { id, type, payload };
            this.worker.postMessage(message);
        });
    }

    /**
     * 单向发送（不等待响应）- 使用队列防止 Worker 过载
     * Tech Debt #10: Backpressure control
     */
    send<TPayload>(type: string, payload: TPayload): void {
        if (this.inFlight < this.maxConcurrent) {
            this.sendImmediate(type, payload);
        } else {
            this.queue.push({ type, payload });
        }
    }

    /**
     * 获取队列状态（用于调试/监控）
     */
    getQueueStatus(): { inFlight: number; queued: number } {
        return { inFlight: this.inFlight, queued: this.queue.length };
    }

    /**
     * 终止 Worker
     */
    terminate(): void {
        this.pending.forEach((p) => {
            clearTimeout(p.timeout);
            p.reject(new Error('Worker terminated'));
        });
        this.pending.clear();
        this.queue = [];
        this.inFlight = 0;
        this.worker.terminate();
    }
}

// ============== Helper for Worker Side ==============
/**
 * Worker 端使用的响应帮助函数
 * 在 worker 内 import 此函数
 */
export function createWorkerHandler(ctx: Worker) {
    return {
        reply<T>(id: string, type: string, payload: T): void {
            ctx.postMessage({ id, type, payload });
        },
        error(id: string, message: string): void {
            ctx.postMessage({ id, type: 'ERROR', payload: null, error: message });
        }
    };
}
