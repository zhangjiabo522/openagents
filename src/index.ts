#!/usr/bin/env node

import { Command } from 'commander';
import * as os from 'os';
import { loadConfig, configExists } from './config/loader.js';
import { createCommands } from './cli/commands.js';
import { runSetup } from './cli/setup.js';

const program = createCommands();

// 覆盖默认的 start 命令来启动 TUI
program.commands.forEach(cmd => {
  if (cmd.name() === 'start') {
    cmd.action(async (options: { name?: string }) => {
      await startApp(options.name);
    });
  }
});

// 如果没有子命令，也启动 TUI
program.action(async () => {
  await startApp();
});

async function startApp(sessionName?: string) {
  try {
    // 如果配置不存在，自动运行 setup
    if (!configExists()) {
      console.log('欢迎使用 OpenAgents！首次使用需要配置 API Provider。\n');
      await runSetup();
      console.log('\n正在启动 OpenAgents...\n');
    }

    const config = loadConfig();

    // 检查是否配置了 provider
    if (config.providers.length === 0) {
      console.log('错误: 未配置任何 API Provider。');
      console.log('请运行 "openagents config init" 进行配置。');
      return;
    }

    // 动态导入 React 和 Ink（避免在没有配置时加载）
    const React = await import('react');
    const { render } = await import('ink');
    const { App } = await import('./tui/App.js');

    const { waitUntilExit } = render(
      React.createElement(App, { config, sessionName })
    );

    await waitUntilExit();
  } catch (error) {
    console.error('启动失败:', (error as Error).message);
    process.exit(1);
  }
}

program.parse();
