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
  private scrollOffset = 0;

  private modal: 'approval' | 'session' | null = null;
  private modalBox: any = null;
  private modalResolve?: (value: boolean) => void;
  private modalBuffer = '';

  constructor(options: ScreenOptions) {
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'OpenAgents v2.5',
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

    // chatBox 不启用 blessed 的 scrollable，我们自己管理滚动
    this.chatBox = blessed.box({
      parent: this.screen, top: 1, left: 0, width: chatW, height: chatH,
      label: ' Chat ', border: { type: 'line' },
      tags: false,  // 不解析标签，避免内容被干扰
      style: { border: { fg: 'cyan' }, label: { fg: 'cyan' } },
    });

    this.agentBox = blessed.box({
      parent: this.screen, top: 1, left: chatW, width: agW, height: chatH,
      label: ' Agents ', border: { type: 'line' },
      tags: false,
      style: { border: { fg: 'gray' }, label: { fg: 'cyan' } },
    });

    this.inputBox = blessed.box({
      parent: this.screen, top: h - 3, left: 0, width: w, height: 3,
      label: ' Input ', border: { type: 'line' },
      tags: false,
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
    this.renderAll();
  }

  // ─── 按键 ───────────────────────────────────────────

  private bindKeys(): void {
    this.screen.on('keypress', (_ch: string, key: any) => {
      if (!key) return;
      this.handleKey(key);
    });

    this.screen.on('resize', () => this.relayout());

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

    // Ctrl+C
    if (name === 'c' && ctrl) {
      this.cleanup();
      process.exit(0);
    }

    // 弹窗模式
    if (this.modal === 'approval') { this.handleApprovalKey(name); return; }
    if (this.modal === 'session') { this.handleSessionKey(name, key.ch); return; }

    // 滚动：PageUp / PageDown / 鼠标滚轮
    if (name === 'pageup') { this.scrollChat(-10); return; }
    if (name === 'pagedown') { this.scrollChat(10); return; }
    if (name === 'up') { this.scrollChat(-1); return; }
    if (name === 'down') { this.scrollChat(1); return; }

    // ESC → 取消
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

    // 普通字符
    if (!key.ch || key.ch.length === 0) return;
    if (key.ch.charCodeAt(0) < 32) return;

    this.inputBuffer =
      this.inputBuffer.slice(0, this.cursorPos) +
      key.ch +
      this.inputBuffer.slice(this.cursorPos);
    this.cursorPos += key.ch.length;
    this.renderInput();
  }

  private scrollChat(delta: number): void {
    // 计算可见行数（减去边框2行）
    const visibleRows = (this.rows - 4) - 2;
    const allLines = this.buildChatLines();
    const maxOffset = Math.max(0, allLines.length - visibleRows);

    this.scrollOffset = Math.max(0, Math.min(maxOffset, this.scrollOffset + delta));
    this.renderMessages();
  }

  // ─── 弹窗按键 ─────────────────────────────────────

  private handleApprovalKey(name: string): void {
    if (!this.modalResolve) return;
    if (name === 'y') { this.closeModal(); this.modalResolve(true); }
    else if (name === 'n' || name === 'escape') { this.closeModal(); this.modalResolve(false); }
  }

  private handleSessionKey(name: string, ch: string): void {
    if (name === 'escape' || ch === 'q') { this.closeModal(); return; }
    if (ch >= '0' && ch <= '9') this.modalBuffer += ch;
    if (name === 'enter') {
      const sessions = Session.listSessions();
      const idx = parseInt(this.modalBuffer) - 1;
      if (idx >= 0 && idx < sessions.length) {
        const loaded = Session.load(sessions[idx].id);
        if (loaded) {
          this.session = loaded;
          this.messages = loaded.getMessages();
          this.scrollOffset = 0;
          this.renderAll();
        }
      }
      this.closeModal();
    }
  }

  private closeModal(): void {
    if (this.modalBox) { this.modalBox.destroy(); this.modalBox = null; }
    this.modal = null;
    this.modalBuffer = '';
    this.screen.render();
  }

  // ─── 消息/命令 ─────────────────────────────────────

  private async submitInput(input: string): Promise<void> {
    if (input.startsWith('/')) { this.handleCommand(input); return; }

    this.isLoading = true;
    this.addMessage('user_input', 'user', input);
    this.scrollOffset = 0; // 新消息自动滚到底
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
      case 'quit': case 'exit': this.cleanup(); process.exit(0); break;
      case 'clear': this.messages = []; this.scrollOffset = 0; break;
      case 'reset': this.orchestrator.resetAllAgents(); this.messages = []; this.scrollOffset = 0; break;
      case 'save': this.session.save(); this.addMessage('system', 'system', '会话已保存'); break;
      case 'sessions': this.showSessionPicker(); return;
      case 'help':
        this.addMessage('system', 'system', [
          '/quit, /exit  退出', '/clear  清屏', '/reset  重置',
          '/save  保存', '/sessions  历史会话', '/help  帮助',
          '', '↑↓ 滚动 | PageUp/Down 翻页 | ESC 取消 | Ctrl+C 退出',
        ].join('\n')); break;
      default: this.addMessage('system', 'system', `未知命令: ${cmd}`);
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

  // ─── Orchestrator ──────────────────────────────────

  private bindOrchestrator(): void {
    this.orchestrator.on('response', (text: string) => {
      this.addMessage('agent_message', 'orchestrator', text);
      this.isLoading = false;
      this.scrollOffset = 0;
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
    // 状态栏可以用 tags（内容固定，不会有用户输入）
    const tag = this.isLoading ? '{yellow-fg}⟳ 处理中{/yellow-fg}' : '{green-fg}就绪{/green-fg}';
    this.statusBar.setContent(
      ` {bold}OpenAgents{/bold} │ ${this.session.getName()} │ ${tag} │ ${this.messages.length}条 │ ↑↓滚动 │ /help`
    );
    this.screen.render();
  }

  /** 构建聊天区所有行（纯文本，无 blessed 标签） */
  private buildChatLines(): string[] {
    const lines: string[] = [];
    for (const msg of this.messages) {
      const t = msg.timestamp.toLocaleTimeString();
      let pre: string;
      switch (msg.type) {
        case 'user_input':   pre = '[You]'; break;
        case 'agent_message': pre = '[Agent]'; break;
        case 'system':       pre = '[!]'; break;
        default:             pre = `[${msg.from}]`;
      }
      // 纯文本，不用任何 blessed 标签
      lines.push(`${pre} ${t}`);
      for (const l of msg.content.split('\n')) lines.push(`  ${l}`);
      lines.push('');
    }
    return lines;
  }

  private renderMessages(): void {
    const allLines = this.buildChatLines();
    const visibleRows = (this.rows - 4) - 2; // 减去边框上下各1行
    const maxOffset = Math.max(0, allLines.length - visibleRows);

    // scrollOffset=0 表示最新消息在底部
    const start = Math.max(0, allLines.length - visibleRows - this.scrollOffset);
    const end = start + visibleRows;
    const visible = allLines.slice(start, end);

    this.chatBox.setContent(visible.join('\n'));
    this.screen.render();
  }

  private renderAgents(): void {
    const lines: string[] = [];
    for (const a of this.agents) {
      let icon: string;
      switch (a.status) {
        case 'idle':     icon = '○'; break;
        case 'working':  icon = '●'; break;
        case 'thinking': icon = '◐'; break;
        case 'error':    icon = '✗'; break;
        default:         icon = '?';
      }
      const name = (a.name || a.type).slice(0, 10);
      const tk = a.tokenUsage > 0 ? ` ${a.tokenUsage}tk` : '';
      lines.push(`${icon} ${name}${tk}`);
      if (a.currentTask) {
        lines.push(`  ${a.currentTask.description.slice(0, 14)}`);
      }
    }
    if (lines.length === 0) lines.push('等待启动...');
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
      const content = [
        '',
        `  工具: ${tool}`,
        `  命令: ${cmd}`,
        reason ? `  原因: ${reason}` : '',
        '',
        '  Y 执行 | N 拒绝',
      ].filter(Boolean).join('\n');

      this.modal = 'approval';
      this.modalResolve = resolve;
      this.modalBox = blessed.box({
        parent: this.screen, top: 'center', left: 'center',
        width: 50, height: reason ? 10 : 8,
        label: ' ⚠ 审批 ', border: { type: 'double' }, tags: false,
        style: { border: { fg: 'yellow' }, label: { fg: 'yellow' } },
        content,
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
      label: ' 历史会话 (编号选择, q取消) ', border: { type: 'line' }, tags: false,
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
