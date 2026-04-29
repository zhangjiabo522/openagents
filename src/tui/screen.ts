import * as blessed from 'blessed';
import type { AppConfig } from '../config/schema.js';
import type { Message } from '../core/message-bus.js';
import type { AgentState, ApproveCallback } from '../agents/base-agent.js';
import { Orchestrator } from '../core/orchestrator.js';
import { Session } from '../core/session.js';
import { LLMClient } from '../llm/client.js';
import { isDangerousCommand } from '../tools/index.js';

interface ScreenOptions {
  config: AppConfig;
  sessionName?: string;
  resumeSessionId?: string;
}

export class Screen {
  private screen: blessed.Widgets.Screen;
  private chatBox!: blessed.Widgets.BoxElement;
  private agentBox!: blessed.Widgets.BoxElement;
  private inputBox!: blessed.Widgets.TextboxElement;
  private statusBar!: blessed.Widgets.BoxElement;
  private approvalBox?: blessed.Widgets.BoxElement;

  private orchestrator: Orchestrator;
  private session: Session;
  private messages: Message[] = [];
  private agents: AgentState[] = [];
  private isLoading = false;
  private approveResolve?: (value: boolean) => void;

  constructor(options: ScreenOptions) {
    // 创建主屏幕
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'OpenAgents v2.0',
      dockBorders: true,
    });

    // 初始化 Orchestrator
    const llm = new LLMClient(options.config.providers);
    this.orchestrator = new Orchestrator(options.config, llm);

    // 设置命令审批
    this.orchestrator.setApproveCallback((tool, params) => {
      return this.showApproval(tool, params);
    });

    // 加载会话
    if (options.resumeSessionId) {
      const loaded = Session.load(options.resumeSessionId);
      this.session = loaded || new Session(options.sessionName);
      if (loaded) {
        this.messages = loaded.getMessages();
      }
    } else {
      this.session = new Session(options.sessionName);
    }

    this.setupLayout();
    this.setupEvents();
    this.renderMessages();
    this.renderAgents();
  }

  private setupLayout(): void {
    // 顶部状态栏
    this.statusBar = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue',
      },
      content: ` {bold}OpenAgents v2.0{/bold} │ 会话: ${this.session.getName()} │ 按 {bold}Tab{/bold} 切换面板 │ {bold}Ctrl+C{/bold} 退出 │ {bold}/help{/bold} 帮助`,
    });

    // 聊天区域
    this.chatBox = blessed.box({
      parent: this.screen,
      top: 1,
      left: 0,
      width: '75%',
      height: '100%-4',
      label: ' {bold}Chat{/bold} ',
      border: { type: 'line' },
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        style: { bg: 'gray' },
      },
      style: {
        border: { fg: 'cyan' },
        label: { fg: 'cyan' },
      },
    });

    // Agent 状态面板
    this.agentBox = blessed.box({
      parent: this.screen,
      top: 1,
      left: '75%',
      width: '25%',
      height: '100%-4',
      label: ' {bold}Agents{/bold} ',
      border: { type: 'line' },
      tags: true,
      scrollable: true,
      style: {
        border: { fg: 'gray' },
        label: { fg: 'cyan' },
      },
    });

    // 底部输入框
    this.inputBox = blessed.textbox({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      label: ' {bold}Input{/bold} ',
      border: { type: 'line' },
      tags: true,
      style: {
        border: { fg: 'cyan' },
        label: { fg: 'cyan' },
      },
    });
  }

  private setupEvents(): void {
    // 监听 orchestrator 响应
    this.orchestrator.on('response', (response: string) => {
      this.addMessage({
        type: 'agent_message',
        from: 'orchestrator',
        content: response,
      });
      this.isLoading = false;
      this.updateStatus();
      this.renderMessages();
      this.renderAgents();
      this.focusInput();
    });

    this.orchestrator.on('error', (error: Error) => {
      this.addMessage({
        type: 'system',
        from: 'system',
        content: `错误: ${error.message}`,
      });
      this.isLoading = false;
      this.updateStatus();
      this.renderMessages();
      this.focusInput();
    });

    this.orchestrator.on('status_change', () => {
      this.agents = this.orchestrator.getState().agents;
      this.renderAgents();
    });

    // 快捷键
    this.screen.key(['C-c'], () => {
      this.session.save();
      process.exit(0);
    });

    this.screen.key(['tab'], () => {
      if (this.screen.focused === this.chatBox) {
        this.screen.focusGrabbed = false;
        this.agentBox.focus();
      } else {
        this.screen.focusGrabbed = false;
        this.chatBox.focus();
      }
    });

    // 输入处理
    this.inputBox.on('submit', (value: string) => {
      this.handleInput(value);
    });

    // 定时刷新 agent 状态
    setInterval(() => {
      if (this.orchestrator) {
        const newAgents = this.orchestrator.getState().agents;
        if (JSON.stringify(newAgents) !== JSON.stringify(this.agents)) {
          this.agents = newAgents;
          this.renderAgents();
        }
      }
    }, 2000);

    // 初始聚焦
    this.focusInput();
  }

  private async handleInput(input: string): void {
    this.inputBox.clearValue();
    this.screen.render();

    if (!input.trim()) {
      this.focusInput();
      return;
    }

    if (this.isLoading) {
      this.focusInput();
      return;
    }

    // 处理命令
    if (input.startsWith('/')) {
      this.handleCommand(input);
      this.focusInput();
      return;
    }

    this.isLoading = true;
    this.updateStatus();

    // 添加用户消息
    this.addMessage({
      type: 'user_input',
      from: 'user',
      content: input,
    });
    this.renderMessages();

    try {
      await this.orchestrator.processUserInput(input);
    } catch (error) {
      this.addMessage({
        type: 'system',
        from: 'system',
        content: `错误: ${(error as Error).message}`,
      });
      this.isLoading = false;
    }

    if (true /* auto_save */) {
      this.session.save();
    }

    this.updateStatus();
    this.renderMessages();
    this.focusInput();
  }

  private handleCommand(input: string): void {
    const cmd = input.slice(1).trim().split(' ')[0];

    switch (cmd) {
      case 'quit':
      case 'exit':
        this.session.save();
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
        this.addMessage({ type: 'system', from: 'system', content: '会话已保存' });
        this.renderMessages();
        break;
      case 'agents':
        this.agentBox.focus();
        break;
      case 'sessions':
        this.showSessionPicker();
        break;
      case 'help':
        this.addMessage({
          type: 'system',
          from: 'system',
          content: `可用命令:
/quit, /exit    - 退出程序
/clear          - 清屏
/reset          - 重置所有 Agent
/save           - 保存会话
/sessions       - 选择历史会话
/agents         - 聚焦 Agent 面板
/help           - 显示帮助信息`,
        });
        this.renderMessages();
        break;
      default:
        this.addMessage({
          type: 'system',
          from: 'system',
          content: `未知命令: ${cmd}。输入 /help 查看帮助。`,
        });
        this.renderMessages();
    }
  }

  private addMessage(msg: Omit<Message, 'id' | 'timestamp'>): void {
    const fullMsg: Message = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    };
    this.messages.push(fullMsg);
    this.session.addMessage(fullMsg);
  }

  private renderMessages(): void {
    const lines: string[] = [];

    for (const msg of this.messages.slice(-100)) {
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
          prefix = 'System';
          color = 'magenta';
          break;
        default:
          prefix = msg.from;
          color = 'white';
      }

      // 处理多行内容
      const contentLines = msg.content.split('\n');
      lines.push(`{${color}-fg}{bold}[${prefix}]{/bold}{/${color}-fg} {gray-fg}${time}{/gray-fg}`);
      for (const line of contentLines) {
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
      let statusIcon: string;
      let statusColor: string;

      switch (agent.status) {
        case 'idle':
          statusIcon = '○';
          statusColor = 'gray';
          break;
        case 'working':
          statusIcon = '●';
          statusColor = 'green';
          break;
        case 'thinking':
          statusIcon = '◐';
          statusColor = 'yellow';
          break;
        case 'error':
          statusIcon = '✗';
          statusColor = 'red';
          break;
        default:
          statusIcon = '?';
          statusColor = 'white';
      }

      lines.push(`{${statusColor}-fg}${statusIcon}{/${statusColor}-fg} {bold}${agent.name}{/bold}`);
      lines.push(`  {gray-fg}${agent.type} | Token: ${agent.tokenUsage}{/gray-fg}`);
      if (agent.currentTask) {
        lines.push(`  {yellow-fg}${agent.currentTask.description.slice(0, 25)}...{/yellow-fg}`);
      }
      lines.push('');
    }

    this.agentBox.setContent(lines.join('\n'));
    this.screen.render();
  }

  private updateStatus(): void {
    const status = this.isLoading ? '{yellow-fg}处理中...{/yellow-fg}' : '{green-fg}就绪{/green-fg}';
    this.statusBar.setContent(` {bold}OpenAgents v2.0{/bold} │ 会话: ${this.session.getName()} │ 状态: ${status} │ 消息: ${this.messages.length} │ {bold}Tab{/bold} 切换 │ {bold}Ctrl+C{/bold} 退出`);
    this.screen.render();
  }

  private focusInput(): void {
    this.inputBox.focus();
    this.screen.render();
  }

  private showApproval(tool: string, params: Record<string, string>): Promise<boolean> {
    return new Promise((resolve) => {
      this.approveResolve = resolve;

      const command = params.command || '';
      const reason = params.reason || '';

      this.approvalBox = blessed.box({
        parent: this.screen,
        top: 'center',
        left: 'center',
        width: '60%',
        height: 10,
        label: ' {bold}{yellow-fg}⚠️ 命令需要审批{/yellow-fg}{/bold} ',
        border: { type: 'double' },
        tags: true,
        style: {
          border: { fg: 'yellow' },
          label: { fg: 'yellow' },
        },
        content: [
          '',
          `  {bold}工具:{/bold} ${tool}`,
          `  {bold}命令:{/bold} {red-fg}${command}{/red-fg}`,
          reason ? `  {bold}原因:{/bold} ${reason}` : '',
          '',
          '  按 {bold}{green-fg}Y{/green-fg}{/bold} 执行 | 按 {bold}{red-fg}N{/red-fg}{/bold} 拒绝',
        ].filter(Boolean).join('\n'),
      });

      this.approvalBox.key(['y', 'Y'], () => {
        this.closeApproval();
        resolve(true);
      });

      this.approvalBox.key(['n', 'N', 'escape'], () => {
        this.closeApproval();
        resolve(false);
      });

      this.approvalBox.focus();
      this.screen.render();
    });
  }

  private closeApproval(): void {
    if (this.approvalBox) {
      this.approvalBox.destroy();
      this.approvalBox = undefined;
    }
    this.focusInput();
  }

  private showSessionPicker(): void {
    const sessions = Session.listSessions();

    if (sessions.length === 0) {
      this.addMessage({ type: 'system', from: 'system', content: '没有保存的会话' });
      this.renderMessages();
      return;
    }

    let selectedIndex = 0;

    const pickerBox = blessed.list({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '70%',
      height: Math.min(sessions.length + 5, 20),
      label: ' {bold}历史会话{/bold} ',
      border: { type: 'line' },
      tags: true,
      keys: true,
      vi: true,
      style: {
        border: { fg: 'cyan' },
        label: { fg: 'cyan' },
        selected: { bg: 'blue', fg: 'white' },
        item: { fg: 'white' },
      },
      items: sessions.map(s => {
        const date = new Date(s.updatedAt).toLocaleString();
        return `${s.name} (${s.messages.length} 条, ${date})`;
      }),
    });

    pickerBox.on('select', (_item, index) => {
      const session = sessions[index];
      if (session) {
        const loaded = Session.load(session.id);
        if (loaded) {
          this.session = loaded;
          this.messages = loaded.getMessages();
          this.renderMessages();
          this.updateStatus();
        }
      }
      pickerBox.destroy();
      this.focusInput();
    });

    pickerBox.key(['escape', 'q'], () => {
      pickerBox.destroy();
      this.focusInput();
    });

    pickerBox.focus();
    this.screen.render();
  }

  render(): void {
    this.screen.render();
  }

  destroy(): void {
    this.screen.destroy();
  }
}
