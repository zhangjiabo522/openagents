import { Command } from 'commander';
import { loadConfig, saveConfig, configExists, getConfigPath } from '../config/loader.js';
import { Session } from '../core/session.js';
import { runSetup, runUninstall } from './setup.js';

export function createCommands(): Command {
  const program = new Command();

  program
    .name('openagents')
    .description('Terminal multi-agent collaboration tool')
    .version('2.0.0');

  // 启动命令
  program
    .command('start')
    .description('Start an interactive session')
    .option('-n, --name <name>', 'Session name')
    .option('-r, --resume <id>', 'Resume a session by ID')
    .action(async (options) => {
      // 由 index.ts 处理
    });

  // 快速恢复最近会话
  program
    .command('resume')
    .description('Resume the most recent session')
    .action(async () => {
      const sessions = Session.listSessions();
      if (sessions.length === 0) {
        console.log('没有保存的会话。');
        return;
      }
      // 设置 resume ID，由 index.ts 处理
      process.env.OPENAGENTS_RESUME_ID = sessions[0].id;
    });

  // 配置命令
  const configCmd = program
    .command('config')
    .description('Manage configuration');

  configCmd
    .command('init')
    .description('Interactive configuration setup')
    .option('-f, --force', 'Force overwrite existing configuration')
    .action(async (options) => {
      if (configExists() && !options.force) {
        console.log(`配置文件已存在: ${getConfigPath()}`);
        console.log('如需重新配置，请使用 "openagents config init --force"');
        return;
      }
      await runSetup();
    });

  configCmd
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const config = loadConfig();
      const safeConfig = {
        ...config,
        providers: config.providers.map(p => ({
          ...p,
          api_key: p.api_key.slice(0, 8) + '***' + p.api_key.slice(-4),
        })),
      };
      console.log(JSON.stringify(safeConfig, null, 2));
    });

  configCmd
    .command('path')
    .description('Show configuration file path')
    .action(() => {
      console.log(getConfigPath());
    });

  // 会话命令
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
        const date = new Date(s.updatedAt).toLocaleString();
        console.log(`${i + 1}. ${s.name}`);
        console.log(`   ID: ${s.id}`);
        console.log(`   更新: ${date} | 消息: ${s.messages.length} 条`);
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

  sessionCmd
    .command('clear')
    .description('Delete all sessions')
    .action(async () => {
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question('确认删除所有会话？(y/N): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          const sessions = Session.listSessions();
          sessions.forEach(s => Session.deleteSession(s.id));
          console.log(`已删除 ${sessions.length} 个会话。`);
        } else {
          console.log('操作已取消。');
        }
        rl.close();
      });
    });

  // Agent 命令
  program
    .command('agents')
    .description('List available agents')
    .action(() => {
      const config = loadConfig();
      console.log('配置的 Agent:\n');
      for (const [name, agentConfig] of Object.entries(config.agents)) {
        console.log(`- ${name}`);
        console.log(`  Provider: ${agentConfig.provider} | Model: ${agentConfig.model}`);
        console.log(`  Temperature: ${agentConfig.temperature} | Enabled: ${agentConfig.enabled}`);
        console.log();
      }
    });

  // 卸载命令
  program
    .command('uninstall')
    .description('Uninstall openagents and remove configuration')
    .action(async () => {
      await runUninstall();
    });

  return program;
}
