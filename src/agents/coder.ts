import { BaseAgent } from './base-agent.js';
import type { LLMClient } from '../llm/client.js';
import type { AgentConfig } from '../config/schema.js';

export class CoderAgent extends BaseAgent {
  constructor(config: AgentConfig, llm: LLMClient) {
    super('Coder', 'coder', config, llm);
  }

  protected getSystemPrompt(): string {
    return this.config.system_prompt;
  }

  getCapabilities(): string[] {
    return ['coding', 'implementation', 'debugging', 'refactoring'];
  }

  async writeCode(taskDescription: string, onToken?: (token: string) => void): Promise<string> {
    if (onToken) {
      return this.streamTask(taskDescription, onToken);
    }
    return this.processTask(taskDescription);
  }
}
