import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { Message } from '../../core/message-bus.js';

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  active: boolean;
}

export function ChatPanel({ messages, isLoading, active }: ChatPanelProps) {
  const borderColor = active ? 'cyan' : 'gray';

  const formatMessage = (msg: Message) => {
    switch (msg.type) {
      case 'user_input':
        return { prefix: 'You', color: 'green' };
      case 'agent_message':
        return { prefix: msg.from, color: 'yellow' };
      case 'task_completed':
        return { prefix: msg.from, color: 'blue' };
      case 'task_failed':
        return { prefix: msg.from, color: 'red' };
      case 'agent_status':
        return { prefix: msg.from, color: 'gray' };
      case 'system':
        return { prefix: 'System', color: 'magenta' };
      default:
        return { prefix: msg.from, color: 'white' };
    }
  };

  return (
    <Box
      flexDirection="column"
      flexGrow={2}
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      overflow="hidden"
    >
      <Text bold color="cyan">
        Chat
      </Text>

      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {messages.length === 0 ? (
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              输入消息开始对话...
            </Text>
          </Box>
        ) : (
          messages.slice(-20).map((msg) => {
            const { prefix, color } = formatMessage(msg);
            return (
              <Box key={msg.id} flexDirection="column" marginBottom={1}>
                <Text>
                  <Text color={color} bold>
                    [{prefix}]
                  </Text>
                  <Text color="gray"> {msg.timestamp.toLocaleTimeString()}</Text>
                </Text>
                <Text wrap="wrap">{msg.content}</Text>
              </Box>
            );
          })
        )}

        {isLoading && (
          <Box>
            <Text color="yellow">
              <Spinner type="dots" /> Agent 正在处理...
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
