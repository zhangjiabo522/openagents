import * as readline from 'readline';
import chalk from 'chalk';
import type { AppConfig } from '../config/schema.js';
import type { Message } from '../core/message-bus.js';
import { Orchestrator } from '../core/orchestrator.js';
import { Session } from '../core/session.js';
import { LLMClient } from '../llm/client.js';

interface ScreenOptions {
  config: AppConfig;
  sessionName?: string;
  resumeSessionId?: string;
}

export class Screen {
  private rl: readline.Interface;
  private orchestrator: Orchestrator;
  private session: Session;
  private messages: Message[] = [];
  private isLoading = false;

  constructor(options: ScreenOptions) {
    const llm = new LLMClient(options.config.providers);
    this.orchestrator = new Orchestrator(options.config, llm);
    this.orchestrator.setApproveCallback((tool, params) => this.askApproval(tool, params));

    if (options.resumeSessionId) {
      const loaded = Session.load(options.resumeSessionId);
      this.session = loaded || new Session(options.sessionName);
      if (loaded) this.messages = loaded.getMessages();
    } else {
      this.session = new Session(options.sessionName);
    }

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.green('> '),
      historySize: 100,
    });

    this.bindEvents();
    this.printWelcome();
    this.rl.prompt();
  }

  private printWelcome(): void {
    console.log('');
    console.log(chalk.bold.cyan('  OpenAgents v3.0'));
    console.log(chalk.gray('  会话: ') + this.session.getName());
    console.log(chalk.gray('  输入 /help 查看命令'));
    console.log('');
  }

  private bindEvents(): void {
    this.rl.on('line', (line: string) => {
      this.onLine(line.trim());
    });

    this.rl.on('close', () => {
      console.log(chalk.gray('\n再见！'));
      process.exit(0);
    });

    this.orchestrator.on('response', (text: string) => {
      this.isLoading = false;
      console.log('');
      console.log(chalk.yellow.bold('[Agent]'));
      console.log(text);
      console.log('');
      this.rl.prompt();
    });

    this.orchestrator.on('error', (err: Error) => {
      this.isLoading = false;
      console.log('');
      console.log(chalk.red(`错误: ${err.message}`));
      console.log('');
      this.rl.prompt();
    });
  }

  private async onLine(line: string): Promise<void> {
    if (!line) {
      this.rl.prompt();
      return;
    }

    // 命令
    if (line.startsWith('/')) {
      this.handleCommand(line);
      return;
    }

    // 发送消息
    this.isLoading = true;
    console.log(chalk.green(`\n[You] ${line}`));

    this.messages.push({
      id: `msg-${Date.now()}`,
      type: 'user_input',
      from: 'user',
      content: line,
      timestamp: new Date(),
    });
    this.session.addMessage(this.messages[this.messages.length - 1]);

    try {
      await this.orchestrator.processUserInput(line);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.log(chalk.red(`错误: ${(error as Error).message}`));
      }
      this.isLoading = false;
    }

    this.session.save();
    if (this.isLoading) {
      this.isLoading = false;
      this.rl.prompt();
    }
  }

  private handleCommand(input: string): void {
    const cmd = input.slice(1).trim().split(' ')[0];

    switch (cmd) {
      case 'quit':
      case 'exit':
        console.log(chalk.gray('再见！'));
        process.exit(0);
        break;

      case 'clear':
        console.clear();
        break;

      case 'reset':
        this.orchestrator.resetAllAgents();
        this.messages = [];
        console.log(chalk.yellow('已重置所有 Agent'));
        break;

      case 'save':
        this.session.save();
        console.log(chalk.green('会话已保存'));
        break;

      case 'sessions':
        this.showSessions();
        break;

      case 'agents':
        this.showAgents();
        break;

      case 'help':
        console.log('');
        console.log(chalk.bold('可用命令:'));
        console.log('  /quit, /exit   退出');
        console.log('  /clear         清屏');
        console.log('  /reset         重置所有 Agent');
        console.log('  /save          保存会话');
        console.log('  /sessions      查看历史会话');
        console.log('  /agents        查看 Agent 状态');
        console.log('  /help          帮助');
        console.log('');
        break;

      default:
        console.log(chalk.yellow(`未知命令: ${cmd}，输入 /help 查看帮助`));
    }

    this.rl.prompt();
  }

  private showSessions(): void {
    const sessions = Session.listSessions();
    if (sessions.length === 0) {
      console.log(chalk.gray('没有保存的会话'));
      return;
    }
    console.log('');
    console.log(chalk.bold('历史会话:'));
    sessions.forEach((s, i) => {
      const d = new Date(s.updatedAt).toLocaleString();
      console.log(`  ${i + 1}. ${chalk.bold(s.name)} (${s.messages.length}条, ${d})`);
      console.log(`     ID: ${chalk.gray(s.id)}`);
    });
    console.log('');
  }

  private showAgents(): void {
    const state = this.orchestrator.getState();
    console.log('');
    console.log(chalk.bold('Agent 状态:'));
    for (const a of state.agents) {
      let icon: string;
      switch (a.status) {
        case 'idle':     icon = chalk.gray('○'); break;
        case 'working':  icon = chalk.green('●'); break;
        case 'thinking': icon = chalk.yellow('◐'); break;
        case 'error':    icon = chalk.red('✗'); break;
        default:         icon = '?';
      }
      const name = a.name || a.type;
      const tk = a.tokenUsage > 0 ? chalk.gray(` (${a.tokenUsage} tokens)`) : '';
      console.log(`  ${icon} ${name}${tk}`);
    }
    console.log('');
  }

  private askApproval(tool: string, params: Record<string, string>): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = params.command || '';
      const reason = params.reason || '';
      console.log('');
      console.log(chalk.yellow.bold('⚠ 需要审批'));
      console.log(`  工具: ${tool}`);
      console.log(`  命令: ${chalk.red(cmd)}`);
      if (reason) console.log(`  原因: ${reason}`);
      console.log('');

      this.rl.question(chalk.yellow('执行？(y/N): '), (answer) => {
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }
}
