import { Command } from 'commander';
import { loadConfig, saveConfig, configExists, getConfigPath } from '../config/loader.js';
import { Session } from '../core/session.js';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

export function createCommands(): Command {
  const program = new Command();

  program
    .name('openagents')
    .description('Terminal multi-agent collaboration tool')
    .version('1.0.0');

  // 默认命令：启动交互式会话
  program
    .command('start', { isDefault: true })
    .description('Start an interactive session')
    .option('-n, --name <name>', 'Session name')
    .action(async (options) => {
      // 由 index.ts 处理
    });

  // 配置相关命令
  const configCmd = program
    .command('config')
    .description('Manage configuration');

  configCmd
    .command('init')
    .description('Initialize configuration file')
    .action(() => {
      if (configExists()) {
        console.log(`配置文件已存在: ${getConfigPath()}`);
        console.log('如需重新配置，请先删除现有文件。');
        return;
      }
      const config = loadConfig();
      console.log(`配置文件已创建: ${getConfigPath()}`);
      console.log('\n请编辑配置文件，添加 API Provider 信息。');
      console.log('\n示例配置:');
      console.log(`providers:
  - name: openai
    api_key: sk-your-api-key
    base_url: https://api.openai.com/v1
  - name: deepseek
    api_key: sk-your-api-key
    base_url: https://api.deepseek.com/v1`);
    });

  configCmd
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const config = loadConfig();
      console.log(JSON.stringify(config, null, 2));
    });

  configCmd
    .command('path')
    .description('Show configuration file path')
    .action(() => {
      console.log(getConfigPath());
    });

  // 会话相关命令
  const sessionCmd = program
    .command('session')
    .description('Manage sessions');

  sessionCmd
    .command('list')
    .description('List all sessions')
    .action(() => {
      const sessions = Session.listSessions();
      if (sessions.length === 0) {
        console.log('没有保存的会话。');
        return;
      }
      console.log('保存的会话:\n');
      sessions.forEach((s, i) => {
        console.log(`${i + 1}. ${s.name}`);
        console.log(`   ID: ${s.id}`);
        console.log(`   更新时间: ${new Date(s.updatedAt).toLocaleString()}`);
        console.log(`   消息数: ${s.messages.length}`);
        console.log();
      });
    });

  sessionCmd
    .command('delete <id>')
    .description('Delete a session')
    .action((id) => {
      if (Session.deleteSession(id)) {
        console.log(`会话 ${id} 已删除。`);
      } else {
        console.log(`未找到会话 ${id}。`);
      }
    });

  // Agent 相关命令
  program
    .command('agents')
    .description('List available agents')
    .action(() => {
      const config = loadConfig();
      console.log('配置的 Agent:\n');
      for (const [name, agentConfig] of Object.entries(config.agents)) {
        console.log(`- ${name}`);
        console.log(`  Provider: ${agentConfig.provider}`);
        console.log(`  Model: ${agentConfig.model}`);
        console.log(`  Temperature: ${agentConfig.temperature}`);
        console.log();
      }
    });

  return program;
}
