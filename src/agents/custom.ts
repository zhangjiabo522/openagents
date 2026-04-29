import { BaseAgent } from './base-agent.js';
import type { LLMClient } from '../llm/client.js';
import type { AgentConfig } from '../config/schema.js';

export class CustomAgent extends BaseAgent {
  private capabilities: string[];

  constructor(name: string, config: AgentConfig, llm: LLMClient, capabilities?: string[]) {
    super(name, `custom-${name.toLowerCase()}`, config, llm);
    this.capabilities = capabilities || ['general'];
  }

  protected getSystemPrompt(): string {
    return this.config.system_prompt;
  }

  getCapabilities(): string[] {
    return this.capabilities;
  }
}
