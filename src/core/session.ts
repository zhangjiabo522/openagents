import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getSessionsDir } from '../config/loader.js';
import type { Message } from './message-bus.js';

export interface SessionData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  metadata: Record<string, unknown>;
}

export class Session {
  readonly id: string;
  private name: string;
  private createdAt: Date;
  private updatedAt: Date;
  private messages: Message[] = [];
  private metadata: Record<string, unknown> = {};

  constructor(name?: string, existingData?: SessionData) {
    if (existingData) {
      this.id = existingData.id;
      this.name = existingData.name;
      this.createdAt = new Date(existingData.createdAt);
      this.updatedAt = new Date(existingData.updatedAt);
      this.messages = existingData.messages;
      this.metadata = existingData.metadata;
    } else {
      this.id = uuidv4();
      this.name = name || `session-${new Date().toISOString().slice(0, 10)}`;
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }
  }

  addMessage(message: Message): void {
    this.messages.push(message);
    this.updatedAt = new Date();
  }

  getMessages(limit?: number): Message[] {
    if (limit) {
      return this.messages.slice(-limit);
    }
    return [...this.messages];
  }

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }

  save(): void {
    const sessionsDir = getSessionsDir();
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }

    const filePath = path.join(sessionsDir, `${this.id}.json`);
    const data: SessionData = {
      id: this.id,
      name: this.name,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      messages: this.messages,
      metadata: this.metadata,
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  static load(sessionId: string): Session | null {
    const sessionsDir = getSessionsDir();
    const filePath = path.join(sessionsDir, `${sessionId}.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content) as SessionData;
      return new Session(undefined, data);
    } catch {
      return null;
    }
  }

  static listSessions(): SessionData[] {
    const sessionsDir = getSessionsDir();
    if (!fs.existsSync(sessionsDir)) {
      return [];
    }

    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
    const sessions: SessionData[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(sessionsDir, file), 'utf-8');
        sessions.push(JSON.parse(content));
      } catch {
        // 跳过损坏的会话文件
      }
    }

    return sessions.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  static deleteSession(sessionId: string): boolean {
    const sessionsDir = getSessionsDir();
    const filePath = path.join(sessionsDir, `${sessionId}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}
