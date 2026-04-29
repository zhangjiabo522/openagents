import { BaseAgent } from './base-agent.js';
import type { LLMClient } from '../llm/client.js';
import type { AgentConfig } from '../config/schema.js';

export class ReviewerAgent extends BaseAgent {
  constructor(config: AgentConfig, llm: LLMClient) {
    super('Reviewer', 'reviewer', config, llm);
  }

  protected getSystemPrompt(): string {
    return this.config.system_prompt;
  }

  getCapabilities(): string[] {
    return ['code_review', 'quality_assurance', 'security_audit'];
  }

  async reviewCode(code: string, context?: string): Promise<string> {
    const prompt = context
      ? `请审查以下代码，上下文信息：${context}\n\n\`\`\`\n${code}\n\`\`\``
      : `请审查以下代码：\n\n\`\`\`\n${code}\n\`\`\``;
    return this.processTask(prompt);
  }
}
