import chalk from 'chalk';
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
  private orchestrator: Orchestrator;
  private session: Session;
  private messages: Message[] = [];
  private agents: AgentState[] = [];
  private isLoading = false;
  private inputBuffer = '';
  private cursorPos = 0;
  private scrollOffset = 0;

  private agentPanelWidth = 20;
  private lastRender = '';

  // 弹窗状态
  private modal: 'approval' | 'session' | null = null;
  private modalResolve?: (value: boolean) => void;
  private modalData: any = null;

  constructor(options: ScreenOptions) {
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

    this.initTerminal();
    this.bindKeys();
    this.bindOrchestrator();
    this.render();
  }

  // ─── 终端初始化 ─────────────────────────────────────

  private initTerminal(): void {
    // 进入备用屏幕缓冲区（退出时自动恢复，不污染主终端）
    process.stdout.write('\x1b[?1049h');
    // 隐藏光标
    process.stdout.write('\x1b[?25l');

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    process.stdout.on('resize', () => this.render());
  }

  private restoreTerminal(): void {
    process.stdout.write('\x1b[?25h'); // 显示光标
    process.stdout.write('\x1b[?1049l'); // 恢复主屏幕
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }

  private get cols(): number { return process.stdout.columns || 120; }
  private get rows(): number { return process.stdout.rows || 30; }

  // ─── 按键 ───────────────────────────────────────────

  private bindKeys(): void {
    process.stdin.on('data', (data: string) => {
      this.onKey(data);
    });

    setInterval(() => {
      const fresh = this.orchestrator.getState().agents;
      if (JSON.stringify(fresh) !== JSON.stringify(this.agents)) {
        this.agents = fresh;
        this.render();
      }
    }, 2000);
  }

  private onKey(data: string): void {
    // Ctrl+C
    if (data === '\x03') {
      this.restoreTerminal();
      process.exit(0);
    }

    // 弹窗模式
    if (this.modal === 'approval') { this.onApprovalKey(data); return; }
    if (this.modal === 'session') { this.onSessionKey(data); return; }

    // ESC
    if (data === '\x1b') {
      if (this.isLoading) {
        this.orchestrator.abort();
        this.isLoading = false;
        this.addMsg('system', 'system', '已取消');
        this.render();
      }
      return;
    }

    // 滚动
    if (data === '\x1b[A') { this.scroll(-1); return; }   // ↑
    if (data === '\x1b[B') { this.scroll(1); return; }    // ↓
    if (data === '\x1b[5~') { this.scroll(-10); return; } // PageUp
    if (data === '\x1b[6~') { this.scroll(10); return; }  // PageDown

    // Enter
    if (data === '\r' || data === '\n') {
      if (this.inputBuffer.trim() && !this.isLoading) {
        const text = this.inputBuffer;
        this.inputBuffer = '';
        this.cursorPos = 0;
        this.submitInput(text);
      }
      return;
    }

    // Backspace
    if (data === '\x7f' || data === '\b') {
      if (this.cursorPos > 0) {
        this.inputBuffer =
          this.inputBuffer.slice(0, this.cursorPos - 1) +
          this.inputBuffer.slice(this.cursorPos);
        this.cursorPos--;
        this.render();
      }
      return;
    }

    // Tab
    if (data === '\t') return;

    // 跳过其他 ESC 序列
    if (data.startsWith('\x1b[')) return;
    if (data.charCodeAt(0) < 32) return;

    // 普通字符
    this.inputBuffer =
      this.inputBuffer.slice(0, this.cursorPos) +
      data +
      this.inputBuffer.slice(this.cursorPos);
    this.cursorPos += data.length;
    this.render();
  }

  private scroll(delta: number): void {
    const maxOffset = Math.max(0, this.messages.length - 5);
    this.scrollOffset = Math.max(0, Math.min(maxOffset, this.scrollOffset - delta));
    this.render();
  }

  // ─── 弹窗按键 ─────────────────────────────────────

  private onApprovalKey(data: string): void {
    if (data === 'y' || data === 'Y') {
      this.closeModal();
      this.modalResolve?.(true);
    } else if (data === 'n' || data === 'N' || data === '\x1b') {
      this.closeModal();
      this.modalResolve?.(false);
    }
  }

  private onSessionKey(data: string): void {
    if (data === 'q' || data === '\x1b') { this.closeModal(); return; }
    if (data >= '0' && data <= '9') {
      this.modalData.buffer = (this.modalData.buffer || '') + data;
      this.render();
      return;
    }
    if (data === '\r' || data === '\n') {
      const sessions = Session.listSessions();
      const idx = parseInt(this.modalData.buffer || '0') - 1;
      if (idx >= 0 && idx < sessions.length) {
        const loaded = Session.load(sessions[idx].id);
        if (loaded) {
          this.session = loaded;
          this.messages = loaded.getMessages();
          this.scrollOffset = 0;
        }
      }
      this.closeModal();
      this.render();
    }
  }

  private closeModal(): void {
    this.modal = null;
    this.modalData = null;
    this.modalResolve = undefined;
  }

  // ─── 消息处理 ─────────────────────────────────────

  private async submitInput(input: string): Promise<void> {
    if (input.startsWith('/')) { this.handleCommand(input); return; }

    this.isLoading = true;
    this.addMsg('user_input', 'user', input);
    this.scrollOffset = 0;
    this.render();

    try {
      await this.orchestrator.processUserInput(input);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        this.addMsg('system', 'system', `错误: ${(error as Error).message}`);
      }
      this.isLoading = false;
    }

    this.session.save();
    this.render();
  }

  private handleCommand(input: string): void {
    const cmd = input.slice(1).trim().split(' ')[0];
    switch (cmd) {
      case 'quit': case 'exit':
        this.restoreTerminal(); process.exit(0); break;
      case 'clear':
        this.messages = []; this.scrollOffset = 0; break;
      case 'reset':
        this.orchestrator.resetAllAgents(); this.messages = []; this.scrollOffset = 0; break;
      case 'save':
        this.session.save();
        this.addMsg('system', 'system', '会话已保存'); break;
      case 'sessions':
        this.modal = 'session';
        this.modalData = { buffer: '' };
        this.render(); return;
      case 'help':
        this.addMsg('system', 'system', [
          '/quit, /exit  退出', '/clear  清屏', '/reset  重置',
          '/save  保存', '/sessions  历史会话', '/help  帮助',
          '', '↑↓ 滚动 | PageUp/Down 翻页 | ESC 取消 | Ctrl+C 退出',
        ].join('\n')); break;
      default: this.addMsg('system', 'system', `未知命令: ${cmd}`);
    }
    this.inputBuffer = '';
    this.cursorPos = 0;
    this.render();
  }

  private addMsg(type: string, from: string, content: string): void {
    this.messages.push({
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: type as Message['type'],
      from, content, timestamp: new Date(),
    });
    this.session.addMessage(this.messages[this.messages.length - 1]);
  }

  // ─── Orchestrator ──────────────────────────────────

  private bindOrchestrator(): void {
    this.orchestrator.on('response', (text: string) => {
      this.addMsg('agent_message', 'orchestrator', text);
      this.isLoading = false;
      this.scrollOffset = 0;
      this.render();
    });

    this.orchestrator.on('error', (err: Error) => {
      this.addMsg('system', 'system', `错误: ${err.message}`);
      this.isLoading = false;
      this.render();
    });

    this.orchestrator.on('status_change', () => {
      this.agents = this.orchestrator.getState().agents;
      this.render();
    });
  }

  // ─── 渲染（ANSI 全量刷新，无闪烁）──────────────

  private render(): void {
    const w = this.cols;
    const h = this.rows;
    const agW = this.agentPanelWidth;
    const chatW = w - agW;

    const lines: string[] = [];

    // ── 第0行：状态栏 ──
    const statusTag = this.isLoading
      ? chalk.yellow('⟳ 处理中')
      : chalk.green('就绪');
    const statusText = ` ${chalk.bold('OpenAgents')} │ ${this.session.getName()} │ ${statusTag} │ ${this.messages.length}条 │ ↑↓滚动 │ /help`;
    lines.push(chalk.bgBlue.white(this.padLine(statusText, w)));

    // ── 第1~h-4行：聊天 + Agent 面板 ──
    const chatAreaH = h - 4;
    const chatLines = this.buildChatLines(chatW - 2);
    const agentLines = this.buildAgentLines(agW - 2);

    // 计算聊天区可见范围
    const totalChatLines = chatLines.length;
    const visibleChatStart = Math.max(0, totalChatLines - chatAreaH + this.scrollOffset);
    const visibleChat = chatLines.slice(visibleChatStart, visibleChatStart + chatAreaH);

    // 顶部边框
    lines.push(
      chalk.cyan('┌' + '─'.repeat(chatW - 2) + '┐') +
      chalk.gray('┌' + '─'.repeat(agW - 2) + '┐')
    );

    // 内容行
    for (let i = 0; i < chatAreaH - 2; i++) {
      const chatLine = visibleChat[i] || '';
      const agentLine = agentLines[i] || '';
      lines.push(
        chalk.cyan('│') + this.padLine(chatLine, chatW - 2) + chalk.cyan('│') +
        chalk.gray('│') + this.padLine(agentLine, agW - 2) + chalk.gray('│')
      );
    }

    // 底部边框
    lines.push(
      chalk.cyan('└' + '─'.repeat(chatW - 2) + '┘') +
      chalk.gray('└' + '─'.repeat(agW - 2) + '┘')
    );

    // ── 最后3行：输入框 ──
    const inputW = w - 2;
    const inputLabel = this.isLoading ? chalk.yellow('⟳ ') : chalk.green('> ');
    const cursor = chalk.inverse(' ');
    const inputContent = inputLabel + this.inputBuffer + cursor;
    const padding = ' '.repeat(Math.max(0, inputW - this.visibleLength(inputContent) - 1));

    lines.push(chalk.cyan('┌' + '─'.repeat(inputW) + '┐'));
    lines.push(chalk.cyan('│') + ' ' + inputContent + padding + chalk.cyan('│'));
    lines.push(chalk.cyan('└' + '─'.repeat(inputW) + '┘'));

    // 弹窗覆盖
    if (this.modal === 'approval') {
      this.overlayApproval(lines, w, h);
    } else if (this.modal === 'session') {
      this.overlaySession(lines, w, h);
    }

    // 填满屏幕高度
    while (lines.length < h) lines.push(' '.repeat(w));

    // 写入终端（光标回到左上角，逐行覆写，不 clear → 不闪烁）
    let output = '\x1b[H'; // 光标归位
    for (const line of lines.slice(0, h)) {
      output += line + '\x1b[K\n'; // \x1b[K 清除该行剩余
    }

    // 只在内容变化时写入，减少不必要的 IO
    if (output !== this.lastRender) {
      process.stdout.write(output);
      this.lastRender = output;
    }
  }

  /** 聊天区内容行（纯文本+chalk颜色） */
  private buildChatLines(maxWidth: number): string[] {
    const lines: string[] = [];
    for (const msg of this.messages) {
      const t = msg.timestamp.toLocaleTimeString();
      let pre: string;
      switch (msg.type) {
        case 'user_input':   pre = chalk.green.bold('[You]'); break;
        case 'agent_message': pre = chalk.yellow.bold('[Agent]'); break;
        case 'system':       pre = chalk.magenta.bold('[!]'); break;
        default:             pre = chalk.white(`[${msg.from}]`);
      }
      lines.push(`${pre} ${chalk.gray(t)}`);
      for (const l of msg.content.split('\n')) {
        // 长行自动换行
        if (this.visibleLength(l) > maxWidth - 2) {
          lines.push('  ' + this.wrapText(l, maxWidth - 2));
        } else {
          lines.push('  ' + l);
        }
      }
      lines.push('');
    }
    return lines;
  }

  /** Agent 面板内容行 */
  private buildAgentLines(maxWidth: number): string[] {
    const lines: string[] = [];
    for (const a of this.agents) {
      let icon: string;
      switch (a.status) {
        case 'idle':     icon = chalk.gray('○'); break;
        case 'working':  icon = chalk.green('●'); break;
        case 'thinking': icon = chalk.yellow('◐'); break;
        case 'error':    icon = chalk.red('✗'); break;
        default:         icon = '?';
      }
      const name = (a.name || a.type).slice(0, 10);
      const tk = a.tokenUsage > 0 ? chalk.gray(` ${a.tokenUsage}tk`) : '';
      lines.push(`${icon} ${name}${tk}`);
      if (a.currentTask) {
        const desc = a.currentTask.description.slice(0, maxWidth - 4);
        lines.push(chalk.yellow(`  ${desc}`));
      }
    }
    if (lines.length === 0) lines.push(chalk.gray('等待启动...'));
    return lines;
  }

  // ─── 弹窗渲染 ─────────────────────────────────────

  private overlayApproval(lines: string[], w: number, h: number): void {
    const cmd = this.modalData?.command || '';
    const reason = this.modalData?.reason || '';
    const boxW = 48;
    const boxH = reason ? 9 : 7;
    const startRow = Math.floor((h - boxH) / 2);
    const startCol = Math.floor((w - boxW) / 2);

    const boxLines = [
      chalk.yellow('┌' + '─'.repeat(boxW - 2) + '┐'),
      chalk.yellow('│') + this.padLine(chalk.yellow.bold(' ⚠ 需要审批 '), boxW - 2) + chalk.yellow('│'),
      chalk.yellow('│') + this.padLine(`  工具: ${this.modalData?.tool || ''}`, boxW - 2) + chalk.yellow('│'),
      chalk.yellow('│') + this.padLine(`  命令: ${chalk.red(cmd)}`, boxW - 2) + chalk.yellow('│'),
    ];
    if (reason) boxLines.push(chalk.yellow('│') + this.padLine(`  原因: ${reason}`, boxW - 2) + chalk.yellow('│'));
    boxLines.push(chalk.yellow('│') + ' '.repeat(boxW - 2) + chalk.yellow('│'));
    boxLines.push(chalk.yellow('│') + this.padLine('  Y 执行 | N 拒绝', boxW - 2) + chalk.yellow('│'));
    boxLines.push(chalk.yellow('└' + '─'.repeat(boxW - 2) + '┘'));

    for (let i = 0; i < boxLines.length; i++) {
      const row = startRow + i;
      if (row >= 1 && row < lines.length - 3) {
        // 在已有行上覆盖弹窗
        lines[row] = this.overlayString(lines[row], boxLines[i], startCol);
      }
    }
  }

  private overlaySession(lines: string[], w: number, h: number): void {
    const sessions = Session.listSessions();
    const boxW = 50;
    const boxH = sessions.length + 6;
    const startRow = Math.floor((h - boxH) / 2);
    const startCol = Math.floor((w - boxW) / 2);

    const boxLines = [
      chalk.cyan('┌' + '─'.repeat(boxW - 2) + '┐'),
      chalk.cyan('│') + this.padLine(chalk.bold(' 历史会话 (输入编号, q取消) '), boxW - 2) + chalk.cyan('│'),
    ];
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const d = new Date(s.updatedAt).toLocaleString();
      const entry = `  ${i + 1}. ${s.name} (${s.messages.length}条)`;
      boxLines.push(chalk.cyan('│') + this.padLine(entry, boxW - 2) + chalk.cyan('│'));
    }
    boxLines.push(chalk.cyan('│') + ' '.repeat(boxW - 2) + chalk.cyan('│'));
    const buffer = this.modalData?.buffer || '';
    boxLines.push(chalk.cyan('│') + this.padLine(`  输入: ${buffer}_`, boxW - 2) + chalk.cyan('│'));
    boxLines.push(chalk.cyan('└' + '─'.repeat(boxW - 2) + '┘'));

    for (let i = 0; i < boxLines.length; i++) {
      const row = startRow + i;
      if (row >= 1 && row < lines.length - 3) {
        lines[row] = this.overlayString(lines[row], boxLines[i], startCol);
      }
    }
  }

  // ─── 工具函数 ─────────────────────────────────────

  /** 填充行到指定宽度 */
  private padLine(text: string, width: number): string {
    const vl = this.visibleLength(text);
    if (vl >= width) return text.slice(0, width);
    return text + ' '.repeat(width - vl);
  }

  /** 计算 chalk 格式化后的可见长度 */
  private visibleLength(text: string): number {
    // 移除 ANSI 转义序列后计算长度
    return text.replace(/\x1b\[[0-9;]*m/g, '').length;
  }

  /** 简单换行 */
  private wrapText(text: string, maxWidth: number): string {
    if (this.visibleLength(text) <= maxWidth) return text;
    return text.slice(0, maxWidth) + '…';
  }

  /** 在原始行的指定位置覆盖弹窗行 */
  private overlayString(base: string, overlay: string, col: number): string {
    const baseVisible = this.visibleLength(base);
    const overlayVisible = this.visibleLength(overlay);

    // 简化：直接返回 overlay 行（覆盖整行）
    return overlay;
  }

  private showApproval(tool: string, params: Record<string, string>): Promise<boolean> {
    return new Promise((resolve) => {
      this.modal = 'approval';
      this.modalResolve = resolve;
      this.modalData = { tool, command: params.command || '', reason: params.reason || '' };
      this.render();
    });
  }

}
