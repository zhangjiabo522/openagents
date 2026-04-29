import { v4 as uuidv4 } from 'uuid';
import type { LLMClient, LLMMessage } from '../llm/client.js';
import type { AgentConfig } from '../config/schema.js';
import { messageBus, type Message } from '../core/message-bus.js';
import { sharedContext } from '../core/shared-context.js';
import { getToolsDescription, parseToolCalls, executeToolCalls, type ToolResult } from '../tools/index.js';

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
  protected useTools: boolean = true;

  constructor(name: string, type: string, config: AgentConfig, llm: LLMClient) {
    this.id = `agent-${type}-${uuidv4().slice(0, 8)}`;
    this.name = name;
    this.type = type;
    this.config = config;
    this.llm = llm;

    messageBus.subscribeToAgent(this.id, (msg) => this.handleMessage(msg));
  }

  protected abstract getSystemPrompt(): string;
  abstract getCapabilities(): string[];

  protected handleMessage(message: Message): void {}

  // 获取带工具描述的 system prompt
  protected getFullSystemPrompt(): string {
    let prompt = this.getSystemPrompt();

    if (this.useTools) {
      prompt += '\n\n' + getToolsDescription();
    }

    // 添加共享上下文
    const contextSummary = sharedContext.buildContextSummary(this.id);
    if (contextSummary.length > 50) {
      prompt += '\n\n' + contextSummary;
    }

    return prompt;
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

    // 记录到共享上下文
    sharedContext.addEntry({
      agentId: this.id,
      agentName: this.name,
      type: 'task',
      content: taskDescription,
    });

    messageBus.publish({
      type: 'agent_status',
      from: this.id,
      content: `${this.name} 开始处理: ${taskDescription.slice(0, 100)}`,
      metadata: { agentId: this.id, taskId: task.id },
    });

    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: this.getFullSystemPrompt() },
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
      let finalContent = response.content;

      // 检查是否有工具调用
      if (this.useTools) {
        const toolCalls = parseToolCalls(response.content);
        if (toolCalls.length > 0) {
          const results = await executeToolCalls(toolCalls);
          const toolResultsText = this.formatToolResults(results);
          finalContent += '\n\n' + toolResultsText;

          // 记录工具结果到共享上下文
          sharedContext.addEntry({
            agentId: this.id,
            agentName: this.name,
            type: 'info',
            content: toolResultsText,
          });
        }
      }

      this.conversationHistory.push(
        { role: 'user', content: taskDescription },
        { role: 'assistant', content: finalContent }
      );

      task.status = 'completed';
      task.result = finalContent;
      task.completedAt = new Date();
      this.currentTask = undefined;
      this.setStatus('idle');

      // 记录结果到共享上下文
      sharedContext.addEntry({
        agentId: this.id,
        agentName: this.name,
        type: 'result',
        content: finalContent,
      });

      messageBus.publish({
        type: 'task_completed',
        from: this.id,
        content: finalContent,
        metadata: { agentId: this.id, taskId: task.id },
      });

      return finalContent;
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

    sharedContext.addEntry({
      agentId: this.id,
      agentName: this.name,
      type: 'task',
      content: taskDescription,
    });

    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: this.getFullSystemPrompt() },
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

      // 检查工具调用
      if (this.useTools) {
        const toolCalls = parseToolCalls(fullContent);
        if (toolCalls.length > 0) {
          const results = await executeToolCalls(toolCalls);
          const toolResultsText = this.formatToolResults(results);
          fullContent += '\n\n' + toolResultsText;

          sharedContext.addEntry({
            agentId: this.id,
            agentName: this.name,
            type: 'info',
            content: toolResultsText,
          });
        }
      }

      this.conversationHistory.push(
        { role: 'user', content: taskDescription },
        { role: 'assistant', content: fullContent }
      );

      task.status = 'completed';
      task.result = fullContent;
      task.completedAt = new Date();
      this.currentTask = undefined;
      this.setStatus('idle');

      sharedContext.addEntry({
        agentId: this.id,
        agentName: this.name,
        type: 'result',
        content: fullContent,
      });

      return fullContent;
    } catch (error) {
      task.status = 'failed';
      task.result = (error as Error).message;
      this.currentTask = undefined;
      this.setStatus('error');
      throw error;
    }
  }

  private formatToolResults(results: ToolResult[]): string {
    let text = '### 工具执行结果\n\n';
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      text += `${status} **${result.tool}**\n`;
      text += '```\n' + result.output.slice(0, 1000) + '\n```\n\n';
    }
    return text;
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
