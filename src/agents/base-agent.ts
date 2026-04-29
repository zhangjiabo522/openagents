import { v4 as uuidv4 } from 'uuid';
import type { LLMClient, LLMMessage } from '../llm/client.js';
import type { AgentConfig } from '../config/schema.js';
import { messageBus, type Message } from '../core/message-bus.js';
import { sharedContext } from '../core/shared-context.js';
import {
  getToolsDescription,
  parseToolCalls,
  executeToolCalls,
  formatToolResultsForUser,
  formatToolResultsForAgent,
  type ToolResult,
} from '../tools/index.js';

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

export type ApproveCallback = (tool: string, params: Record<string, string>) => Promise<boolean>;

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
  protected approveCallback?: ApproveCallback;

  constructor(name: string, type: string, config: AgentConfig, llm: LLMClient) {
    this.id = `agent-${type}-${uuidv4().slice(0, 8)}`;
    this.name = name;
    this.type = type;
    this.config = config;
    this.llm = llm;
  }

  setApproveCallback(callback: ApproveCallback): void {
    this.approveCallback = callback;
  }

  protected abstract getSystemPrompt(): string;
  abstract getCapabilities(): string[];

  protected getFullSystemPrompt(): string {
    let prompt = this.getSystemPrompt();
    if (this.useTools) {
      prompt += '\n\n' + getToolsDescription();
    }
    const contextSummary = sharedContext.buildContextSummary(this.id);
    if (contextSummary.length > 50) {
      prompt += '\n\n' + contextSummary;
    }
    return prompt;
  }

  async processTask(taskDescription: string): Promise<AgentTaskResult> {
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
      let mainContent = response.content;
      let toolSummary = '';
      let toolResultsForUser = '';

      // 处理工具调用
      if (this.useTools) {
        const toolCalls = parseToolCalls(response.content);
        if (toolCalls.length > 0) {
          const results = await executeToolCalls(toolCalls, this.approveCallback);

          // 折叠版给用户看
          toolResultsForUser = formatToolResultsForUser(results);

          // 完整版给 Agent 总结
          const toolResultsForAgent = formatToolResultsForAgent(results);

          // 让 Agent 总结工具结果
          const summaryMessages: LLMMessage[] = [
            { role: 'system', content: '你是助手，请根据工具执行结果用简洁的中文总结。不要重复工具原始输出，只说结论。' },
            { role: 'user', content: `用户请求: ${taskDescription}\n\n${toolResultsForAgent}` },
          ];

          const summaryResponse = await this.llm.chat(
            this.config.provider,
            this.config.model,
            summaryMessages,
            { temperature: 0.3, max_tokens: 1000 }
          );

          toolSummary = summaryResponse.content;

          // 移除原始的 tool_call 代码块，保留其他内容
          mainContent = mainContent.replace(/```tool_call[\s\S]*?```/g, '').trim();
        }
      }

      this.conversationHistory.push(
        { role: 'user', content: taskDescription },
        { role: 'assistant', content: mainContent }
      );

      task.status = 'completed';
      task.result = mainContent;
      task.completedAt = new Date();
      this.currentTask = undefined;
      this.setStatus('idle');

      sharedContext.addEntry({
        agentId: this.id,
        agentName: this.name,
        type: 'result',
        content: toolSummary || mainContent,
      });

      return {
        content: mainContent,
        toolResults: toolResultsForUser,
        toolSummary,
      };
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

export interface AgentTaskResult {
  content: string;
  toolResults?: string;  // 折叠的工具结果
  toolSummary?: string;  // Agent 总结
}
