import type { Response } from 'express';

/**
 * SSE 연결 관리 싱글톤
 * - userId → Set<Response> 로 1:N 연결 관리 (같은 사용자가 여러 탭 열 수 있음)
 */
class SseManager {
  private clients = new Map<string, Set<Response>>();

  add(userId: string, res: Response): void {
    if (!this.clients.has(userId)) this.clients.set(userId, new Set());
    this.clients.get(userId)!.add(res);
  }

  remove(userId: string, res: Response): void {
    const set = this.clients.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) this.clients.delete(userId);
  }

  /** 특정 유저에게 이벤트 전송 */
  push(userId: string, event: string, data: object = {}): void {
    const clients = this.clients.get(userId);
    if (!clients?.size) return;
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of [...clients]) {
      try {
        res.write(msg);
      } catch {
        clients.delete(res);
      }
    }
  }

  /** 연결 중인 userId 목록 (디버그용) */
  connectedUserIds(): string[] {
    return [...this.clients.keys()];
  }
}

export const sseManager = new SseManager();
