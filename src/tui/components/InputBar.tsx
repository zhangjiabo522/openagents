import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface InputBarProps {
  onSubmit: (input: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

export function InputBar({ onSubmit, isLoading, disabled }: InputBarProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (input: string) => {
    if (input.trim()) {
      onSubmit(input);
      setValue('');
    }
  };

  return (
    <Box
      borderStyle="single"
      borderTop={true}
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
    >
      <Text color="cyan" bold>
        {isLoading ? '⟳ ' : '> '}
      </Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder={isLoading ? 'Agent 正在处理...' : '输入消息或命令...'}
        focus={!disabled}
      />
    </Box>
  );
}
