import React, { memo } from 'react';
import { Box, Text } from 'ink';
import type { AgentState } from '../../agents/base-agent.js';

interface AgentStatusPanelProps {
  agents: AgentState[];
  active: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'idle': return '○';
    case 'working': return '●';
    case 'thinking': return '◐';
    case 'error': return '✗';
    case 'stopped': return '■';
    default: return '?';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'idle': return 'gray' as const;
    case 'working': return 'green' as const;
    case 'thinking': return 'yellow' as const;
    case 'error': return 'red' as const;
    case 'stopped': return 'gray' as const;
    default: return 'white' as const;
  }
};

export const AgentStatusPanel = memo(function AgentStatusPanel({ agents, active }: AgentStatusPanelProps) {
  const borderColor = active ? 'cyan' : 'gray';

  return (
    <Box
      flexDirection="column"
      width={30}
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      <Text bold color="cyan">
        Agents
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {agents.map((agent) => (
          <Box key={agent.id} flexDirection="column" marginBottom={1}>
            <Text>
              <Text color={getStatusColor(agent.status)}>
                {getStatusIcon(agent.status)}{' '}
              </Text>
              <Text bold>{agent.name}</Text>
            </Text>
            <Text color="gray" dimColor>
              {agent.type} | Token: {agent.tokenUsage}
            </Text>
            {agent.currentTask && (
              <Text color="yellow" dimColor>
                当前: {agent.currentTask.description.slice(0, 20)}...
              </Text>
            )}
          </Box>
        ))}
      </Box>

      {active && (
        <Box marginTop={1} borderStyle="single" borderTop paddingX={1}>
          <Text color="gray" dimColor>
            Tab 切换面板
          </Text>
        </Box>
      )}
    </Box>
  );
});
