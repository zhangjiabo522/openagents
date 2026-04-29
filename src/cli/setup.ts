import * as readline from 'readline';
import OpenAI from 'openai';
import type { AppConfig, Provider, AgentConfig } from '../config/schema.js';
import { getDefaultConfig } from '../config/defaults.js';
import { saveConfig, configExists, getConfigPath, loadConfig } from '../config/loader.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function askPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    let password = '';
    const onData = (char: Buffer) => {
      const c = char.toString();
      if (c === '\n' || c === '\r') {
        if (stdin.setRawMode) {
          stdin.setRawMode(wasRaw ?? false);
        }
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (c === '') {
        // Ctrl+C
        process.exit();
      } else if (c === '' || c === '\b') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += c;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

async function fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
  try {
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });

    const response = await client.models.list();
    const models = response.data
      .map(m => m.id)
      .sort();
    return models;
  } catch (error) {
    console.log(`\n获取模型列表失败: ${(error as Error).message}`);
    return [];
  }
}

async function selectFromList(items: string[], prompt: string, allowMultiple: boolean = false): Promise<string[]> {
  console.log(`\n${prompt}`);
  items.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item}`);
  });

  if (allowMultiple) {
    const answer = await ask('\n输入编号（多个用逗号分隔，如 1,3,5）: ');
    const indices = answer.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < items.length);
    return indices.map(i => items[i]);
  } else {
    const answer = await ask('\n输入编号: ');
    const index = parseInt(answer) - 1;
    if (index >= 0 && index < items.length) {
      return [items[index]];
    }
    return [];
  }
}

const AGENT_TYPES = [
  { key: 'planner', name: 'Planner（任务规划）', description: '负责分析任务、分解子任务' },
  { key: 'coder', name: 'Coder（编码）', description: '负责编写代码、实现功能' },
  { key: 'reviewer', name: 'Reviewer（审查）', description: '负责代码审查、质量检查' },
  { key: 'researcher', name: 'Researcher（研究）', description: '负责技术调研、方案分析' },
];

export async function runSetup(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║             OpenAgents 交互式配置向导                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const providers: Provider[] = [];
  const agentConfigs: Record<string, AgentConfig> = {};

  // 步骤 1: 配置 Provider
  console.log('── 步骤 1: 配置 API Provider ──\n');
  console.log('支持任何 OpenAI 兼容的 API 接口（OpenAI、DeepSeek、Claude、本地模型等）\n');

  let addMore = true;
  while (addMore) {
    console.log(`\n--- Provider ${providers.length + 1} ---`);

    const name = await ask('Provider 名称（如 openai、deepseek、local）: ');
    if (!name) {
      console.log('名称不能为空，跳过此 provider。');
      continue;
    }

    const baseUrl = await ask('API Base URL（如 https://api.openai.com/v1）: ');
    if (!baseUrl) {
      console.log('URL 不能为空，跳过此 provider。');
      continue;
    }

    const apiKey = await askPassword('API Key（输入时不会显示）: ');
    if (!apiKey) {
      console.log('API Key 不能为空，跳过此 provider。');
      continue;
    }

    console.log('\n正在获取模型列表...');
    const models = await fetchModels(baseUrl, apiKey);

    if (models.length === 0) {
      console.log('未能获取到模型列表。');
      const manualModel = await ask('请手动输入模型名称（如 gpt-4o）: ');
      if (manualModel) {
        providers.push({
          name,
          api_key: apiKey,
          base_url: baseUrl,
          default_model: manualModel,
        });
        console.log(`✓ Provider "${name}" 已添加（模型: ${manualModel}）`);
      }
    } else {
      console.log(`\n找到 ${models.length} 个模型:`);

      // 显示模型列表（分页）
      const pageSize = 20;
      let page = 0;
      let showAll = false;

      while (!showAll) {
        const start = page * pageSize;
        const end = Math.min(start + pageSize, models.length);
        for (let i = start; i < end; i++) {
          console.log(`  ${i + 1}. ${models[i]}`);
        }
        if (end < models.length) {
          const action = await ask(`\n显示 ${end}/${models.length} 个模型。按回车继续显示，输入 "q" 停止: `);
          if (action.toLowerCase() === 'q') {
            showAll = true;
          } else {
            page++;
          }
        } else {
          showAll = true;
        }
      }

      const selectedModels = await selectFromList(models, '选择默认模型（输入编号）:');
      const defaultModel = selectedModels[0] || models[0];

      providers.push({
        name,
        api_key: apiKey,
        base_url: baseUrl,
        default_model: defaultModel,
      });

      console.log(`✓ Provider "${name}" 已添加（默认模型: ${defaultModel}）`);
    }

    const more = await ask('\n是否继续添加 Provider？(y/N): ');
    addMore = more.toLowerCase() === 'y';
  }

  if (providers.length === 0) {
    console.log('\n❌ 至少需要配置一个 Provider。配置已取消。');
    rl.close();
    return;
  }

  // 步骤 2: 为 Agent 分配模型
  console.log('\n\n── 步骤 2: 为 Agent 分配模型 ──\n');
  console.log('每个 Agent 可以使用不同的 Provider 和模型。\n');

  // 收集所有可用的模型
  const allModels: Array<{ provider: string; model: string }> = [];
  for (const p of providers) {
    if (p.default_model) {
      allModels.push({ provider: p.name, model: p.default_model });
    }
    // 如果有其他模型，也可以添加
  }

  // 如果有多个 provider 的模型，让用户可以为每个 agent 选择
  for (const agent of AGENT_TYPES) {
    console.log(`\n--- ${agent.name} ---`);
    console.log(`    ${agent.description}`);

    if (allModels.length === 1) {
      // 只有一个模型，直接使用
      agentConfigs[agent.key] = {
        provider: allModels[0].provider,
        model: allModels[0].model,
        system_prompt: getDefaultSystemPrompt(agent.key),
        temperature: getDefaultTemperature(agent.key),
        enabled: true,
      };
      console.log(`  → 使用: ${allModels[0].provider}/${allModels[0].model}`);
    } else {
      // 多个模型，让用户选择
      console.log('\n可用模型:');
      allModels.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.provider}/${m.model}`);
      });

      // 也允许输入其他模型
      console.log(`  ${allModels.length + 1}. 自定义模型`);

      const choice = await ask(`选择模型 (1-${allModels.length + 1}, 直接回车使用默认): `);

      if (choice && parseInt(choice) === allModels.length + 1) {
        // 自定义模型
        const customProvider = await ask('输入 Provider 名称: ');
        const customModel = await ask('输入模型名称: ');
        agentConfigs[agent.key] = {
          provider: customProvider,
          model: customModel,
          system_prompt: getDefaultSystemPrompt(agent.key),
          temperature: getDefaultTemperature(agent.key),
          enabled: true,
        };
      } else if (choice && parseInt(choice) > 0 && parseInt(choice) <= allModels.length) {
        const selected = allModels[parseInt(choice) - 1];
        agentConfigs[agent.key] = {
          provider: selected.provider,
          model: selected.model,
          system_prompt: getDefaultSystemPrompt(agent.key),
          temperature: getDefaultTemperature(agent.key),
          enabled: true,
        };
      } else {
        // 使用默认（第一个）
        agentConfigs[agent.key] = {
          provider: allModels[0].provider,
          model: allModels[0].model,
          system_prompt: getDefaultSystemPrompt(agent.key),
          temperature: getDefaultTemperature(agent.key),
          enabled: true,
        };
        console.log(`  → 使用默认: ${allModels[0].provider}/${allModels[0].model}`);
      }
    }
  }

  // 步骤 3: 确认配置
  console.log('\n\n── 步骤 3: 确认配置 ──\n');

  console.log('Provider 配置:');
  providers.forEach(p => {
    console.log(`  - ${p.name}: ${p.base_url} (默认模型: ${p.default_model || 'N/A'})`);
  });

  console.log('\nAgent 配置:');
  for (const [key, config] of Object.entries(agentConfigs)) {
    console.log(`  - ${key}: ${config.provider}/${config.model}`);
  }

  const confirm = await ask('\n确认保存配置？(Y/n): ');
  if (confirm.toLowerCase() === 'n') {
    console.log('配置已取消。');
    rl.close();
    return;
  }

  // 保存配置
  const config: AppConfig = {
    providers,
    agents: agentConfigs,
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

  saveConfig(config);

  console.log(`\n✓ 配置已保存到: ${getConfigPath()}`);
  console.log('\n现在可以运行 "openagents" 启动会话了！');

  rl.close();
}

function getDefaultSystemPrompt(agentType: string): string {
  const prompts: Record<string, string> = {
    planner: `你是一个任务规划专家。你的职责是：
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
    coder: `你是一个高级程序员。你的职责是：
1. 根据任务描述编写高质量代码
2. 遵循最佳实践和设计模式
3. 编写清晰的注释和文档
4. 考虑边界情况和错误处理

输出代码时请使用 Markdown 代码块，并注明编程语言。`,
    reviewer: `你是一个代码审查专家。你的职责是：
1. 审查代码的正确性、可读性和性能
2. 发现潜在的 bug 和安全漏洞
3. 提供改进建议
4. 确保代码符合最佳实践

请用结构化的方式输出审查结果：
- 问题列表（严重程度：高/中/低）
- 改进建议
- 总体评价`,
    researcher: `你是一个技术研究专家。你的职责是：
1. 调研技术方案和最佳实践
2. 分析不同方案的优缺点
3. 提供技术选型建议
4. 整理相关文档和资源

请提供结构化的研究报告，包括：背景、方案对比、推荐方案、参考资料。`,
  };
  return prompts[agentType] || '你是一个有用的 AI 助手。';
}

function getDefaultTemperature(agentType: string): number {
  const temps: Record<string, number> = {
    planner: 0.7,
    coder: 0.3,
    reviewer: 0.5,
    researcher: 0.7,
  };
  return temps[agentType] || 0.7;
}

export async function runUninstall(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║             OpenAgents 卸载                              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const { getConfigDir } = await import('../config/loader.js');
  const configDir = getConfigDir();

  console.log('将要执行以下操作:');
  console.log(`  1. 删除配置目录: ${configDir}`);
  console.log('  2. 全局卸载 openagents 包\n');

  const confirm = await ask('确认卸载？(y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('卸载已取消。');
    rl.close();
    return;
  }

  // 删除配置目录
  const fs = await import('fs');
  if (fs.existsSync(configDir)) {
    fs.rmSync(configDir, { recursive: true, force: true });
    console.log(`✓ 已删除配置目录: ${configDir}`);
  } else {
    console.log(`配置目录不存在: ${configDir}`);
  }

  console.log('\n正在卸载 npm 包...');
  console.log('请手动运行: npm uninstall -g openagents');
  console.log('\n✓ 卸载完成！');

  rl.close();
}
