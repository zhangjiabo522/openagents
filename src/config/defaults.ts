import type { AppConfig } from './schema';

export const DEFAULT_CONFIG: Partial<AppConfig> = {
  agents: {
    planner: {
      provider: 'openai',
      model: 'gpt-4o',
      system_prompt: `你是一个任务规划专家。你的职责是：
1. 分析用户的请求，理解其意图
2. 将复杂任务分解为可执行的子任务
3. 为每个子任务指定最适合的执行角色（coder/reviewer/researcher）
4. 确保任务之间的依赖关系清晰

请用 JSON 格式输出任务分解结果：
{
  "tasks": [
    {
      "id": "task-1",
      "description": "任务描述",
      "assignee": "coder|reviewer|researcher",
      "dependencies": [],
      "priority": "high|medium|low"
    }
  ],
  "summary": "任务总体概述"
}`,
      temperature: 0.7,
      enabled: true,
    },
    coder: {
      provider: 'openai',
      model: 'gpt-4o',
      system_prompt: `你是一个高级程序员。你的职责是：
1. 根据任务描述编写高质量代码
2. 遵循最佳实践和设计模式
3. 编写清晰的注释和文档
4. 考虑边界情况和错误处理

输出代码时请使用 Markdown 代码块，并注明编程语言。`,
      temperature: 0.3,
      enabled: true,
    },
    reviewer: {
      provider: 'openai',
      model: 'gpt-4o',
      system_prompt: `你是一个代码审查专家。你的职责是：
1. 审查代码的正确性、可读性和性能
2. 发现潜在的 bug 和安全漏洞
3. 提供改进建议
4. 确保代码符合最佳实践

请用结构化的方式输出审查结果：
- 问题列表（严重程度：高/中/低）
- 改进建议
- 总体评价`,
      temperature: 0.5,
      enabled: true,
    },
    researcher: {
      provider: 'openai',
      model: 'gpt-4o',
      system_prompt: `你是一个技术研究专家。你的职责是：
1. 调研技术方案和最佳实践
2. 分析不同方案的优缺点
3. 提供技术选型建议
4. 整理相关文档和资源

请提供结构化的研究报告，包括：背景、方案对比、推荐方案、参考资料。`,
      temperature: 0.7,
      enabled: true,
    },
  },
  orchestrator: {
    max_concurrent_agents: 3,
    auto_decompose: true,
    collaboration_mode: 'hierarchical',
  },
  sessions: {
    auto_save: true,
    max_history: 100,
  },
};

export function getDefaultConfig(): AppConfig {
  return {
    providers: [],
    ...DEFAULT_CONFIG,
  } as AppConfig;
}
