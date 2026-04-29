#!/usr/bin/env node

import { Command } from 'commander';
import * as os from 'os';
import { loadConfig, configExists } from './config/loader.js';
import { createCommands } from './cli/commands.js';
import { runSetup } from './cli/setup.js';

const program = createCommands();

// 覆盖默认的 start 命令
program.commands.forEach(cmd => {
  if (cmd.name() === 'start') {
    cmd.action(async (options: { name?: string; resume?: string }) => {
      await startApp(options.name, options.resume);
    });
  }
});

// 默认动作
program.action(async () => {
  await startApp();
});

async function startApp(sessionName?: string, resumeSessionId?: string) {
  try {
    if (!configExists()) {
      console.log('欢迎使用 OpenAgents！首次使用需要配置 API Provider。\n');
      await runSetup();
      console.log('\n正在启动 OpenAgents...\n');
    }

    const config = loadConfig();

    if (config.providers.length === 0) {
      console.log('错误: 未配置任何 API Provider。');
      console.log('请运行 "openagents config init" 进行配置。');
      return;
    }

    // 使用 blessed 全屏渲染（不闪烁）
    const { Screen } = await import('./tui/screen.js');
    new Screen({ config, sessionName, resumeSessionId });
  } catch (error) {
    console.error('启动失败:', (error as Error).message);
    process.exit(1);
  }
}

program.parse();
