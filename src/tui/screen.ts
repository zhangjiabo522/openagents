import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const blessed = require('blessed');

import type { AppConfig } from '../config/schema.js';
import type { Message } from '../core/message-bus.js';
import type { AgentState } from '../agents/base-agent.js';
import { Orchestrator } from '../core/orchestrator.js';
import { Session } from '../core/session.js';
import { LLMClient } from '../llm/client.js';

interface ScreenOptions {
  config: AppConfig;
  sessionName?: string;
  resumeSessionId?: string;
}

export class Screen {
  private screen: any;
  private chatBox: any;
  private agentBox: any;
  private statusBar: any;
  private inputLine: any;

  private orchestrator: Orchestrator;
  private session: Session;
  private messages: Message[] = [];
  private agents: AgentState[] = [];
  private isLoading = false;
  private inputBuffer = '';
  private cursorPos = 0;

  constructor(options: ScreenOptions) {
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'OpenAgents v2.0',
      dockBorders: true,
      input: process.stdin,
      output: process.stdout,
    });

    // 初始化 Orchestrator
    const llm = new LLMClient(options.config.providers);
    this.orchestrator = new Orchestrator(options.config, llm);
    this.orchestrator.setApproveCallback((tool, params) => this.showApproval(tool, params));

    // 加载会话
    if (options.resumeSessionId) {
      const loaded = Session.load(options.resumeSessionId);
      this.session = loaded || new Session(options.sessionName);
      if (loaded) this.messages = loaded.getMessages();
    } else {
      this.session = new Session(options.sessionName);
    }

    this.createLayout();
    this.bindEvents();
    this.renderMessages();
    this.renderAgents();
    this.renderInputLine();
  }

  private createLayout(): void {
    // 状态栏
    this.statusBar = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: { fg: 'white', bg: 'blue' },
      content: ' OpenAgents v2.0 | 会话: ' + this.session.getName() + ' | Ctrl+C 退出 | /help 帮助',
    });

    // 聊天区域
    this.chatBox = blessed.box({
      parent: this.screen,
      top: 1,
      left: 0,
      width: '75%',
      height: '100%-4',
      label: ' Chat ',
      border: { type: 'line' },
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { style: { bg: 'gray' } },
      style: { border: { fg: 'cyan' }, label: { fg: 'cyan' } },
    });

    // Agent 面板
    this.agentBox = blessed.box({
      parent: this.screen,
      top: 1,
      left: '75%',
      width: '25%',
      height: '100%-4',
      label: ' Agents ',
      border: { type: 'line' },
      tags: true,
      style: { border: { fg: 'gray' }, label: { fg: 'cyan' } },
    });

    // 输入行 - 使用 box 而不是 textbox，手动处理输入
    this.inputLine = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      label: ' Input ',
      border: { type: 'line' },
      tags: true,
      style: { border: { fg: 'cyan' }, label: { fg: 'cyan' } },
    });
  }

  private bindEvents(): void {
    // 直接监听 stdin 输入
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', (key: string) => {
      this.handleKeyPress(key);
    });

    // 监听 orchestrator
    this.orchestrator.on('response', (response: string) => {
      this.addMessage('agent_message', 'orchestrator', response);
      this.isLoading = false;
      this.renderMessages();
      this.renderAgents();
      this.renderStatus();
      this.renderInputLine();
    });

    this.orchestrator.on('error', (error: Error) => {
      this.addMessage('system', 'system', `错误: ${error.message}`);
      this.isLoading = false;
      this.renderMessages();
      this.renderInputLine();
    });

    this.orchestrator.on('status_change', () => {
      this.agents = this.orchestrator.getState().agents;
      this.renderAgents();
    });

    // 定时刷新 agent 状态
    setInterval(() => {
      const newAgents = this.orchestrator.getState().agents;
      if (JSON.stringify(newAgents) !== JSON.stringify(this.agents)) {
        this.agents = newAgents;
        this.renderAgents();
      }
    }, 3000);
  }

  private handleKeyPress(key: string): void {
    // Ctrl+C
    if (key === '\x03') {
      this.cleanup();
      process.exit(0);
    }

    // Enter
    if (key === '\r' || key === '\n') {
      if (this.inputBuffer.trim() && !this.isLoading) {
        this.submitInput(this.inputBuffer);
        this.inputBuffer = '';
        this.cursorPos = 0;
      }
      return;
    }

    // Backspace
    if (key === '\x7f' || key === '\b') {
      if (this.cursorPos > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos - 1) + this.inputBuffer.slice(this.cursorPos);
        this.cursorPos--;
        this.renderInputLine();
      }
      return;
    }

    // 忽略其他控制字符
    if (key.length === 1 && key.charCodeAt(0) < 32) {
      return;
    }

    // 普通字符
    if (key.length >= 1 && key.charCodeAt(0) >= 32) {
      this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + key + this.inputBuffer.slice(this.cursorPos);
      this.cursorPos += key.length;
      this.renderInputLine();
    }
  }

  private async submitInput(input: string): Promise<void> {
    // 处理命令
    if (input.startsWith('/')) {
      this.handleCommand(input);
      return;
    }

    this.isLoading = true;
    this.renderStatus();
    this.renderInputLine();

    this.addMessage('user_input', 'user', input);
    this.renderMessages();

    try {
      await this.orchestrator.processUserInput(input);
    } catch (error) {
      this.addMessage('system', 'system', `错误: ${(error as Error).message}`);
      this.isLoading = false;
    }

    this.session.save();
    this.renderStatus();
    this.renderInputLine();
  }

  private handleCommand(input: string): void {
    const cmd = input.slice(1).trim().split(' ')[0];

    switch (cmd) {
      case 'quit':
      case 'exit':
        this.cleanup();
        process.exit(0);
        break;
      case 'clear':
        this.messages = [];
        this.renderMessages();
        break;
      case 'reset':
        this.orchestrator.resetAllAgents();
        this.messages = [];
        this.renderMessages();
        this.renderAgents();
        break;
      case 'save':
        this.session.save();
        this.addMessage('system', 'system', '会话已保存');
        this.renderMessages();
        break;
      case 'sessions':
        this.showSessionPicker();
        break;
      case 'help':
        this.addMessage('system', 'system', `可用命令:
/quit, /exit  - 退出
/clear        - 清屏
/reset        - 重置 Agent
/save         - 保存会话
/sessions     - 历史会话
/help         - 帮助`);
        this.renderMessages();
        break;
      default:
        this.addMessage('system', 'system', `未知命令: ${cmd}`);
        this.renderMessages();
    }

    this.inputBuffer = '';
    this.cursorPos = 0;
    this.renderInputLine();
  }

  private addMessage(type: string, from: string, content: string): void {
    const msg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: type as Message['type'],
      from,
      content,
      timestamp: new Date(),
    };
    this.messages.push(msg);
    this.session.addMessage(msg);
  }

  private renderMessages(): void {
    const lines: string[] = [];

    for (const msg of this.messages.slice(-80)) {
      const time = msg.timestamp.toLocaleTimeString();
      let prefix: string;
      let color: string;

      switch (msg.type) {
        case 'user_input':
          prefix = 'You';
          color = 'green';
          break;
        case 'agent_message':
          prefix = 'Agent';
          color = 'yellow';
          break;
        case 'system':
          prefix = '!';
          color = 'magenta';
          break;
        default:
          prefix = msg.from;
          color = 'white';
      }

      lines.push(`{${color}-fg}{bold}[${prefix}]{/bold}{/${color}-fg} {gray-fg}${time}{/gray-fg}`);
      for (const line of msg.content.split('\n')) {
        lines.push(`  ${line}`);
      }
      lines.push('');
    }

    this.chatBox.setContent(lines.join('\n'));
    this.chatBox.setScrollPerc(100);
    this.screen.render();
  }

  private renderAgents(): void {
    const lines: string[] = [];

    for (const agent of this.agents) {
      let icon: string;
      let color: string;

      switch (agent.status) {
        case 'idle': icon = '○'; color = 'gray'; break;
        case 'working': icon = '●'; color = 'green'; break;
        case 'thinking': icon = '◐'; color = 'yellow'; break;
        case 'error': icon = '✗'; color = 'red'; break;
        default: icon = '?'; color = 'white';
      }

      lines.push(`{${color}-fg}${icon}{/${color}-fg} {bold}${agent.name}{/bold}`);
      lines.push(`  {gray-fg}${agent.type} | ${agent.tokenUsage}tk{/gray-fg}`);
      if (agent.currentTask) {
        lines.push(`  {yellow-fg}▶ ${agent.currentTask.description.slice(0, 20)}...{/yellow-fg}`);
      }
      lines.push('');
    }

    if (lines.length === 0) {
      lines.push('{gray-fg}等待启动...{/gray-fg}');
    }

    this.agentBox.setContent(lines.join('\n'));
    this.screen.render();
  }

  private renderStatus(): void {
    const status = this.isLoading ? '{yellow-fg}处理中{/yellow-fg}' : '{green-fg}就绪{/green-fg}';
    this.statusBar.setContent(` {bold}OpenAgents v2.0{/bold} │ ${this.session.getName()} │ ${status} │ ${this.messages.length}条消息 │ /help`);
    this.screen.render();
  }

  private renderInputLine(): void {
    const prefix = this.isLoading ? '⟳ ' : '> ';
    const display = prefix + this.inputBuffer + '█';
    this.inputLine.setContent(display);
    this.screen.render();
  }

  private showApproval(tool: string, params: Record<string, string>): Promise<boolean> {
    return new Promise((resolve) => {
      const command = params.command || '';
      const reason = params.reason || '';

      const box = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: '60%',
        height: reason ? 10 : 8,
        label: ' ⚠️ 需要审批 ',
        border: { type: 'double' },
        tags: true,
        style: { border: { fg: 'yellow' }, label: { fg: 'yellow' } },
        content: [
          '',
          `  工具: ${tool}`,
          `  命令: {red-fg}${command}{/red-fg}`,
          reason ? `  原因: ${reason}` : '',
          '',
          '  按 {bold}Y{/bold} 执行 | 按 {bold}N{/bold} 拒绝',
        ].filter(Boolean).join('\n'),
      });

      this.screen.render();

      const handler = (key: string) => {
        if (key.toLowerCase() === 'y') {
          box.destroy();
          process.stdin.removeListener('data', handler);
          this.screen.render();
          resolve(true);
        } else if (key.toLowerCase() === 'n' || key === '\x1b') {
          box.destroy();
          process.stdin.removeListener('data', handler);
          this.screen.render();
          resolve(false);
        }
      };

      process.stdin.on('data', handler);
    });
  }

  private showSessionPicker(): void {
    const sessions = Session.listSessions();
    if (sessions.length === 0) {
      this.addMessage('system', 'system', '没有保存的会话');
      this.renderMessages();
      return;
    }

    const lines = sessions.map((s, i) => {
      const date = new Date(s.updatedAt).toLocaleString();
      return `  ${i + 1}. ${s.name} (${s.messages.length}条, ${date})`;
    });

    const box = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '70%',
      height: sessions.length + 6,
      label: ' 历史会话 (输入编号选择, q取消) ',
      border: { type: 'line' },
      tags: true,
      style: { border: { fg: 'cyan' }, label: { fg: 'cyan' } },
      content: '\n' + lines.join('\n'),
    });

    this.screen.render();

    let buffer = '';
    const handler = (key: string) => {
      if (key === 'q' || key === '\x1b') {
        box.destroy();
        process.stdin.removeListener('data', handler);
        this.screen.render();
        return;
      }

      if (key >= '0' && key <= '9') {
        buffer += key;
      }

      if (key === '\r' || key === '\n') {
        const index = parseInt(buffer) - 1;
        if (index >= 0 && index < sessions.length) {
          const loaded = Session.load(sessions[index].id);
          if (loaded) {
            this.session = loaded;
            this.messages = loaded.getMessages();
            this.renderMessages();
            this.renderStatus();
          }
        }
        box.destroy();
        process.stdin.removeListener('data', handler);
        this.screen.render();
      }
    };

    process.stdin.on('data', handler);
  }

  private cleanup(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    this.screen.destroy();
  }

  render(): void {
    this.screen.render();
  }
}
