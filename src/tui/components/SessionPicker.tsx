import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Session, type SessionData } from '../../core/session.js';

interface SessionPickerProps {
  onSelect: (sessionId: string) => void;
  onCancel: () => void;
}

export function SessionPicker({ onSelect, onCancel }: SessionPickerProps) {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const list = Session.listSessions();
    setSessions(list);
  }, []);

  useInput((input: string, key: Record<string, boolean>) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(sessions.length - 1, prev + 1));
    } else if (key.return) {
      if (sessions[selectedIndex]) {
        onSelect(sessions[selectedIndex].id);
      }
    } else if (key.escape || input === 'q') {
      onCancel();
    } else if (input === 'd') {
      // 删除选中的会话
      if (sessions[selectedIndex]) {
        Session.deleteSession(sessions[selectedIndex].id);
        const newList = Session.listSessions();
        setSessions(newList);
        setSelectedIndex(prev => Math.min(prev, newList.length - 1));
      }
    }
  });

  if (sessions.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">历史会话</Text>
        <Box marginTop={1}>
          <Text color="gray">没有保存的会话。按 Esc 返回。</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">历史会话</Text>
      <Text color="gray" dimColor>
        ↑↓ 选择 | Enter 打开 | d 删除 | Esc 返回
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {sessions.map((session, index) => {
          const isSelected = index === selectedIndex;
          const date = new Date(session.updatedAt).toLocaleString();
          const msgCount = session.messages.length;

          return (
            <Box key={session.id}>
              <Text color={isSelected ? 'cyan' : 'white'}>
                {isSelected ? '▶ ' : '  '}
                {session.name}
              </Text>
              <Text color="gray" dimColor>
                {' '}({msgCount} 条消息, {date})
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
