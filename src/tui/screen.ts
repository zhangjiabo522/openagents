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
  private agentPanelWidth = 22;

  constructor(options: ScreenOptions) {
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'OpenAgents v2.3',
      dockBorders: false,
      input: process.stdin,
      output: process.stdout,
    });

    const llm = new LLMClient(options.config.providers);
    this.orchestrator = new Orchestrator(options.config, llm);
    this.orchestrator.setApproveCallback((tool, params) => this.showApproval(tool, params));

    if (options.resumeSessionId) {
      const loaded = Session.load(options.resumeSessionId);
      this.session = loaded || new Session(options.sessionName);
      if (loaded) this.messages = loaded.getMessages();
    } else {
      this.session = new Session(options.sessionName);
    }

    this.buildLayout();
    this.bindEvents();
    this.renderAll();
  }

  private get cols(): number {
    return this.screen.cols || process.stdout.columns || 120;
  }

  private get rows(): number {
    return this.screen.rows || process.stdout.rows || 30;
  }

  private buildLayout(): void {
    const w = this.cols;
    const h = this.rows;
    const agW = this.agentPanelWidth;
    const chatW = w - agW - 1;

    // 状态栏 - 第0行，全宽
    this.statusBar = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: w,
      height: 1,
      tags: true,
      style: { fg: 'white', bg: 'blue' },
    });

    // 聊天区 - 从第1行到倒数第4行
    const chatH = h - 4;
    this.chatBox = blessed.box({
      parent: this.screen,
      top: 1,
      left: 0,
      width: chatW,
      height: chatH,
      label: ' Chat ',
      border: { type: 'line' },
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { style: { bg: 'gray' } },
      style: { border: { fg: 'cyan' }, label: { fg: 'cyan' } },
    });

    // Agent面板 - 紧贴chatBox右侧
    this.agentBox = blessed.box({
      parent: this.screen,
      top: 1,
      left: chatW,
      width: agW,
      height: chatH,
      label: ' Agents ',
      border: { type: 'line' },
      tags: true,
      style: { border: { fg: 'gray' }, label: { fg: 'cyan' } },
    });

    // 输入区 - 最底部3行
    this.inputLine = blessed.box({
      parent: this.screen,
      top: h - 3,
      left: 0,
      width: w,
      height: 3,
      label: ' Input ',
      border: { type: 'line' },
      tags: true,
      style: { border: { fg: 'cyan' }, label: { fg: 'cyan' } },
    });
  }

  private bindEvents(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', (key: string) => {
      this.handleKeyPress(key);
    });

    this.orchestrator.on('response', (response: string) => {
      this.addMessage('agent_message', 'orchestrator', response);
      this.isLoading = false;
      this.renderAll();
    });

    this.orchestrator.on('error', (error: Error) => {
      this.addMessage('system', 'system', `错误: ${error.message}`);
      this.isLoading = false;
      this.renderAll();
    });

    this.orchestrator.on('status_change', () => {
      this.agents = this.orchestrator.getState().agents;
      this.renderAgents();
      this.renderStatus();
    });

    setInterval(() => {
      const newAgents = this.orchestrator.getState().agents;
      if (JSON.stringify(newAgents) !== JSON.stringify(this.agents)) {
        this.agents = newAgents;
        this.renderAgents();
      }
    }, 2000);

    this.screen.on('resize', () => {
      this.rebuildLayout();
    });
  }

  private rebuildLayout(): void {
    const w = this.cols;
    const h = this.rows;
    const agW = this.agentPanelWidth;
    const chatW = w - agW - 1;
    const chatH = h - 4;

    this.statusBar.width = w;

    this.chatBox.width = chatW;
    this.chatBox.height = chatH;

    this.agentBox.left = chatW;
    this.agentBox.width = agW;
    this.agentBox.height = chatH;

    this.inputLine.top = h - 3;
    this.inputLine.width = w;

    this.renderAll();
  }

  private handleKeyPress(key: string): void {
    // Ctrl+C
    if (key === '\x03') {
      this.cleanup();
      process.exit(0);
    }

    // ESC - 取消
    if (key === '\x1b' && this.isLoading) {
      this.orchestrator.abort();
      this.isLoading = false;
      this.addMessage('system', 'system', '已取消');
      this.renderAll();
      return;
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
        this.renderInput();
      }
      return;
    }

    // 跳过控制字符
    if (key.length === 1 && key.charCodeAt(0) < 32) return;

    // 普通字符
    if (key.length >= 1 && key.charCodeAt(0) >= 32) {
      this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + key + this.inputBuffer.slice(this.cursorPos);
      this.cursorPos += key.length;
      this.renderInput();
    }
  }

  private async submitInput(input: string): Promise<void> {
    if (input.startsWith('/')) {
      this.handleCommand(input);
      return;
    }

    this.isLoading = true;
    this.renderStatus();
    this.renderInput();
    this.addMessage('user_input', 'user', input);
    this.renderMessages();

    try {
      await this.orchestrator.processUserInput(input);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        this.addMessage('system', 'system', `错误: ${(error as Error).message}`);
      }
      this.isLoading = false;
    }

    this.session.save();
    this.renderStatus();
    this.renderInput();
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
        this.addMessage('system', 'system', [
          '/quit, /exit  - 退出',
          '/clear        - 清屏',
          '/reset        - 重置 Agent',
          '/save         - 保存会话',
          '/sessions     - 历史会话',
          '/help         - 帮助',
          '',
          'ESC - 取消当前回复  Ctrl+C - 退出',
        ].join('\n'));
        this.renderMessages();
        break;
      default:
        this.addMessage('system', 'system', `未知命令: ${cmd}`);
        this.renderMessages();
    }

    this.inputBuffer = '';
    this.cursorPos = 0;
    this.renderInput();
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

  // ─── 渲染 ───────────────────────────────────────────

  private renderAll(): void {
    this.renderStatus();
    this.renderMessages();
    this.renderAgents();
    this.renderInput();
  }

  private renderStatus(): void {
    const tag = this.isLoading ? '{yellow-fg}⟳ 处理中{/yellow-fg}' : '{green-fg}就绪{/green-fg}';
    this.statusBar.setContent(
      ` {bold}OpenAgents{/bold} │ ${this.session.getName()} │ ${tag} │ ${this.messages.length}条 │ ESC取消 │ /help`
    );
    this.screen.render();
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

      const name = (agent.name || agent.type).slice(0, 10);
      const tk = agent.tokenUsage > 0 ? ` ${agent.tokenUsage}tk` : '';
      lines.push(`{${color}-fg}${icon}{/${color}-fg} ${name}${tk}`);

      if (agent.currentTask) {
        const desc = agent.currentTask.description.slice(0, 14);
        lines.push(`  {yellow-fg}${desc}{/yellow-fg}`);
      }
    }

    if (lines.length === 0) {
      lines.push('{gray-fg}等待启动...{/gray-fg}');
    }

    this.agentBox.setContent(lines.join('\n'));
    this.screen.render();
  }

  private renderInput(): void {
    const prefix = this.isLoading ? '⟳ ' : '> ';
    this.inputLine.setContent(prefix + this.inputBuffer + '█');
    this.screen.render();
  }

  // ─── 弹窗 ───────────────────────────────────────────

  private showApproval(tool: string, params: Record<string, string>): Promise<boolean> {
    return new Promise((resolve) => {
      const command = params.command || '';
      const reason = params.reason || '';
      const lines = [
        '',
        `  工具: ${tool}`,
        `  命令: {red-fg}${command}{/red-fg}`,
      ];
      if (reason) lines.push(`  原因: ${reason}`);
      lines.push('', '  按 {bold}Y{/bold} 执行 | 按 {bold}N{/bold} 拒绝');

      const box = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: 50,
        height: lines.length + 2,
        label: ' ⚠ 审批 ',
        border: { type: 'double' },
        tags: true,
        style: { border: { fg: 'yellow' }, label: { fg: 'yellow' } },
        content: lines.join('\n'),
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
      width: 55,
      height: sessions.length + 6,
      label: ' 历史会话 (编号选择, q取消) ',
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
      if (key >= '0' && key <= '9') buffer += key;
      if (key === '\r' || key === '\n') {
        const idx = parseInt(buffer) - 1;
        if (idx >= 0 && idx < sessions.length) {
          const loaded = Session.load(sessions[idx].id);
          if (loaded) {
            this.session = loaded;
            this.messages = loaded.getMessages();
            this.renderAll();
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
