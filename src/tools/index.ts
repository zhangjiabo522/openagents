import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface Tool {
  name: string;
  description: string;
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
}

// 执行 shell 命令
const executeCommandTool: Tool = {
  name: 'execute_command',
  description: '执行 shell 命令（Linux/Windows）',
  parameters: {
    command: { type: 'string', description: '要执行的命令', required: true },
    cwd: { type: 'string', description: '工作目录（可选）' },
  },
  execute: async (params) => {
    try {
      const options: Record<string, unknown> = { encoding: 'utf-8', timeout: 30000 };
      if (params.cwd) options.cwd = params.cwd;
      const result = execSync(params.command, options);
      return result.toString();
    } catch (error) {
      return `命令执行失败: ${(error as Error).message}`;
    }
  },
};

// 读取文件
const readFileTool: Tool = {
  name: 'read_file',
  description: '读取文件内容',
  parameters: {
    path: { type: 'string', description: '文件路径', required: true },
    encoding: { type: 'string', description: '编码（默认 utf-8）' },
  },
  execute: async (params) => {
    try {
      const filePath = path.resolve(params.path);
      if (!fs.existsSync(filePath)) return `文件不存在: ${filePath}`;
      return fs.readFileSync(filePath, params.encoding || 'utf-8');
    } catch (error) {
      return `读取失败: ${(error as Error).message}`;
    }
  },
};

// 写入文件
const writeFileTool: Tool = {
  name: 'write_file',
  description: '写入文件内容（会创建目录）',
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
      return `文件已写入: ${filePath}`;
    } catch (error) {
      return `写入失败: ${(error as Error).message}`;
    }
  },
};

// 列出目录
const listDirTool: Tool = {
  name: 'list_directory',
  description: '列出目录内容',
  parameters: {
    path: { type: 'string', description: '目录路径', required: true },
    recursive: { type: 'string', description: '是否递归（true/false）' },
  },
  execute: async (params) => {
    try {
      const dirPath = path.resolve(params.path);
      if (!fs.existsSync(dirPath)) return `目录不存在: ${dirPath}`;

      if (params.recursive === 'true') {
        const files: string[] = [];
        const walk = (dir: string) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              walk(fullPath);
            } else {
              files.push(fullPath);
            }
          }
        };
        walk(dirPath);
        return files.join('\n');
      } else {
        return fs.readdirSync(dirPath).join('\n');
      }
    } catch (error) {
      return `列出失败: ${(error as Error).message}`;
    }
  },
};

// 创建目录
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

// 检查文件/目录是否存在
const existsTool: Tool = {
  name: 'check_exists',
  description: '检查文件或目录是否存在',
  parameters: {
    path: { type: 'string', description: '路径', required: true },
  },
  execute: async (params) => {
    const p = path.resolve(params.path);
    const exists = fs.existsSync(p);
    const stat = exists ? fs.statSync(p) : null;
    return JSON.stringify({
      exists,
      isFile: stat?.isFile() || false,
      isDirectory: stat?.isDirectory() || false,
      size: stat?.size || 0,
    });
  },
};

// 删除文件
const deleteFileTool: Tool = {
  name: 'delete_file',
  description: '删除文件',
  parameters: {
    path: { type: 'string', description: '文件路径', required: true },
  },
  execute: async (params) => {
    try {
      const filePath = path.resolve(params.path);
      if (!fs.existsSync(filePath)) return `文件不存在: ${filePath}`;
      fs.unlinkSync(filePath);
      return `文件已删除: ${filePath}`;
    } catch (error) {
      return `删除失败: ${(error as Error).message}`;
    }
  },
};

// 注册所有工具
export const tools: Map<string, Tool> = new Map();

function registerTool(tool: Tool) {
  tools.set(tool.name, tool);
}

registerTool(executeCommandTool);
registerTool(readFileTool);
registerTool(writeFileTool);
registerTool(listDirTool);
registerTool(createDirTool);
registerTool(existsTool);
registerTool(deleteFileTool);

// 获取工具描述（用于 system prompt）
export function getToolsDescription(): string {
  let desc = '你可以使用以下工具:\n\n';
  for (const [name, tool] of tools) {
    desc += `## ${name}\n${tool.description}\n参数:\n`;
    for (const [paramName, param] of Object.entries(tool.parameters)) {
      desc += `  - ${paramName}: ${param.description}${param.required ? ' (必填)' : ' (可选)'}\n`;
    }
    desc += '\n';
  }
  desc += `调用工具的格式:
\`\`\`tool_call
{"tool": "工具名", "params": {"参数名": "参数值"}}
\`\`\`

你可以一次调用多个工具，每个工具调用用单独的代码块。`;
  return desc;
}

// 解析工具调用
export function parseToolCalls(content: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const regex = /```tool_call\s*\n({[\s\S]*?})\s*\n```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.tool && parsed.params) {
        calls.push(parsed);
      }
    } catch {
      // 忽略解析失败的
    }
  }
  return calls;
}

// 执行工具调用
export async function executeToolCalls(calls: ToolCall[]): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  for (const call of calls) {
    const tool = tools.get(call.tool);
    if (!tool) {
      results.push({ tool: call.tool, success: false, output: `工具不存在: ${call.tool}` });
      continue;
    }
    try {
      const output = await tool.execute(call.params);
      results.push({ tool: call.tool, success: true, output });
    } catch (error) {
      results.push({ tool: call.tool, success: false, output: (error as Error).message });
    }
  }
  return results;
}
