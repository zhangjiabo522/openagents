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
  private inputBox: any;

  private orchestrator: Orchestrator;
  private session: Session;
  private messages: Message[] = [];
  private agents: AgentState[] = [];
  private isLoading = false;
  private inputBuffer = '';
  private cursorPos = 0;
  private agentPanelWidth = 22;

  // 弹窗模式：null 表示无弹窗
  private modal: 'approval' | 'session' | null = null;
  private modalBox: any = null;
  private modalResolve?: (value: boolean) => void;
  private modalBuffer = '';

  constructor(options: ScreenOptions) {
    // 只让 blessed 管理 stdin，不额外 setRawMode
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'OpenAgents v2.4',
      dockBorders: false,
      input: process.stdin,
      output: process.stdout,
      terminal: 'xterm-256color',
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
    this.bindKeys();
    this.bindOrchestrator();
    this.renderAll();
  }

  // ─── 布局 ───────────────────────────────────────────

  private get cols(): number { return this.screen.cols || 120; }
  private get rows(): number { return this.screen.rows || 30; }

  private buildLayout(): void {
    const w = this.cols;
    const h = this.rows;
    const agW = this.agentPanelWidth;
    const chatW = w - agW;
    const chatH = h - 4;

    this.statusBar = blessed.box({
      parent: this.screen, top: 0, left: 0, width: w, height: 1,
      tags: true, style: { fg: 'white', bg: 'blue' },
    });

    this.chatBox = blessed.box({
      parent: this.screen, top: 1, left: 0, width: chatW, height: chatH,
      label: ' Chat ', border: { type: 'line' }, tags: true,
      scrollable: true, alwaysScroll: true,
      scrollbar: { style: { bg: 'gray' } },
      style: { border: { fg: 'cyan' }, label: { fg: 'cyan' } },
    });

    this.agentBox = blessed.box({
      parent: this.screen, top: 1, left: chatW, width: agW, height: chatH,
      label: ' Agents ', border: { type: 'line' }, tags: true,
      style: { border: { fg: 'gray' }, label: { fg: 'cyan' } },
    });

    this.inputBox = blessed.box({
      parent: this.screen, top: h - 3, left: 0, width: w, height: 3,
      label: ' Input ', border: { type: 'line' }, tags: true,
      style: { border: { fg: 'cyan' }, label: { fg: 'cyan' } },
    });
  }

  private relayout(): void {
    const w = this.cols;
    const h = this.rows;
    const agW = this.agentPanelWidth;
    const chatW = w - agW;
    const chatH = h - 4;

    this.statusBar.width = w;
    this.chatBox.width = chatW;
    this.chatBox.height = chatH;
    this.agentBox.left = chatW;
    this.agentBox.width = agW;
    this.agentBox.height = chatH;
    this.inputBox.top = h - 3;
    this.inputBox.width = w;
    this.screen.render();
  }

  // ─── 按键处理 (只用 blessed 的 key 事件) ───────────

  private bindKeys(): void {
    // 用 blessed 的 key 事件，不再手动 setRawMode
    this.screen.on('keypress', (_ch: string, key: any) => {
      if (!key) return;
      this.handleKey(key);
    });

    this.screen.on('resize', () => this.relayout());

    // agent 状态轮询
    setInterval(() => {
      const fresh = this.orchestrator.getState().agents;
      if (JSON.stringify(fresh) !== JSON.stringify(this.agents)) {
        this.agents = fresh;
        this.renderAgents();
      }
    }, 2000);
  }

  private handleKey(key: any): void {
    const name = key.name || '';
    const ctrl = key.ctrl || false;

    // Ctrl+C → 退出
    if (name === 'c' && ctrl) {
      this.cleanup();
      process.exit(0);
    }

    // 弹窗模式走独立逻辑
    if (this.modal === 'approval') {
      this.handleApprovalKey(name);
      return;
    }
    if (this.modal === 'session') {
      this.handleSessionKey(name, key.ch);
      return;
    }

    // ESC → 取消 AI 回复
    if (name === 'escape' && this.isLoading) {
      this.orchestrator.abort();
      this.isLoading = false;
      this.addMessage('system', 'system', '已取消');
      this.renderAll();
      return;
    }

    // Enter → 提交
    if (name === 'enter') {
      if (this.inputBuffer.trim() && !this.isLoading) {
        const text = this.inputBuffer;
        this.inputBuffer = '';
        this.cursorPos = 0;
        this.submitInput(text);
      }
      return;
    }

    // Backspace
    if (name === 'backspace') {
      if (this.cursorPos > 0) {
        this.inputBuffer =
          this.inputBuffer.slice(0, this.cursorPos - 1) +
          this.inputBuffer.slice(this.cursorPos);
        this.cursorPos--;
        this.renderInput();
      }
      return;
    }

    // 忽略其他控制/功能键
    if (!key.ch || key.ch.length === 0) return;
    if (key.ch.charCodeAt(0) < 32) return;

    // 普通字符输入
    this.inputBuffer =
      this.inputBuffer.slice(0, this.cursorPos) +
      key.ch +
      this.inputBuffer.slice(this.cursorPos);
    this.cursorPos += key.ch.length;
    this.renderInput();
  }

  // ─── 弹窗按键 ─────────────────────────────────────

  private handleApprovalKey(name: string): void {
    if (!this.modalResolve) return;
    if (name === 'y') {
      this.closeModal();
      this.modalResolve(true);
    } else if (name === 'n' || name === 'escape') {
      this.closeModal();
      this.modalResolve(false);
    }
  }

  private handleSessionKey(name: string, ch: string): void {
    if (name === 'escape' || ch === 'q') {
      this.closeModal();
      return;
    }
    if (ch >= '0' && ch <= '9') {
      this.modalBuffer += ch;
    }
    if (name === 'enter') {
      const sessions = Session.listSessions();
      const idx = parseInt(this.modalBuffer) - 1;
      if (idx >= 0 && idx < sessions.length) {
        const loaded = Session.load(sessions[idx].id);
        if (loaded) {
          this.session = loaded;
          this.messages = loaded.getMessages();
          this.renderAll();
        }
      }
      this.closeModal();
    }
  }

  private closeModal(): void {
    if (this.modalBox) {
      this.modalBox.destroy();
      this.modalBox = null;
    }
    this.modal = null;
    this.modalBuffer = '';
    this.screen.render();
  }

  // ─── 消息/命令处理 ─────────────────────────────────

  private async submitInput(input: string): Promise<void> {
    if (input.startsWith('/')) {
      this.handleCommand(input);
      return;
    }

    this.isLoading = true;
    this.addMessage('user_input', 'user', input);
    this.renderAll();

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
      case 'quit': case 'exit':
        this.cleanup(); process.exit(0); break;
      case 'clear':
        this.messages = []; break;
      case 'reset':
        this.orchestrator.resetAllAgents(); this.messages = []; break;
      case 'save':
        this.session.save();
        this.addMessage('system', 'system', '会话已保存'); break;
      case 'sessions':
        this.showSessionPicker(); return; // 弹窗模式，不 reset inputBuffer
      case 'help':
        this.addMessage('system', 'system', [
          '/quit, /exit  退出',
          '/clear        清屏',
          '/reset        重置',
          '/save         保存',
          '/sessions     历史会话',
          '/help         帮助',
          '',
          'ESC 取消回复 | Ctrl+C 退出',
        ].join('\n')); break;
      default:
        this.addMessage('system', 'system', `未知命令: ${cmd}`);
    }
    this.inputBuffer = '';
    this.cursorPos = 0;
    this.renderAll();
  }

  private addMessage(type: string, from: string, content: string): void {
    const msg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: type as Message['type'],
      from, content, timestamp: new Date(),
    };
    this.messages.push(msg);
    this.session.addMessage(msg);
  }

  // ─── Orchestrator 事件 ─────────────────────────────

  private bindOrchestrator(): void {
    this.orchestrator.on('response', (text: string) => {
      this.addMessage('agent_message', 'orchestrator', text);
      this.isLoading = false;
      this.renderAll();
    });

    this.orchestrator.on('error', (err: Error) => {
      this.addMessage('system', 'system', `错误: ${err.message}`);
      this.isLoading = false;
      this.renderAll();
    });

    this.orchestrator.on('status_change', () => {
      this.agents = this.orchestrator.getState().agents;
      this.renderAgents();
      this.renderStatus();
    });
  }

  // ─── 渲染 ───────────────────────────────────────────

  private renderAll(): void {
    this.renderStatus();
    this.renderMessages();
    this.renderAgents();
    this.renderInput();
  }

  private renderStatus(): void {
    const tag = this.isLoading
      ? '{yellow-fg}⟳ 处理中{/yellow-fg}'
      : '{green-fg}就绪{/green-fg}';
    this.statusBar.setContent(
      ` {bold}OpenAgents{/bold} │ ${this.session.getName()} │ ${tag} │ ${this.messages.length}条 │ /help`
    );
    this.screen.render();
  }

  private renderMessages(): void {
    const lines: string[] = [];
    for (const msg of this.messages.slice(-80)) {
      const t = msg.timestamp.toLocaleTimeString();
      let pre: string, clr: string;
      switch (msg.type) {
        case 'user_input':  pre = 'You';   clr = 'green';  break;
        case 'agent_message': pre = 'Agent'; clr = 'yellow'; break;
        case 'system':      pre = '!';     clr = 'magenta'; break;
        default:            pre = msg.from; clr = 'white';
      }
      lines.push(`{${clr}-fg}{bold}[${pre}]{/bold}{/${clr}-fg} {gray-fg}${t}{/gray-fg}`);
      for (const l of msg.content.split('\n')) lines.push(`  ${l}`);
      lines.push('');
    }
    this.chatBox.setContent(lines.join('\n'));
    this.chatBox.setScrollPerc(100);
    this.screen.render();
  }

  private renderAgents(): void {
    const lines: string[] = [];
    for (const a of this.agents) {
      let icon: string, clr: string;
      switch (a.status) {
        case 'idle':     icon = '○'; clr = 'gray';   break;
        case 'working':  icon = '●'; clr = 'green';  break;
        case 'thinking': icon = '◐'; clr = 'yellow'; break;
        case 'error':    icon = '✗'; clr = 'red';    break;
        default:         icon = '?'; clr = 'white';
      }
      const name = (a.name || a.type).slice(0, 10);
      const tk = a.tokenUsage > 0 ? ` ${a.tokenUsage}tk` : '';
      lines.push(`{${clr}-fg}${icon}{/${clr}-fg} ${name}${tk}`);
      if (a.currentTask) {
        lines.push(`  {yellow-fg}${a.currentTask.description.slice(0, 14)}{/yellow-fg}`);
      }
    }
    if (lines.length === 0) lines.push('{gray-fg}等待启动...{/gray-fg}');
    this.agentBox.setContent(lines.join('\n'));
    this.screen.render();
  }

  private renderInput(): void {
    const pre = this.isLoading ? '⟳ ' : '> ';
    this.inputBox.setContent(pre + this.inputBuffer + '█');
    this.screen.render();
  }

  // ─── 弹窗 ───────────────────────────────────────────

  private showApproval(tool: string, params: Record<string, string>): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = params.command || '';
      const reason = params.reason || '';
      const lines = ['', `  工具: ${tool}`, `  命令: {red-fg}${cmd}{/red-fg}`];
      if (reason) lines.push(`  原因: ${reason}`);
      lines.push('', '  按 {bold}Y{/bold} 执行 | 按 {bold}N{/bold} 拒绝');

      this.modal = 'approval';
      this.modalResolve = resolve;
      this.modalBox = blessed.box({
        parent: this.screen, top: 'center', left: 'center',
        width: 50, height: lines.length + 2,
        label: ' ⚠ 审批 ', border: { type: 'double' }, tags: true,
        style: { border: { fg: 'yellow' }, label: { fg: 'yellow' } },
        content: lines.join('\n'),
      });
      this.screen.render();
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
      const d = new Date(s.updatedAt).toLocaleString();
      return `  ${i + 1}. ${s.name} (${s.messages.length}条, ${d})`;
    });
    this.modal = 'session';
    this.modalBuffer = '';
    this.modalBox = blessed.box({
      parent: this.screen, top: 'center', left: 'center',
      width: 55, height: sessions.length + 6,
      label: ' 历史会话 (编号选择, q取消) ',
      border: { type: 'line' }, tags: true,
      style: { border: { fg: 'cyan' }, label: { fg: 'cyan' } },
      content: '\n' + lines.join('\n'),
    });
    this.screen.render();
  }

  private cleanup(): void {
    this.screen.destroy();
  }

  render(): void {
    this.screen.render();
  }
}
