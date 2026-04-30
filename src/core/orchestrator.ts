import { EventEmitter } from 'events';
import type { AppConfig } from '../config/schema.js';
import type { LLMClient } from '../llm/client.js';
import { PlannerAgent, CoderAgent, ReviewerAgent, ResearcherAgent, CustomAgent } from '../agents/index.js';
import type { BaseAgent, AgentState, AgentTaskResult, ApproveCallback } from '../agents/index.js';
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
  private approveCallback?: ApproveCallback;
  private aborted = false;

  constructor(config: AppConfig, llm: LLMClient) {
    super();
    this.config = config;
    this.llm = llm;
    this.initializeAgents();
  }

  setApproveCallback(callback: ApproveCallback): void {
    this.approveCallback = callback;
    for (const agent of this.agents.values()) {
      agent.setApproveCallback(callback);
    }
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

  abort(): void {
    this.aborted = true;
    this.setStatus('idle');
  }

  async processUserInput(input: string): Promise<void> {
    this.aborted = false;
    messageBus.publish({ type: 'user_input', from: 'user', content: input });

    this.setStatus('routing');
    const category = this.categorizeInput(input);

    switch (category) {
      case 'simple_question': await this.handleSimpleQuestion(input); break;
      case 'direct_task': await this.handleDirectTask(input); break;
      case 'complex_task': await this.handleComplexTask(input); break;
      case 'discussion': await this.handleDiscussion(input); break;
    }
  }

  private categorizeInput(input: string): InputCategory {
    const lower = input.toLowerCase().trim();
    if (input.length < 50 && [/^你是/, /^你能/, /^你好/, /^hello/i, /^hi$/i, /^help$/i, /^介绍/].some(p => p.test(lower))) {
      return 'simple_question';
    }
    if ([/你觉得/, /建议/, /推荐/, /比较.*和/, /优缺点/].some(p => p.test(lower))) {
      return 'discussion';
    }
    if (input.length > 200 || /首先.*然后.*最后/.test(lower)) {
      return 'complex_task';
    }
    return 'direct_task';
  }

  private async handleSimpleQuestion(input: string): Promise<void> {
    const agent = this.findBestAgent('answer');
    if (!agent) return;
    this.emit('agent_start', { name: agent.name, type: agent.type, action: '思考中' });
    this.setStatus('executing');

    try {
      const result = await agent.processTask(input);
      if (this.aborted) return;
      this.emit('response', { agent: agent.name, content: result.content });
    } catch (error) {
      if (!this.aborted) this.emit('error', error);
    }
    if (!this.aborted) this.setStatus('idle');
  }

  private async handleDirectTask(input: string): Promise<void> {
    const agent = this.findBestAgentForTask(input);
    if (!agent) return;
    this.emit('agent_start', { name: agent.name, type: agent.type, action: '执行任务' });
    this.setStatus('executing');

    try {
      const result = await agent.processTask(input);
      if (this.aborted) return;
      const output = result.toolSummary || result.content;
      this.emit('response', { agent: agent.name, content: output, toolResults: result.toolResults });
    } catch (error) {
      if (!this.aborted) this.emit('error', error);
    }
    if (!this.aborted) this.setStatus('idle');
  }

  private async handleComplexTask(input: string): Promise<void> {
    this.emit('agent_start', { name: 'Planner', type: 'planner', action: '分解任务' });
    this.setStatus('planning');

    try {
      const plan = await this.planner.planTask(input);
      if (this.aborted) return;
      this.currentPlan = plan;
      this.totalTasks = plan.tasks.length;
      this.completedTasks = 0;

      this.setStatus('executing');
      const results: AgentTaskResult[] = [];
      const executed = new Set<string>();

      while (executed.size < plan.tasks.length) {
        const readyTasks = plan.tasks.filter(t =>
          !executed.has(t.id) && t.dependencies.every(d => executed.has(d))
        );
        if (readyTasks.length === 0) break;

        for (const task of readyTasks) {
          if (this.aborted) break;
          const agent = this.findAgentByType(task.assignee) || this.findBestAgent('general');
          if (!agent) { executed.add(task.id); continue; }

          this.emit('agent_start', {
            name: agent.name, type: agent.type,
            action: `任务 ${this.completedTasks + 1}/${this.totalTasks}`,
            task: task.description.slice(0, 50),
          });

          try {
            const ctx = sharedContext.buildContextSummary(agent.id);
            const desc = ctx.length > 50 ? `${task.description}\n\n${ctx}` : task.description;
            const result = await agent.processTask(desc);
            results.push(result);
            executed.add(task.id);
            this.completedTasks++;
          } catch {
            executed.add(task.id);
          }
        }
      }

      if (this.aborted) return;
      this.setStatus('summarizing');
      const summary = this.generateSummary(plan, results);
      this.emit('response', { agent: 'Planner', content: summary });
    } catch (error) {
      if (!this.aborted) this.emit('error', error);
    }
    if (!this.aborted) this.setStatus('idle');
  }

  private async handleDiscussion(input: string): Promise<void> {
    this.setStatus('executing');
    const responses: string[] = [];
    const activeAgents = Array.from(this.agents.values())
      .filter(a => a.type !== 'planner').slice(0, 2);

    for (const agent of activeAgents) {
      if (this.aborted) break;
      this.emit('agent_start', { name: agent.name, type: agent.type, action: '回答中' });
      try {
        const result = await agent.processTask(`用户提问: "${input}"\n请从你的专业角度回答。`);
        if (this.aborted) break;
        responses.push(`**${agent.name}**: ${result.content}`);
        this.completedTasks++;
      } catch { /* 忽略 */ }
    }

    if (!this.aborted) {
      this.emit('response', { agent: '多个Agent', content: responses.join('\n\n---\n\n') });
      this.setStatus('idle');
    }
  }

  private findBestAgentForTask(input: string): BaseAgent | undefined {
    const lower = input.toLowerCase();
    if (/代码|编程|函数|bug|修复|实现|写|创建|文件|脚本/.test(lower)) return this.findAgentByType('coder');
    if (/审查|review|检查|优化/.test(lower)) return this.findAgentByType('reviewer');
    if (/调研|研究|分析|对比|选型/.test(lower)) return this.findAgentByType('researcher');
    return this.findAgentByType('coder') || this.findBestAgent('general');
  }

  private findAgentByType(type: string): BaseAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.type === type) return agent;
    }
    return undefined;
  }

  private findBestAgent(_purpose: string): BaseAgent | undefined {
    return this.findAgentByType('coder') || this.findAgentByType('researcher') || Array.from(this.agents.values())[0];
  }

  private generateSummary(plan: TaskPlan, results: AgentTaskResult[]): string {
    const agentStates = Array.from(this.agents.values()).map(a => a.getState());
    const totalTokens = agentStates.reduce((sum, s) => sum + s.tokenUsage, 0);
    let output = `任务完成 (${this.totalTasks}项, ${totalTokens} tokens)\n\n`;
    for (const r of results) {
      output += (r.toolSummary || r.content?.slice(0, 300) || '') + '\n\n';
    }
    return output.trim();
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

  getAgent(id: string): BaseAgent | undefined { return this.agents.get(id); }
  getAllAgents(): BaseAgent[] { return Array.from(this.agents.values()); }

  resetAllAgents(): void {
    for (const agent of this.agents.values()) agent.reset();
    sharedContext.clear();
    this.currentPlan = undefined;
    this.completedTasks = 0;
    this.totalTasks = 0;
    this.setStatus('idle');
  }
}
