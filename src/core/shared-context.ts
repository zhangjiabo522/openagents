import { EventEmitter } from 'events';

export interface ContextEntry {
  id: string;
  agentId: string;
  agentName: string;
  type: 'task' | 'result' | 'info' | 'code' | 'file';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface WorkspaceFile {
  path: string;
  content: string;
  createdBy: string;
  updatedAt: Date;
}

/**
 * 共享上下文 - 所有 Agent 共享的工作空间
 * 包含：任务历史、代码片段、文件、关键信息
 */
export class SharedContext extends EventEmitter {
  private entries: ContextEntry[] = [];
  private workspace: Map<string, WorkspaceFile> = new Map();
  private maxEntries: number;

  constructor(maxEntries: number = 200) {
    super();
    this.maxEntries = maxEntries;
  }

  // 添加上下文条目
  addEntry(entry: Omit<ContextEntry, 'id' | 'timestamp'>): void {
    const fullEntry: ContextEntry = {
      ...entry,
      id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    };

    this.entries.push(fullEntry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    this.emit('entry_added', fullEntry);
  }

  // 获取最近的上下文（用于构建 agent 的上下文窗口）
  getRecentContext(limit: number = 20): ContextEntry[] {
    return this.entries.slice(-limit);
  }

  // 获取特定 agent 的上下文
  getAgentContext(agentId: string, limit: number = 10): ContextEntry[] {
    return this.entries
      .filter(e => e.agentId === agentId)
      .slice(-limit);
  }

  // 获取所有 agent 的最新输出
  getLatestOutputs(): Map<string, string> {
    const outputs = new Map<string, string>();
    for (const entry of this.entries) {
      if (entry.type === 'result' || entry.type === 'code') {
        outputs.set(entry.agentId, entry.content);
      }
    }
    return outputs;
  }

  // 工作区文件操作
  setWorkspaceFile(path: string, content: string, agentId: string): void {
    this.workspace.set(path, {
      path,
      content,
      createdBy: agentId,
      updatedAt: new Date(),
    });
    this.emit('file_updated', { path, agentId });
  }

  getWorkspaceFile(path: string): WorkspaceFile | undefined {
    return this.workspace.get(path);
  }

  getWorkspaceFiles(): WorkspaceFile[] {
    return Array.from(this.workspace.values());
  }

  // 构建给 agent 的上下文摘要
  buildContextSummary(agentId: string): string {
    const recentEntries = this.getRecentContext(15);
    const files = this.getWorkspaceFiles();

    let summary = '## 共享工作区上下文\n\n';

    // 最近的任务和结果
    if (recentEntries.length > 0) {
      summary += '### 最近活动\n';
      for (const entry of recentEntries) {
        const time = entry.timestamp.toLocaleTimeString();
        const prefix = entry.agentId === agentId ? '[你]' : `[${entry.agentName}]`;
        const contentPreview = entry.content.slice(0, 200);
        summary += `${time} ${prefix}: ${contentPreview}${entry.content.length > 200 ? '...' : ''}\n`;
      }
      summary += '\n';
    }

    // 工作区文件
    if (files.length > 0) {
      summary += '### 工作区文件\n';
      for (const file of files) {
        summary += `- ${file.path} (由 ${file.createdBy} 创建)\n`;
      }
      summary += '\n';
    }

    return summary;
  }

  // 清空上下文
  clear(): void {
    this.entries = [];
    this.workspace.clear();
    this.emit('cleared');
  }

  // 获取条目数
  getEntryCount(): number {
    return this.entries.length;
  }
}

// 全局共享上下文实例
export const sharedContext = new SharedContext();
