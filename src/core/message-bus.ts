import { EventEmitter } from 'events';

export type MessageType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_failed'
  | 'agent_message'
  | 'agent_status'
  | 'user_input'
  | 'system';

export interface Message {
  id: string;
  type: MessageType;
  from: string;
  to?: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type MessageHandler = (message: Message) => void;

export class MessageBus extends EventEmitter {
  private history: Message[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 1000) {
    super();
    this.maxHistory = maxHistory;
  }

  publish(message: Omit<Message, 'id' | 'timestamp'>): Message {
    const fullMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
    };

    this.history.push(fullMessage);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.emit('message', fullMessage);
    this.emit(fullMessage.type, fullMessage);

    if (fullMessage.to) {
      this.emit(`to:${fullMessage.to}`, fullMessage);
    }

    return fullMessage;
  }

  subscribe(handler: MessageHandler): () => void {
    this.on('message', handler);
    return () => this.off('message', handler);
  }

  subscribeToType(type: MessageType, handler: MessageHandler): () => void {
    this.on(type, handler);
    return () => this.off(type, handler);
  }

  subscribeToAgent(agentId: string, handler: MessageHandler): () => void {
    this.on(`to:${agentId}`, handler);
    return () => this.off(`to:${agentId}`, handler);
  }

  getHistory(limit?: number): Message[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}

export const messageBus = new MessageBus();
