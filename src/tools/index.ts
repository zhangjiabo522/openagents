import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';

const isWindows = os.platform() === 'win32';

export interface Tool {
  name: string;
  description: string;
  dangerous?: boolean; // 需要用户审批
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (params: Record<string, string>) => Promise<string>;
}

export interface ToolCall {
  tool: string;
  params: Record<string, string>;
}

export interface ToolResult {
  tool: string;
  success: boolean;
  output: string;
  folded?: boolean; // 是否折叠显示
}

// ========== 平台自适应命令 ==========

// Linux 命令 → Windows 替代表
const LINUX_TO_WINDOWS: Record<string, string> = {
  'uptime': 'systeminfo | findstr /B /C:"System Boot Time"',
  'free': 'wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value',
  'df': 'wmic logicaldisk get caption,freespace,size',
  'top': 'tasklist /FO TABLE',
  'ps': 'tasklist',
  'ls': 'dir',
  'cat': 'type',
  'grep': 'findstr',
  'clear': 'cls',
  'pwd': 'cd',
  'whoami': 'whoami',
  'uname -a': 'systeminfo | findstr /B /C:"OS Name" /C:"OS Version"',
  'hostname': 'hostname',
};

const executeCommandTool: Tool = {
  name: 'execute_command',
  description: `执行 shell 命令。当前平台: ${isWindows ? 'Windows (用 dir/cls/findstr/tasklist 等)' : 'Linux/Mac (用 ls/clear/grep/ps 等)'}`,
  parameters: {
    command: { type: 'string', description: '要执行的命令', required: true },
    cwd: { type: 'string', description: '工作目录（可选）' },
  },
  execute: async (params) => {
    let cmd = params.command;

    // Windows 自动替换常见 Linux 命令
    if (isWindows) {
      const cmdBase = cmd.split(' ')[0];
      if (LINUX_TO_WINDOWS[cmdBase]) {
        cmd = LINUX_TO_WINDOWS[cmdBase] + cmd.slice(cmdBase.length);
      }
    }

    try {
      const options: Record<string, unknown> = {
        encoding: 'utf-8',
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      };
      if (params.cwd) options.cwd = params.cwd;
      const result = execSync(cmd, options);
      return result.toString().slice(0, 5000);
    } catch (error: unknown) {
      const err = error as { message?: string; stderr?: string };
      const errMsg = (err.stderr || err.message || '未知错误').slice(0, 300);
      return `命令执行失败: ${errMsg}`;
    }
  },
};

// 危险命令 - 需要审批
const executeDangerousCommandTool: Tool = {
  name: 'execute_dangerous_command',
  description: '执行可能有风险的命令（删除、覆盖等），需要用户确认',
  dangerous: true,
  parameters: {
    command: { type: 'string', description: '要执行的命令', required: true },
    reason: { type: 'string', description: '为什么需要执行这个命令', required: true },
    cwd: { type: 'string', description: '工作目录（可选）' },
  },
  execute: async (params) => {
    try {
      const options: Record<string, unknown> = {
        encoding: 'utf-8',
        timeout: 30000,
      };
      if (params.cwd) options.cwd = params.cwd;
      const result = execSync(params.command, options);
      return result.toString().slice(0, 5000);
    } catch (error: unknown) {
      const err = error as { message?: string; stderr?: string };
      return `命令执行失败: ${err.stderr || err.message || '未知错误'}`;
    }
  },
};

const readFileTool: Tool = {
  name: 'read_file',
  description: '读取文件内容',
  parameters: {
    path: { type: 'string', description: '文件路径', required: true },
  },
  execute: async (params) => {
    try {
      const filePath = path.resolve(params.path);
      if (!fs.existsSync(filePath)) return `文件不存在: ${filePath}`;
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.length > 5000 ? content.slice(0, 5000) + '\n...(内容已截断)' : content;
    } catch (error) {
      return `读取失败: ${(error as Error).message}`;
    }
  },
};

const writeFileTool: Tool = {
  name: 'write_file',
  description: '写入文件内容（会自动创建目录）',
  dangerous: true,
  parameters: {
    path: { type: 'string', description: '文件路径', required: true },
    content: { type: 'string', description: '文件内容', required: true },
  },
  execute: async (params) => {
    try {
      const filePath = path.resolve(params.path);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, params.content, 'utf-8');
      return `文件已写入: ${filePath} (${params.content.length} 字节)`;
    } catch (error) {
      return `写入失败: ${(error as Error).message}`;
    }
  },
};

const listDirTool: Tool = {
  name: 'list_directory',
  description: '列出目录内容',
  parameters: {
    path: { type: 'string', description: '目录路径', required: true },
  },
  execute: async (params) => {
    try {
      const dirPath = path.resolve(params.path);
      if (!fs.existsSync(dirPath)) return `目录不存在: ${dirPath}`;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      return entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n');
    } catch (error) {
      return `列出失败: ${(error as Error).message}`;
    }
  },
};

const createDirTool: Tool = {
  name: 'create_directory',
  description: '创建目录',
  parameters: {
    path: { type: 'string', description: '目录路径', required: true },
  },
  execute: async (params) => {
    try {
      const dirPath = path.resolve(params.path);
      fs.mkdirSync(dirPath, { recursive: true });
      return `目录已创建: ${dirPath}`;
    } catch (error) {
      return `创建失败: ${(error as Error).message}`;
    }
  },
};

const getSystemInfoTool: Tool = {
  name: 'get_system_info',
  description: `获取当前系统信息（OS、CPU、内存等）。当前平台: ${isWindows ? 'Windows' : 'Linux/Mac'}`,
  parameters: {},
  execute: async () => {
    const platform = os.platform();
    const info: Record<string, string> = {
      平台: platform === 'win32' ? 'Windows' : platform,
      架构: os.arch(),
      主机名: os.hostname(),
      CPU核心数: String(os.cpus().length),
      总内存: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
      可用内存: `${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`,
      主目录: os.homedir(),
      工作目录: process.cwd(),
      Node版本: process.version,
    };
    return Object.entries(info).map(([k, v]) => `${k}: ${v}`).join('\n');
  },
};

const getCwdTool: Tool = {
  name: 'get_cwd',
  description: '获取当前工作目录',
  parameters: {},
  execute: async () => process.cwd(),
};

// ========== call_agent 工具（动态注册） ==========

export function registerCallAgentTool(
  findAgent: (nameOrType: string) => { name: string; processTask: (task: string) => Promise<{ content: string }> } | undefined
): void {
  const callAgentTool: Tool = {
    name: 'call_agent',
    description: '调用其他 Agent 协助完成任务。可用: coder(编码), reviewer(审查), researcher(调研), planner(规划)',
    parameters: {
      agent: { type: 'string', description: '目标 Agent 名称或类型 (coder/reviewer/researcher/planner)', required: true },
      task: { type: 'string', description: '要交给该 Agent 的任务描述', required: true },
    },
    execute: async (params) => {
      const agent = findAgent(params.agent);
      if (!agent) return `未找到 Agent: ${params.agent}。可用: coder, reviewer, researcher, planner`;
      try {
        const result = await agent.processTask(params.task);
        return result.content;
      } catch (error) {
        return `Agent 调用失败: ${(error as Error).message}`;
      }
    },
  };
  tools.set('call_agent', callAgentTool);
}

// ========== 工具注册 ==========

export const tools: Map<string, Tool> = new Map();

function registerTool(tool: Tool) {
  tools.set(tool.name, tool);
}

registerTool(executeCommandTool);
registerTool(executeDangerousCommandTool);
registerTool(readFileTool);
registerTool(writeFileTool);
registerTool(listDirTool);
registerTool(createDirTool);
registerTool(getSystemInfoTool);
registerTool(getCwdTool);

// ========== 工具描述（给 Agent） ==========

export function getToolsDescription(): string {
  const platform = isWindows ? 'Windows' : 'Linux/Mac';
  let desc = `你可以使用以下工具来完成任务。当前平台: ${platform}

工具调用格式:
\`\`\`tool_call
{"tool": "工具名", "params": {"参数名": "参数值"}}
\`\`\`

可用工具:

`;
  for (const [name, tool] of tools) {
    desc += `- ${name}: ${tool.description}${tool.dangerous ? ' [需要审批]' : ''}\n`;
  }

  if (isWindows) {
    desc += `
重要: 当前是 Windows 系统！
- 不要用 Linux 命令（uptime/free/df/top/ps/ls/cat/grep），用 Windows 等效命令
- execute_command 会自动替换常见 Linux 命令，但最好直接用 Windows 命令
- 路径用反斜杠 \\ 或正斜杠 / 均可
- 推荐用 get_system_info 获取系统信息`;
  } else {
    desc += `
重要: 当前是 Linux/Mac 系统！
- 路径用正斜杠 /`;
  }

  desc += `
你可以调用其他 Agent 协助完成任务:
- call_agent: 调用其他 Agent。参数: agent(名称), task(任务描述)
  例如: {"tool": "call_agent", "params": {"agent": "reviewer", "task": "审查这段代码"}}

可以一次调用多个工具，每个用单独的 tool_call 代码块。
工具执行结果会自动折叠，请用简洁的中文总结给用户。`;

  return desc;
}

// ========== 工具调用解析 ==========

export function parseToolCalls(content: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const regex = /```tool_call\s*\n([\s\S]*?)\n```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const cleaned = match[1].trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.tool && parsed.params) {
        calls.push(parsed);
      }
    } catch {
      // 尝试修复常见 JSON 格式问题
      try {
        const cleaned = match[1].trim()
          .replace(/'/g, '"')
          .replace(/(\w+):/g, '"$1":');
        const parsed = JSON.parse(cleaned);
        if (parsed.tool) {
          calls.push({ tool: parsed.tool, params: parsed.params || {} });
        }
      } catch {
        // 忽略解析失败
      }
    }
  }
  return calls;
}

// ========== 危险命令检测 ==========

const DANGEROUS_PATTERNS = [
  /\brm\s+(-rf?|--recursive)/i,
  /\bdel\s+\/[sf]/i,
  /\brmdir\s+\/s/i,
  /\bformat\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bkill\s+-9\b/i,
  /\btaskkill\b/i,
  /\breg\s+delete\b/i,
  /\bnet\s+user\b.*\/add/i,
  /\bchmod\s+777\b/i,
  />\s*\/dev\/sd[a-z]/i,
];

export function isDangerousCommand(command: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(command));
}

// ========== 执行工具调用 ==========

export async function executeToolCalls(
  calls: ToolCall[],
  approveCallback?: (tool: string, params: Record<string, string>) => Promise<boolean>
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const call of calls) {
    const tool = tools.get(call.tool);
    if (!tool) {
      results.push({ tool: call.tool, success: false, output: `工具不存在: ${call.tool}` });
      continue;
    }

    // 检查是否需要审批
    const needsApproval = tool.dangerous ||
      (call.tool === 'execute_command' && isDangerousCommand(call.params.command || ''));

    if (needsApproval && approveCallback) {
      const approved = await approveCallback(call.tool, call.params);
      if (!approved) {
        results.push({ tool: call.tool, success: false, output: '用户拒绝执行此命令' });
        continue;
      }
    }

    try {
      const output = await tool.execute(call.params);
      results.push({
        tool: call.tool,
        success: true,
        output,
        folded: output.length > 200, // 长输出折叠
      });
    } catch (error) {
      results.push({ tool: call.tool, success: false, output: (error as Error).message });
    }
  }
  return results;
}

// 格式化工具结果（折叠版本，给用户看）
export function formatToolResultsForUser(results: ToolResult[]): string {
  if (results.length === 0) return '';

  const lines: string[] = [];
  for (const r of results) {
    const icon = r.success ? chalk.green('✓') : chalk.red('✗');
    let detail = '';
    if (!r.success) {
      detail = chalk.red(` ${r.output.slice(0, 80)}`);
    } else if (r.folded) {
      detail = chalk.gray(` (${r.output.length} 字符)`);
    } else if (r.output.length < 60) {
      detail = chalk.gray(`: ${r.output}`);
    } else {
      detail = chalk.gray(`: ${r.output.slice(0, 60)}...`);
    }
    lines.push(`  ${icon} ${r.tool}${detail}`);
  }
  return lines.join('\n');
}

// 格式化工具结果（完整版本，给 Agent 总结用）
export function formatToolResultsForAgent(results: ToolResult[]): string {
  let text = '## 工具执行结果\n\n';
  for (const result of results) {
    text += `### ${result.tool} ${result.success ? '(成功)' : '(失败)'}\n`;
    text += '```\n' + result.output + '\n```\n\n';
  }
  text += '请根据以上工具执行结果，用简洁的语言总结给用户。';
  return text;
}
