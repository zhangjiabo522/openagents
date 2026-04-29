import { BaseAgent } from './base-agent.js';
import type { LLMClient } from '../llm/client.js';
import type { AgentConfig } from '../config/schema.js';

export interface TaskPlan {
  tasks: Array<{
    id: string;
    description: string;
    assignee: string;
    dependencies: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
  summary: string;
}

export class PlannerAgent extends BaseAgent {
  constructor(config: AgentConfig, llm: LLMClient) {
    super('Planner', 'planner', config, llm);
  }

  protected getSystemPrompt(): string {
    return this.config.system_prompt;
  }

  getCapabilities(): string[] {
    return ['task_decomposition', 'planning', 'coordination'];
  }

  async planTask(userRequest: string): Promise<TaskPlan> {
    const response = await this.processTask(userRequest);

    try {
      // 尝试从响应中提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as TaskPlan;
      }
    } catch {
      // JSON 解析失败，返回简单计划
    }

    // 回退：创建简单计划
    return {
      tasks: [{
        id: 'task-1',
        description: userRequest,
        assignee: 'coder',
        dependencies: [],
        priority: 'high',
      }],
      summary: response,
    };
  }
}
