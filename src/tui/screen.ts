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
  private orchestrator: Orchestrator;
  private session: Session;
  private messages: Message[] = [];
  private isLoading = false;
  private inputBuffer = '';
  private cursorPos = 0;

  // 审批回调
  private approvalResolve?: (v: boolean) => void;

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

    this.initInput();
    this.bindOrchestrator();
    this.printWelcome();
    this.showPrompt();
  }

  // ─── 终端输入（raw mode，手动回显，避免中文双重显示）───

  private initInput(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', (data: string) => {
      // 审批模式
      if (this.approvalResolve) {
        if (data === 'y' || data === 'Y') {
          this.approvalResolve(true);
          this.approvalResolve = undefined;
        } else if (data === 'n' || data === 'N' || data === '\r' || data === '\n') {
          this.approvalResolve(false);
          this.approvalResolve = undefined;
        }
        return;
      }

      this.onKey(data);
    });
  }

  private onKey(data: string): void {
    // Ctrl+C
    if (data === '\x03') {
      this.cleanup();
      process.exit(0);
    }

    // Enter
    if (data === '\r' || data === '\n') {
      const line = this.inputBuffer.trim();
      this.inputBuffer = '';
      this.cursorPos = 0;
      process.stdout.write('\n');
      if (line) this.onLine(line);
      else this.showPrompt();
      return;
    }

    // Backspace
    if (data === '\x7f' || data === '\b') {
      if (this.cursorPos > 0) {
        this.inputBuffer =
          this.inputBuffer.slice(0, this.cursorPos - 1) +
          this.inputBuffer.slice(this.cursorPos);
        this.cursorPos--;
        this.redrawInput();
      }
      return;
    }

    // 跳过 ESC 序列和其他控制字符
    if (data.startsWith('\x1b')) return;
    if (data.charCodeAt(0) < 32) return;

    // 普通字符：手动回显
    this.inputBuffer =
      this.inputBuffer.slice(0, this.cursorPos) +
      data +
      this.inputBuffer.slice(this.cursorPos);
    this.cursorPos += data.length;

    // 回显到终端
    process.stdout.write(data);
  }

  /** 重新绘制输入行（Backspace 后） */
  private redrawInput(): void {
    // 光标退一格，写空格覆盖，再退一格
    process.stdout.write('\b \b');
  }

  private showPrompt(): void {
    process.stdout.write(chalk.green('> '));
  }

  private cleanup(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }

  // ─── 欢迎 ───────────────────────────────────────────

  private printWelcome(): void {
    console.log('');
    console.log(chalk.bold.cyan('  OpenAgents v3.1'));
    console.log(chalk.gray('  会话: ') + this.session.getName());
    console.log(chalk.gray('  输入 /help 查看命令'));
    console.log('');
  }

  // ─── Orchestrator 事件 ─────────────────────────────

  private bindOrchestrator(): void {
    this.orchestrator.on('response', (text: string) => {
      this.isLoading = false;
      console.log('');
      console.log(chalk.yellow.bold('[Agent]'));
      console.log(text);
      console.log('');
      this.showPrompt();
    });

    this.orchestrator.on('error', (err: Error) => {
      this.isLoading = false;
      console.log('');
      console.log(chalk.red(`错误: ${err.message}`));
      console.log('');
      this.showPrompt();
    });
  }

  // ─── 消息处理 ─────────────────────────────────────

  private async onLine(line: string): Promise<void> {
    if (line.startsWith('/')) {
      this.handleCommand(line);
      return;
    }

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
      this.showPrompt();
    }
  }

  private handleCommand(input: string): void {
    const cmd = input.slice(1).trim().split(' ')[0];

    switch (cmd) {
      case 'quit': case 'exit':
        console.log(chalk.gray('\n再见！'));
        this.cleanup();
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

    this.showPrompt();
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

  // ─── 审批 ───────────────────────────────────────────

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
      process.stdout.write(chalk.yellow('执行？(y/N): '));
      this.approvalResolve = resolve;
    });
  }
}
