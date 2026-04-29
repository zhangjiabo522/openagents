import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useApp, useInput, useStdin } from 'ink';
import { Header } from './components/Header.js';
import { ChatPanel } from './components/ChatPanel.js';
import { AgentStatusPanel } from './components/AgentStatus.js';
import { InputBar } from './components/InputBar.js';
import { ApprovalDialog } from './components/ApprovalDialog.js';
import { SessionPicker } from './components/SessionPicker.js';
import type { AppConfig } from '../config/schema.js';
import type { Message } from '../core/message-bus.js';
import type { AgentState } from '../agents/base-agent.js';
import { Orchestrator } from '../core/orchestrator.js';
import { Session } from '../core/session.js';
import { LLMClient } from '../llm/client.js';

interface AppProps {
  config: AppConfig;
  sessionName?: string;
  resumeSessionId?: string;
}

export function App({ config, sessionName, resumeSessionId }: AppProps) {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<'chat' | 'agents'>('chat');
  const [showApproval, setShowApproval] = useState(false);
  const [approvalInfo, setApprovalInfo] = useState<{
    tool: string;
    params: Record<string, string>;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);

  const orchestratorRef = useRef<Orchestrator | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const lastMessageCountRef = useRef(0);

  // 初始化
  useEffect(() => {
    const llm = new LLMClient(config.providers);
    const orch = new Orchestrator(config, llm);

    // 设置命令审批回调
    orch.setApproveCallback((tool, params) => {
      return new Promise<boolean>((resolve) => {
        setApprovalInfo({ tool, params, resolve });
        setShowApproval(true);
      });
    });

    // 加载或创建会话
    let sess: Session;
    if (resumeSessionId) {
      const loaded = Session.load(resumeSessionId);
      if (loaded) {
        sess = loaded;
        // 恢复历史消息
        messagesRef.current = loaded.getMessages();
        setMessages([...messagesRef.current]);
      } else {
        sess = new Session(sessionName);
      }
    } else {
      sess = new Session(sessionName);
    }

    orchestratorRef.current = orch;
    sessionRef.current = sess;

    // 监听 orchestrator 响应
    orch.on('response', (response: string) => {
      const msg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'agent_message',
        from: 'orchestrator',
        content: response,
        timestamp: new Date(),
      };
      messagesRef.current = [...messagesRef.current, msg];
      setMessages([...messagesRef.current]);
      setIsLoading(false);
      sess.addMessage(msg);
    });

    orch.on('error', (error: Error) => {
      const msg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'system',
        from: 'system',
        content: `错误: ${error.message}`,
        timestamp: new Date(),
      };
      messagesRef.current = [...messagesRef.current, msg];
      setMessages([...messagesRef.current]);
      setIsLoading(false);
    });

    orch.on('status_change', () => {
      setAgents([...orch.getState().agents]);
    });

    // 定时刷新 agent 状态（低频）
    const timer = setInterval(() => {
      if (orch) {
        const newAgents = orch.getState().agents;
        setAgents(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newAgents)) {
            return [...newAgents];
          }
          return prev;
        });
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      orch.removeAllListeners();
    };
  }, [config, sessionName, resumeSessionId]);

  // 处理用户输入
  const handleInput = useCallback(async (input: string) => {
    if (!orchestratorRef.current || !sessionRef.current) return;
    if (input.trim() === '') return;
    if (isLoading) return; // 防止重复发送

    if (input.startsWith('/')) {
      handleCommand(input);
      return;
    }

    setIsLoading(true);

    // 添加用户消息
    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'user_input',
      from: 'user',
      content: input,
      timestamp: new Date(),
    };
    messagesRef.current = [...messagesRef.current, userMessage];
    setMessages([...messagesRef.current]);
    sessionRef.current.addMessage(userMessage);

    try {
      await orchestratorRef.current.processUserInput(input);
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'system',
        from: 'system',
        content: `错误: ${(error as Error).message}`,
        timestamp: new Date(),
      };
      messagesRef.current = [...messagesRef.current, errorMessage];
      setMessages([...messagesRef.current]);
      setIsLoading(false);
    }

    if (config.sessions.auto_save) {
      sessionRef.current.save();
    }
  }, [isLoading, config]);

  // 处理命令
  const handleCommand = useCallback((input: string) => {
    const cmd = input.slice(1).trim().split(' ')[0];

    switch (cmd) {
      case 'quit':
      case 'exit':
        sessionRef.current?.save();
        exit();
        break;
      case 'clear':
        messagesRef.current = [];
        setMessages([]);
        break;
      case 'reset':
        orchestratorRef.current?.resetAllAgents();
        messagesRef.current = [];
        setMessages([]);
        break;
      case 'save':
        sessionRef.current?.save();
        addSystemMessage('会话已保存');
        break;
      case 'agents':
        setActivePanel(prev => prev === 'agents' ? 'chat' : 'agents');
        break;
      case 'sessions':
        setShowSessionPicker(true);
        break;
      case 'help':
        addSystemMessage(`可用命令:
/quit, /exit    - 退出程序
/clear          - 清屏
/reset          - 重置所有 Agent
/save           - 保存会话
/agents         - 切换 Agent 面板
/sessions       - 选择历史会话
/help           - 显示帮助信息`);
        break;
      default:
        addSystemMessage(`未知命令: ${cmd}。输入 /help 查看可用命令。`);
    }
  }, [exit]);

  const addSystemMessage = (content: string) => {
    const msg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'system',
      from: 'system',
      content,
      timestamp: new Date(),
    };
    messagesRef.current = [...messagesRef.current, msg];
    setMessages([...messagesRef.current]);
  };

  // 审批回调
  const handleApproval = (approved: boolean) => {
    if (approvalInfo) {
      approvalInfo.resolve(approved);
      setShowApproval(false);
      setApprovalInfo(null);
    }
  };

  // 会话选择回调
  const handleSessionSelect = (sessionId: string) => {
    setShowSessionPicker(false);
    const loaded = Session.load(sessionId);
    if (loaded) {
      sessionRef.current = loaded;
      messagesRef.current = loaded.getMessages();
      setMessages([...messagesRef.current]);
      addSystemMessage(`已切换到会话: ${loaded.getName()}`);
    }
  };

  // 快捷键
  useInput((input: string, key: Record<string, boolean>) => {
    if (showApproval || showSessionPicker) return; // 弹窗时禁用快捷键

    if (key.ctrl && input === 'c') {
      sessionRef.current?.save();
      exit();
    }
    if (key.tab) {
      setActivePanel(prev => prev === 'agents' ? 'chat' : 'agents');
    }
  });

  // 如果显示会话选择器
  if (showSessionPicker) {
    return (
      <SessionPicker
        onSelect={handleSessionSelect}
        onCancel={() => setShowSessionPicker(false)}
      />
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Header
        sessionName={sessionRef.current?.getName() || '未命名'}
        agentCount={agents.length}
        messageCount={messages.length}
      />

      <Box flexDirection="row" flexGrow={1}>
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          active={activePanel === 'chat'}
        />
        <AgentStatusPanel
          agents={agents}
          active={activePanel === 'agents'}
        />
      </Box>

      {showApproval && approvalInfo && (
        <ApprovalDialog
          tool={approvalInfo.tool}
          params={approvalInfo.params}
          onApprove={() => handleApproval(true)}
          onDeny={() => handleApproval(false)}
        />
      )}

      <InputBar
        onSubmit={handleInput}
        isLoading={isLoading}
        disabled={showApproval}
      />
    </Box>
  );
}
