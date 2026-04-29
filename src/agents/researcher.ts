import { BaseAgent } from './base-agent.js';
import type { LLMClient } from '../llm/client.js';
import type { AgentConfig } from '../config/schema.js';

export class ResearcherAgent extends BaseAgent {
  constructor(config: AgentConfig, llm: LLMClient) {
    super('Researcher', 'researcher', config, llm);
  }

  protected getSystemPrompt(): string {
    return this.config.system_prompt;
  }

  getCapabilities(): string[] {
    return ['research', 'analysis', 'comparison', 'documentation'];
  }

  async research(topic: string): Promise<string> {
    return this.processTask(`请研究以下主题并提供详细报告：\n${topic}`);
  }
}
