import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  sessionName: string;
  agentCount: number;
  messageCount: number;
}

export function Header({ sessionName, agentCount, messageCount }: HeaderProps) {
  return (
    <Box
      borderStyle="single"
      borderBottom={true}
      borderTop={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
    >
      <Text bold color="cyan">
        OpenAgents v1.0
      </Text>
      <Text color="gray"> ─────── </Text>
      <Text color="yellow">
        Session: {sessionName}
      </Text>
      <Text color="gray"> ─────── </Text>
      <Text color="green">
        Agents: {agentCount}
      </Text>
      <Text color="gray"> ─────── </Text>
      <Text color="magenta">
        Messages: {messageCount}
      </Text>
    </Box>
  );
}
