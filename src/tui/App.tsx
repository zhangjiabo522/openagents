import React, { useState, useEffect, useCallback } from 'react';
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

  // 初始化
  useEffect(() => {
    const llm = new LLMClient(config.providers);
    const orch = new Orchestrator(config, llm);
    const sess = new Session(sessionName);

    setOrchestrator(orch);
    setSession(sess);

    // 监听消息
    const unsubscribe = messageBus.subscribe((message) => {
      setMessages(prev => [...prev, message]);
      sess.addMessage(message);
    });

    // 监听 Agent 状态变化
    const updateAgents = () => {
      setAgents(orch.getState().agents);
    };

    orch.on('status_change', updateAgents);
    orch.on('task_complete', updateAgents);

    return () => {
      unsubscribe();
      orch.removeAllListeners();
    };
  }, [config, sessionName]);

  // 定期更新 Agent 状态
  useEffect(() => {
    if (!orchestrator) return;
    const timer = setInterval(() => {
      setAgents(orchestrator.getState().agents);
    }, 500);
    return () => clearInterval(timer);
  }, [orchestrator]);

  // 处理用户输入
  const handleInput = useCallback(async (input: string) => {
    if (!orchestrator || !session) return;

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
    setMessages(prev => [...prev, userMessage]);
    session.addMessage(userMessage);

    try {
      await orchestrator.processUserInput(input);
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        type: 'system',
        from: 'system',
        content: `错误: ${(error as Error).message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // 自动保存会话
      if (config.sessions.auto_save) {
        session.save();
      }
    }
  }, [orchestrator, session, config]);

  // 处理命令
  const handleCommand = useCallback((input: string) => {
    const cmd = input.slice(1).trim().split(' ')[0];
    const args = input.slice(1).trim().split(' ').slice(1).join(' ');

    switch (cmd) {
      case 'quit':
      case 'exit':
        session?.save();
        exit();
        break;
      case 'clear':
        setMessages([]);
        break;
      case 'reset':
        orchestrator?.resetAllAgents();
        setMessages([]);
        break;
      case 'save':
        session?.save();
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
        setMessages(prev => [...prev, helpMessage]);
        break;
      default:
        const unknownCmd: Message = {
          id: `msg-${Date.now()}`,
          type: 'system',
          from: 'system',
          content: `未知命令: ${cmd}。输入 /help 查看可用命令。`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, unknownCmd]);
    }
  }, [orchestrator, session, exit]);

  // 快捷键
  useInput((input: string, key: Record<string, boolean>) => {
    if (key.ctrl && input === 'c') {
      session?.save();
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
