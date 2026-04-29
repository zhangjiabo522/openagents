import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { ChatPanel } from './components/ChatPanel.js';
import { AgentStatusPanel } from './components/AgentStatus.js';
import { InputBar } from './components/InputBar.js';
import type { AppConfig } from '../config/schema.js';
import type { Message } from '../core/message-bus.js';
import type { AgentState } from '../agents/base-agent.js';
import { Orchestrator } from '../core/orchestrator.js';
import { Session } from '../core/session.js';
import { LLMClient } from '../llm/client.js';
import { messageBus } from '../core/message-bus.js';

interface AppProps {
  config: AppConfig;
  sessionName?: string;
}

export function App({ config, sessionName }: AppProps) {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orchestrator, setOrchestrator] = useState<Orchestrator | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activePanel, setActivePanel] = useState<'chat' | 'agents'>('chat');

  // 使用 ref 避免不必要的重渲染
  const orchestratorRef = useRef<Orchestrator | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const messagesRef = useRef<Message[]>([]);

  // 初始化
  useEffect(() => {
    const llm = new LLMClient(config.providers);
    const orch = new Orchestrator(config, llm);
    const sess = new Session(sessionName);

    orchestratorRef.current = orch;
    sessionRef.current = sess;
    setOrchestrator(orch);
    setSession(sess);

    // 监听消息 - 使用批量更新减少重渲染
    const unsubscribe = messageBus.subscribe((message) => {
      messagesRef.current = [...messagesRef.current, message];
      sess.addMessage(message);
    });

    // 监听 orchestrator 响应
    orch.on('response', (response: string) => {
      const responseMessage: Message = {
        id: `msg-${Date.now()}`,
        type: 'agent_message',
        from: 'orchestrator',
        content: response,
        timestamp: new Date(),
      };
      messagesRef.current = [...messagesRef.current, responseMessage];
      setMessages([...messagesRef.current]);
      setIsLoading(false);
    });

    orch.on('error', (error: Error) => {
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        type: 'system',
        from: 'system',
        content: `错误: ${error.message}`,
        timestamp: new Date(),
      };
      messagesRef.current = [...messagesRef.current, errorMessage];
      setMessages([...messagesRef.current]);
      setIsLoading(false);
    });

    orch.on('status_change', () => {
      setAgents(orch.getState().agents);
    });

    return () => {
      unsubscribe();
      orch.removeAllListeners();
    };
  }, [config, sessionName]);

  // 定时刷新消息（降低频率避免闪烁）
  useEffect(() => {
    const timer = setInterval(() => {
      if (messagesRef.current.length !== messages.length) {
        setMessages([...messagesRef.current]);
      }
      if (orchestratorRef.current) {
        const newAgents = orchestratorRef.current.getState().agents;
        // 只在状态真正变化时更新
        if (JSON.stringify(newAgents) !== JSON.stringify(agents)) {
          setAgents(newAgents);
        }
      }
    }, 500); // 500ms 刷新一次，而不是实时刷新
    return () => clearInterval(timer);
  }, [messages.length, agents]);

  // 处理用户输入
  const handleInput = useCallback(async (input: string) => {
    if (!orchestratorRef.current || !sessionRef.current) return;
    if (input.trim() === '') return;

    // 处理命令
    if (input.startsWith('/')) {
      handleCommand(input);
      return;
    }

    setIsLoading(true);

    // 添加用户消息
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user_input',
      from: 'user',
      content: input,
      timestamp: new Date(),
    };
    messagesRef.current = [...messagesRef.current, userMessage];
    setMessages([...messagesRef.current]);

    try {
      await orchestratorRef.current.processUserInput(input);
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        type: 'system',
        from: 'system',
        content: `错误: ${(error as Error).message}`,
        timestamp: new Date(),
      };
      messagesRef.current = [...messagesRef.current, errorMessage];
      setMessages([...messagesRef.current]);
    } finally {
      setIsLoading(false);
      if (config.sessions.auto_save) {
        sessionRef.current.save();
      }
    }
  }, [config]);

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
        break;
      case 'agents':
        setActivePanel(prev => prev === 'agents' ? 'chat' : 'agents');
        break;
      case 'help':
        const helpMessage: Message = {
          id: `msg-${Date.now()}`,
          type: 'system',
          from: 'system',
          content: `可用命令:
/quit, /exit    - 退出程序
/clear          - 清屏
/reset          - 重置所有 Agent
/save           - 保存会话
/agents         - 切换 Agent 面板
/help           - 显示帮助信息`,
          timestamp: new Date(),
        };
        messagesRef.current = [...messagesRef.current, helpMessage];
        setMessages([...messagesRef.current]);
        break;
      default:
        const unknownCmd: Message = {
          id: `msg-${Date.now()}`,
          type: 'system',
          from: 'system',
          content: `未知命令: ${cmd}。输入 /help 查看可用命令。`,
          timestamp: new Date(),
        };
        messagesRef.current = [...messagesRef.current, unknownCmd];
        setMessages([...messagesRef.current]);
    }
  }, [exit]);

  // 快捷键
  useInput((input: string, key: Record<string, boolean>) => {
    if (key.ctrl && input === 'c') {
      sessionRef.current?.save();
      exit();
    }
    if (key.tab) {
      setActivePanel(prev => prev === 'agents' ? 'chat' : 'agents');
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Header
        sessionName={session?.getName() || '未命名'}
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

      <InputBar
        onSubmit={handleInput}
        isLoading={isLoading}
        disabled={isLoading}
      />
    </Box>
  );
}
