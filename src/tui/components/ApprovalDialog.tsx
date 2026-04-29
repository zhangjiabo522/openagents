import React from 'react';
import { Box, Text } from 'ink';

interface ApprovalDialogProps {
  tool: string;
  params: Record<string, string>;
  onApprove: () => void;
  onDeny: () => void;
}

export function ApprovalDialog({ tool, params, onApprove, onDeny }: ApprovalDialogProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      paddingX={1}
      marginBottom={1}
    >
      <Text bold color="yellow">
        ⚠️ 命令需要审批
      </Text>

      <Box marginTop={1}>
        <Text color="cyan">工具: </Text>
        <Text bold>{tool}</Text>
      </Box>

      {params.command && (
        <Box>
          <Text color="cyan">命令: </Text>
          <Text color="red">{params.command}</Text>
        </Box>
      )}

      {params.reason && (
        <Box>
          <Text color="cyan">原因: </Text>
          <Text>{params.reason}</Text>
        </Box>
      )}

      {params.path && (
        <Box>
          <Text color="cyan">路径: </Text>
          <Text>{params.path}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text>
          按 <Text color="green" bold>Y</Text> 执行 | 按 <Text color="red" bold>N</Text> 拒绝
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          提示: 使用键盘输入 y 或 n
        </Text>
      </Box>

      {/* 内联键盘监听 */}
      <ApprovalKeyListener onApprove={onApprove} onDeny={onDeny} />
    </Box>
  );
}

import { useInput } from 'ink';

function ApprovalKeyListener({ onApprove, onDeny }: { onApprove: () => void; onDeny: () => void }) {
  useInput((input: string) => {
    if (input.toLowerCase() === 'y') {
      onApprove();
    } else if (input.toLowerCase() === 'n') {
      onDeny();
    }
  });

  return null;
}
