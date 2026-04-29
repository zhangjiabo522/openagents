import { EventEmitter } from 'events';
import type { AppConfig } from '../config/schema.js';
import type { LLMClient } from '../llm/client.js';
import { PlannerAgent, CoderAgent, ReviewerAgent, ResearcherAgent, CustomAgent } from '../agents/index.js';
import type { BaseAgent, AgentState } from '../agents/index.js';
import type { TaskPlan } from '../agents/planner.js';
import { messageBus } from './message-bus.js';
import { sharedContext } from './shared-context.js';

export type OrchestratorStatus = 'idle' | 'routing' | 'planning' | 'executing' | 'summarizing';

export interface OrchestratorState {
  status: OrchestratorStatus;
  agents: AgentState[];
  currentPlan?: TaskPlan;
  completedTasks: number;
  totalTasks: number;
}

// 输入类型判断
type InputCategory = 'simple_question' | 'direct_task' | 'complex_task' | 'discussion';

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

    for (const [name, agentConfig] of Object.entries(this.config.agents)) {
      if (!['planner', 'coder', 'reviewer', 'researcher'].includes(name)) {
        const customAgent = new CustomAgent(name, agentConfig, this.llm);
        this.agents.set(customAgent.id, customAgent);
      }
    }
  }

  async processUserInput(input: string): Promise<void> {
    messageBus.publish({
      type: 'user_input',
      from: 'user',
      content: input,
    });

    // 智能分类输入
    this.setStatus('routing');
    const category = this.categorizeInput(input);

    switch (category) {
      case 'simple_question':
        await this.handleSimpleQuestion(input);
        break;
      case 'direct_task':
        await this.handleDirectTask(input);
        break;
      case 'complex_task':
        await this.handleComplexTask(input);
        break;
      case 'discussion':
        await this.handleDiscussion(input);
        break;
    }
  }

  // 智能分类用户输入
  private categorizeInput(input: string): InputCategory {
    const lower = input.toLowerCase().trim();

    // 简单问题特征：短、问号结尾、询问能力/身份
    const simplePatterns = [
      /^你是谁/, /^你能做什么/, /^你能干什么/, /^介绍一下/,
      /^what can you/, /^who are you/, /^help$/i, /^帮助$/,
      /^你好/, /^hello/i, /^hi$/i, /^嗨/,
      /^什么意思/, /^什么是/, /^怎么理解/,
    ];

    if (input.length < 30 && simplePatterns.some(p => p.test(lower))) {
      return 'simple_question';
    }

    // 讨论特征：征求意见、看法
    const discussionPatterns = [
      /你觉得/, /你认为/, /怎么看/, /有什么看法/,
      /建议/, /推荐/, /比较.*和/, /优缺点/,
      /what do you think/, /opinion/, /compare/,
    ];

    if (discussionPatterns.some(p => p.test(lower))) {
      return 'discussion';
    }

    // 复杂任务特征：长文本、多个步骤、包含"和"、"然后"、"接着"
    const complexIndicators = [
      input.length > 150,
      /然后.*接着/.test(lower),
      /首先.*然后.*最后/.test(lower),
      /创建.*项目.*并且.*配置/.test(lower),
      /搭建.*包含.*以及/.test(lower),
      /实现.*功能.*同时.*需要/.test(lower),
    ];

    if (complexIndicators.some(Boolean)) {
      return 'complex_task';
    }

    // 直接任务特征：明确的指令
    return 'direct_task';
  }

  // 简单问题：直接用第一个 agent 回答
  private async handleSimpleQuestion(input: string): Promise<void> {
    this.setStatus('executing');
    const agent = this.findBestAgent('answer');
    if (!agent) return;

    try {
      const response = await agent.processTask(input);
      this.emit('response', response);
    } catch (error) {
      this.emit('error', error);
    }
    this.setStatus('idle');
  }

  // 直接任务：交给最合适的 agent
  private async handleDirectTask(input: string): Promise<void> {
    this.setStatus('executing');
    const agent = this.findBestAgentForTask(input);
    if (!agent) return;

    try {
      const response = await agent.processTask(input);
      this.emit('response', response);
    } catch (error) {
      this.emit('error', error);
    }
    this.setStatus('idle');
  }

  // 复杂任务：分解并协作
  private async handleComplexTask(input: string): Promise<void> {
    this.setStatus('planning');

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

      this.setStatus('executing');
      await this.executePlan(plan);

      this.setStatus('summarizing');
      const summary = this.generateSummary(plan);

      this.emit('response', summary);
    } catch (error) {
      this.emit('error', error);
    }

    this.setStatus('idle');
  }

  // 讨论模式：多个 agent 各自回答
  private async handleDiscussion(input: string): Promise<void> {
    this.setStatus('executing');
    const responses: string[] = [];
    const activeAgents = Array.from(this.agents.values())
      .filter(a => a.type !== 'planner')
      .slice(0, 2); // 限制 2 个 agent 参与讨论

    for (const agent of activeAgents) {
      try {
        const response = await agent.processTask(
          `用户提问: "${input}"\n请从你的专业角度回答。`
        );
        responses.push(`**${agent.name}**: ${response}`);
        this.completedTasks++;
      } catch {
        // 忽略单个 agent 失败
      }
    }

    this.emit('response', responses.join('\n\n---\n\n'));
    this.setStatus('idle');
  }

  // 根据任务内容找最合适的 agent
  private findBestAgentForTask(input: string): BaseAgent | undefined {
    const lower = input.toLowerCase();

    // 代码相关
    if (/代码|编程|函数|bug|修复|实现|写.*代码|创建.*文件|编写/.test(lower)) {
      return this.findAgentByType('coder');
    }

    // 审查相关
    if (/审查|review|检查.*代码|优化/.test(lower)) {
      return this.findAgentByType('reviewer');
    }

    // 研究相关
    if (/调研|研究|分析|对比|选型/.test(lower)) {
      return this.findAgentByType('researcher');
    }

    // 默认用 coder
    return this.findAgentByType('coder') || this.findBestAgent('general');
  }

  private findAgentByType(type: string): BaseAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.type === type) return agent;
    }
    return undefined;
  }

  private findBestAgent(purpose: string): BaseAgent | undefined {
    // 优先用 coder，其次任意 agent
    return this.findAgentByType('coder') ||
      this.findAgentByType('researcher') ||
      Array.from(this.agents.values())[0];
  }

  private async executePlan(plan: TaskPlan): Promise<void> {
    const executed = new Set<string>();

    while (executed.size < plan.tasks.length) {
      const readyTasks = plan.tasks.filter(task =>
        !executed.has(task.id) &&
        task.dependencies.every(dep => executed.has(dep))
      );

      if (readyTasks.length === 0) break;

      const chunks = this.chunk(readyTasks, this.config.orchestrator.max_concurrent_agents);

      for (const chunk of chunks) {
        await Promise.all(chunk.map(async (task) => {
          const agent = this.findAgentByType(task.assignee) || this.findBestAgent('general');
          if (!agent) {
            executed.add(task.id);
            return;
          }

          try {
            // 给 agent 提供其他 agent 的上下文
            const contextInfo = sharedContext.buildContextSummary(agent.id);
            const taskWithContext = contextInfo.length > 50
              ? `${task.description}\n\n${contextInfo}`
              : task.description;

            await agent.processTask(taskWithContext);
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

  private generateSummary(plan: TaskPlan): string {
    const agentStates = Array.from(this.agents.values()).map(a => a.getState());
    const totalTokens = agentStates.reduce((sum, s) => sum + s.tokenUsage, 0);

    // 从共享上下文获取所有结果
    const latestOutputs = sharedContext.getLatestOutputs();
    let resultsSection = '';
    for (const [agentId, output] of latestOutputs) {
      const agent = this.agents.get(agentId);
      if (agent) {
        resultsSection += `\n### ${agent.name}\n${output.slice(0, 500)}${output.length > 500 ? '...' : ''}\n`;
      }
    }

    return `## 任务完成

**执行摘要:**
- 总任务数: ${this.totalTasks}
- 已完成: ${this.completedTasks}
- 使用 Agent: ${agentStates.filter(s => s.messageCount > 0).length}
- Token 用量: ${totalTokens}

**各 Agent 输出:**
${resultsSection}

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
    this.emit('status_change', status);
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
    sharedContext.clear();
    this.currentPlan = undefined;
    this.completedTasks = 0;
    this.totalTasks = 0;
    this.setStatus('idle');
  }
}
