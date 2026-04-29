#!/usr/bin/env node

import { Command } from 'commander';
import * as os from 'os';
import { loadConfig } from './config/loader.js';
import { createCommands } from './cli/commands.js';

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
    const config = loadConfig();

    // 检查是否配置了 provider
    if (config.providers.length === 0) {
      console.log('欢迎使用 OpenAgents！');
      console.log();
      console.log('首次使用请先配置 API Provider:');
      console.log('  openagents config init');
      console.log();
      console.log('然后编辑配置文件添加你的 API Key:');
      console.log(`  ${os.homedir()}/.openagents/config.yaml`);
      console.log();
      console.log('示例配置:');
      console.log(`providers:
  - name: openai
    api_key: sk-your-api-key
    base_url: https://api.openai.com/v1
  - name: deepseek
    api_key: sk-your-api-key
    base_url: https://api.deepseek.com/v1`);
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
