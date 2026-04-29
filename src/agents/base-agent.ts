import { v4 as uuidv4 } from 'uuid';
import type { LLMClient, LLMMessage } from '../llm/client';
import type { AgentConfig } from '../config/schema';
import { messageBus, type Message } from '../core/message-bus';

export type AgentStatus = 'idle' | 'thinking' | 'working' | 'error' | 'stopped';

export interface AgentTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  assignedAt: Date;
  completedAt?: Date;
}

export interface AgentState {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  currentTask?: AgentTask;
  tasks: AgentTask[];
  tokenUsage: number;
  messageCount: number;
}

export abstract class BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  protected config: AgentConfig;
  protected llm: LLMClient;
  protected conversationHistory: LLMMessage[] = [];
  protected status: AgentStatus = 'idle';
  protected currentTask?: AgentTask;
  protected tasks: AgentTask[] = [];
  protected tokenUsage: number = 0;

  constructor(name: string, type: string, config: AgentConfig, llm: LLMClient) {
    this.id = `agent-${type}-${uuidv4().slice(0, 8)}`;
    this.name = name;
    this.type = type;
    this.config = config;
    this.llm = llm;

    // 订阅发给自己的消息
    messageBus.subscribeToAgent(this.id, (msg) => this.handleMessage(msg));
  }

  protected abstract getSystemPrompt(): string;
  abstract getCapabilities(): string[];

  protected handleMessage(message: Message): void {
    // 子类可以覆盖此方法处理特定消息
  }

  async processTask(taskDescription: string): Promise<string> {
    const task: AgentTask = {
      id: `task-${uuidv4().slice(0, 8)}`,
      description: taskDescription,
      status: 'in_progress',
      assignedAt: new Date(),
    };

    this.currentTask = task;
    this.tasks.push(task);
    this.setStatus('working');

    messageBus.publish({
      type: 'agent_status',
      from: this.id,
      content: `${this.name} 开始处理任务: ${taskDescription}`,
      metadata: { agentId: this.id, taskId: task.id },
    });

    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: this.getSystemPrompt() },
        ...this.conversationHistory,
        { role: 'user', content: taskDescription },
      ];

      const response = await this.llm.chat(
        this.config.provider,
        this.config.model,
        messages,
        {
          temperature: this.config.temperature,
          max_tokens: this.config.max_tokens,
        }
      );

      this.tokenUsage += response.usage?.total_tokens || 0;
      this.conversationHistory.push(
        { role: 'user', content: taskDescription },
        { role: 'assistant', content: response.content }
      );

      task.status = 'completed';
      task.result = response.content;
      task.completedAt = new Date();
      this.currentTask = undefined;
      this.setStatus('idle');

      messageBus.publish({
        type: 'task_completed',
        from: this.id,
        content: response.content,
        metadata: { agentId: this.id, taskId: task.id },
      });

      return response.content;
    } catch (error) {
      task.status = 'failed';
      task.result = (error as Error).message;
      this.currentTask = undefined;
      this.setStatus('error');

      messageBus.publish({
        type: 'task_failed',
        from: this.id,
        content: `任务失败: ${(error as Error).message}`,
        metadata: { agentId: this.id, taskId: task.id },
      });

      throw error;
    }
  }

  async streamTask(
    taskDescription: string,
    onToken: (token: string) => void
  ): Promise<string> {
    const task: AgentTask = {
      id: `task-${uuidv4().slice(0, 8)}`,
      description: taskDescription,
      status: 'in_progress',
      assignedAt: new Date(),
    };

    this.currentTask = task;
    this.tasks.push(task);
    this.setStatus('working');

    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: this.getSystemPrompt() },
        ...this.conversationHistory,
        { role: 'user', content: taskDescription },
      ];

      let fullContent = '';

      await this.llm.streamChat(
        this.config.provider,
        this.config.model,
        messages,
        {
          onToken: (token) => {
            fullContent += token;
            onToken(token);
          },
          onComplete: (response) => {
            this.tokenUsage += response.usage?.total_tokens || 0;
          },
        },
        {
          temperature: this.config.temperature,
          max_tokens: this.config.max_tokens,
        }
      );

      this.conversationHistory.push(
        { role: 'user', content: taskDescription },
        { role: 'assistant', content: fullContent }
      );

      task.status = 'completed';
      task.result = fullContent;
      task.completedAt = new Date();
      this.currentTask = undefined;
      this.setStatus('idle');

      return fullContent;
    } catch (error) {
      task.status = 'failed';
      task.result = (error as Error).message;
      this.currentTask = undefined;
      this.setStatus('error');
      throw error;
    }
  }

  getState(): AgentState {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      currentTask: this.currentTask,
      tasks: this.tasks,
      tokenUsage: this.tokenUsage,
      messageCount: this.conversationHistory.length,
    };
  }

  protected setStatus(status: AgentStatus): void {
    this.status = status;
    messageBus.publish({
      type: 'agent_status',
      from: this.id,
      content: `${this.name} 状态变更为: ${status}`,
      metadata: { agentId: this.id, status },
    });
  }

  reset(): void {
    this.conversationHistory = [];
    this.currentTask = undefined;
    this.tasks = [];
    this.tokenUsage = 0;
    this.setStatus('idle');
  }

  stop(): void {
    this.setStatus('stopped');
  }
}
