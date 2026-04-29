import React, { memo } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { Message } from '../../core/message-bus.js';

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  active: boolean;
}

const formatMessage = (msg: Message) => {
  switch (msg.type) {
    case 'user_input':
      return { prefix: 'You', color: 'green' as const };
    case 'agent_message':
      return { prefix: 'Agent', color: 'yellow' as const };
    case 'task_completed':
      return { prefix: msg.from, color: 'blue' as const };
    case 'task_failed':
      return { prefix: msg.from, color: 'red' as const };
    case 'agent_status':
      return { prefix: msg.from, color: 'gray' as const };
    case 'system':
      return { prefix: 'System', color: 'magenta' as const };
    default:
      return { prefix: msg.from, color: 'white' as const };
  }
};

export const ChatPanel = memo(function ChatPanel({ messages, isLoading, active }: ChatPanelProps) {
  const borderColor = active ? 'cyan' : 'gray';

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
              输入消息开始对话...{'\n'}
              简单问题会直接回答，复杂任务会分解给多个 Agent 协作。
            </Text>
          </Box>
        ) : (
          messages.slice(-30).map((msg) => {
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
});
