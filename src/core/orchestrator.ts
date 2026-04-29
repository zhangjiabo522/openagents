import { EventEmitter } from 'events';
import type { AppConfig, AgentConfig } from '../config/schema.js';
import type { LLMClient } from '../llm/client.js';
import { PlannerAgent, CoderAgent, ReviewerAgent, ResearcherAgent, CustomAgent } from '../agents/index.js';
import type { BaseAgent, AgentState } from '../agents/index.js';
import type { TaskPlan } from '../agents/planner.js';
import { messageBus, type Message } from './message-bus.js';

export type OrchestratorStatus = 'idle' | 'planning' | 'executing' | 'summarizing';

export interface OrchestratorState {
  status: OrchestratorStatus;
  agents: AgentState[];
  currentPlan?: TaskPlan;
  completedTasks: number;
  totalTasks: number;
}

export class Orchestrator extends EventEmitter {
  private agents: Map<string, BaseAgent> = new Map();
  private planner!: PlannerAgent;
  private llm: LLMClient;
  private config: AppConfig;
  private status: OrchestratorStatus = 'idle';
  private currentPlan?: TaskPlan;
  private completedTasks: number = 0;
  private totalTasks: number = 0;

  constructor(config: AppConfig, llm: LLMClient) {
    super();
    this.config = config;
    this.llm = llm;
    this.initializeAgents();
  }

  private initializeAgents(): void {
    // 初始化内置 Agent
    const plannerConfig = this.config.agents['planner'];
    if (plannerConfig) {
      this.planner = new PlannerAgent(plannerConfig, this.llm);
      this.agents.set(this.planner.id, this.planner);
    }

    const coderConfig = this.config.agents['coder'];
    if (coderConfig) {
      const coder = new CoderAgent(coderConfig, this.llm);
      this.agents.set(coder.id, coder);
    }

    const reviewerConfig = this.config.agents['reviewer'];
    if (reviewerConfig) {
      const reviewer = new ReviewerAgent(reviewerConfig, this.llm);
      this.agents.set(reviewer.id, reviewer);
    }

    const researcherConfig = this.config.agents['researcher'];
    if (researcherConfig) {
      const researcher = new ResearcherAgent(researcherConfig, this.llm);
      this.agents.set(researcher.id, researcher);
    }

    // 初始化自定义 Agent
    for (const [name, agentConfig] of Object.entries(this.config.agents)) {
      if (!['planner', 'coder', 'reviewer', 'researcher'].includes(name)) {
        const customAgent = new CustomAgent(name, agentConfig, this.llm);
        this.agents.set(customAgent.id, customAgent);
      }
    }
  }

  async processUserInput(input: string): Promise<void> {
    const mode = this.config.orchestrator.collaboration_mode;

    messageBus.publish({
      type: 'user_input',
      from: 'user',
      content: input,
    });

    switch (mode) {
      case 'hierarchical':
        await this.processHierarchical(input);
        break;
      case 'peer':
        await this.processPeer(input);
        break;
      case 'hybrid':
        await this.processHybrid(input);
        break;
    }
  }

  private async processHierarchical(input: string): Promise<void> {
    // 1. Planner 分解任务
    this.setStatus('planning');
    this.emit('status_change', 'planning');

    try {
      const plan = await this.planner.planTask(input);
      this.currentPlan = plan;
      this.totalTasks = plan.tasks.length;
      this.completedTasks = 0;

      messageBus.publish({
        type: 'system',
        from: 'orchestrator',
        content: `任务已分解为 ${plan.tasks.length} 个子任务`,
        metadata: { plan },
      });

      // 2. 按依赖顺序执行任务
      this.setStatus('executing');
      this.emit('status_change', 'executing');

      await this.executePlan(plan);

      // 3. 汇总结果
      this.setStatus('summarizing');
      this.emit('status_change', 'summarizing');

      const summary = this.generateSummary(plan);
      messageBus.publish({
        type: 'system',
        from: 'orchestrator',
        content: summary,
      });

      this.setStatus('idle');
      this.emit('status_change', 'idle');
      this.emit('complete', summary);
    } catch (error) {
      this.setStatus('idle');
      this.emit('error', error);
    }
  }

  private async processPeer(input: string): Promise<void> {
    this.setStatus('executing');
    this.emit('status_change', 'executing');

    const activeAgents = Array.from(this.agents.values())
      .filter(a => a.type !== 'planner')
      .slice(0, this.config.orchestrator.max_concurrent_agents);

    const responses: string[] = [];

    // 每个 Agent 轮流发言
    for (const agent of activeAgents) {
      try {
        const response = await agent.processTask(input);
        responses.push(`[${agent.name}] ${response}`);
        this.completedTasks++;
      } catch (error) {
        responses.push(`[${agent.name}] 处理失败: ${(error as Error).message}`);
      }
    }

    const summary = responses.join('\n\n---\n\n');
    messageBus.publish({
      type: 'system',
      from: 'orchestrator',
      content: summary,
    });

    this.setStatus('idle');
    this.emit('status_change', 'idle');
    this.emit('complete', summary);
  }

  private async processHybrid(input: string): Promise<void> {
    // 简单任务直接交给 coder，复杂任务用 hierarchical
    const isComplex = input.length > 200 || input.includes('和') || input.includes('然后');

    if (isComplex) {
      await this.processHierarchical(input);
    } else {
      const coder = Array.from(this.agents.values()).find(a => a.type === 'coder');
      if (coder) {
        this.setStatus('executing');
        const response = await coder.processTask(input);
        messageBus.publish({
          type: 'system',
          from: 'orchestrator',
          content: response,
        });
        this.setStatus('idle');
        this.emit('complete', response);
      }
    }
  }

  private async executePlan(plan: TaskPlan): Promise<void> {
    // 按依赖关系排序
    const executed = new Set<string>();
    const taskMap = new Map(plan.tasks.map(t => [t.id, t]));

    while (executed.size < plan.tasks.length) {
      // 找出可以执行的任务（依赖已完成）
      const readyTasks = plan.tasks.filter(task =>
        !executed.has(task.id) &&
        task.dependencies.every(dep => executed.has(dep))
      );

      if (readyTasks.length === 0) {
        throw new Error('检测到循环依赖');
      }

      // 并行执行（限制并发数）
      const chunks = this.chunk(readyTasks, this.config.orchestrator.max_concurrent_agents);

      for (const chunk of chunks) {
        await Promise.all(chunk.map(async (task) => {
          const agent = this.findAgentForTask(task.assignee);
          if (!agent) {
            messageBus.publish({
              type: 'task_failed',
              from: 'orchestrator',
              content: `找不到适合执行任务的 Agent: ${task.assignee}`,
            });
            executed.add(task.id);
            return;
          }

          try {
            await agent.processTask(task.description);
            executed.add(task.id);
            this.completedTasks++;
            this.emit('task_complete', task);
          } catch {
            executed.add(task.id);
          }
        }));
      }
    }
  }

  private findAgentForTask(assignee: string): BaseAgent | undefined {
    // 按类型查找
    for (const agent of this.agents.values()) {
      if (agent.type === assignee) return agent;
    }
    // 按名称查找
    for (const agent of this.agents.values()) {
      if (agent.name.toLowerCase() === assignee.toLowerCase()) return agent;
    }
    return undefined;
  }

  private generateSummary(plan: TaskPlan): string {
    const agentStates = Array.from(this.agents.values()).map(a => a.getState());
    const totalTokens = agentStates.reduce((sum, s) => sum + s.tokenUsage, 0);

    return `任务完成！

执行摘要:
- 总任务数: ${this.totalTasks}
- 已完成: ${this.completedTasks}
- 使用 Agent 数: ${agentStates.filter(s => s.messageCount > 0).length}
- 总 Token 用量: ${totalTokens}

${plan.summary}`;
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private setStatus(status: OrchestratorStatus): void {
    this.status = status;
  }

  getState(): OrchestratorState {
    return {
      status: this.status,
      agents: Array.from(this.agents.values()).map(a => a.getState()),
      currentPlan: this.currentPlan,
      completedTasks: this.completedTasks,
      totalTasks: this.totalTasks,
    };
  }

  getAgent(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  resetAllAgents(): void {
    for (const agent of this.agents.values()) {
      agent.reset();
    }
    this.currentPlan = undefined;
    this.completedTasks = 0;
    this.totalTasks = 0;
    this.setStatus('idle');
  }
}
