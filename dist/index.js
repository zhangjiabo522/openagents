#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/config/schema.ts
import { z } from "zod";
var ProviderSchema, AgentConfigSchema, OrchestratorConfigSchema, SessionsConfigSchema, ConfigSchema;
var init_schema = __esm({
  "src/config/schema.ts"() {
    "use strict";
    ProviderSchema = z.object({
      name: z.string(),
      api_key: z.string(),
      base_url: z.string().url(),
      default_model: z.string().optional()
    });
    AgentConfigSchema = z.object({
      provider: z.string(),
      model: z.string(),
      system_prompt: z.string(),
      temperature: z.number().min(0).max(2).default(0.7),
      max_tokens: z.number().positive().optional(),
      enabled: z.boolean().default(true)
    });
    OrchestratorConfigSchema = z.object({
      max_concurrent_agents: z.number().positive().default(3),
      auto_decompose: z.boolean().default(true),
      collaboration_mode: z.enum(["hierarchical", "peer", "hybrid"]).default("hierarchical")
    });
    SessionsConfigSchema = z.object({
      auto_save: z.boolean().default(true),
      max_history: z.number().positive().default(100),
      storage_dir: z.string().optional()
    });
    ConfigSchema = z.object({
      providers: z.array(ProviderSchema).min(1),
      agents: z.record(AgentConfigSchema),
      orchestrator: OrchestratorConfigSchema.default({}),
      sessions: SessionsConfigSchema.default({})
    });
  }
});

// src/config/defaults.ts
function getDefaultConfig() {
  return {
    providers: [],
    ...DEFAULT_CONFIG
  };
}
var DEFAULT_CONFIG;
var init_defaults = __esm({
  "src/config/defaults.ts"() {
    "use strict";
    DEFAULT_CONFIG = {
      agents: {
        planner: {
          provider: "openai",
          model: "gpt-4o",
          system_prompt: `\u4F60\u662F\u4E00\u4E2A\u4EFB\u52A1\u89C4\u5212\u4E13\u5BB6\u3002\u4F60\u7684\u804C\u8D23\u662F\uFF1A
1. \u5206\u6790\u7528\u6237\u7684\u8BF7\u6C42\uFF0C\u7406\u89E3\u5176\u610F\u56FE
2. \u5C06\u590D\u6742\u4EFB\u52A1\u5206\u89E3\u4E3A\u53EF\u6267\u884C\u7684\u5B50\u4EFB\u52A1
3. \u4E3A\u6BCF\u4E2A\u5B50\u4EFB\u52A1\u6307\u5B9A\u6700\u9002\u5408\u7684\u6267\u884C\u89D2\u8272\uFF08coder/reviewer/researcher\uFF09
4. \u786E\u4FDD\u4EFB\u52A1\u4E4B\u95F4\u7684\u4F9D\u8D56\u5173\u7CFB\u6E05\u6670

\u8BF7\u7528 JSON \u683C\u5F0F\u8F93\u51FA\u4EFB\u52A1\u5206\u89E3\u7ED3\u679C\uFF1A
{
  "tasks": [
    {
      "id": "task-1",
      "description": "\u4EFB\u52A1\u63CF\u8FF0",
      "assignee": "coder|reviewer|researcher",
      "dependencies": [],
      "priority": "high|medium|low"
    }
  ],
  "summary": "\u4EFB\u52A1\u603B\u4F53\u6982\u8FF0"
}`,
          temperature: 0.7,
          enabled: true
        },
        coder: {
          provider: "openai",
          model: "gpt-4o",
          system_prompt: `\u4F60\u662F\u4E00\u4E2A\u9AD8\u7EA7\u7A0B\u5E8F\u5458\u3002\u4F60\u7684\u804C\u8D23\u662F\uFF1A
1. \u6839\u636E\u4EFB\u52A1\u63CF\u8FF0\u7F16\u5199\u9AD8\u8D28\u91CF\u4EE3\u7801
2. \u9075\u5FAA\u6700\u4F73\u5B9E\u8DF5\u548C\u8BBE\u8BA1\u6A21\u5F0F
3. \u7F16\u5199\u6E05\u6670\u7684\u6CE8\u91CA\u548C\u6587\u6863
4. \u8003\u8651\u8FB9\u754C\u60C5\u51B5\u548C\u9519\u8BEF\u5904\u7406

\u8F93\u51FA\u4EE3\u7801\u65F6\u8BF7\u4F7F\u7528 Markdown \u4EE3\u7801\u5757\uFF0C\u5E76\u6CE8\u660E\u7F16\u7A0B\u8BED\u8A00\u3002`,
          temperature: 0.3,
          enabled: true
        },
        reviewer: {
          provider: "openai",
          model: "gpt-4o",
          system_prompt: `\u4F60\u662F\u4E00\u4E2A\u4EE3\u7801\u5BA1\u67E5\u4E13\u5BB6\u3002\u4F60\u7684\u804C\u8D23\u662F\uFF1A
1. \u5BA1\u67E5\u4EE3\u7801\u7684\u6B63\u786E\u6027\u3001\u53EF\u8BFB\u6027\u548C\u6027\u80FD
2. \u53D1\u73B0\u6F5C\u5728\u7684 bug \u548C\u5B89\u5168\u6F0F\u6D1E
3. \u63D0\u4F9B\u6539\u8FDB\u5EFA\u8BAE
4. \u786E\u4FDD\u4EE3\u7801\u7B26\u5408\u6700\u4F73\u5B9E\u8DF5

\u8BF7\u7528\u7ED3\u6784\u5316\u7684\u65B9\u5F0F\u8F93\u51FA\u5BA1\u67E5\u7ED3\u679C\uFF1A
- \u95EE\u9898\u5217\u8868\uFF08\u4E25\u91CD\u7A0B\u5EA6\uFF1A\u9AD8/\u4E2D/\u4F4E\uFF09
- \u6539\u8FDB\u5EFA\u8BAE
- \u603B\u4F53\u8BC4\u4EF7`,
          temperature: 0.5,
          enabled: true
        },
        researcher: {
          provider: "openai",
          model: "gpt-4o",
          system_prompt: `\u4F60\u662F\u4E00\u4E2A\u6280\u672F\u7814\u7A76\u4E13\u5BB6\u3002\u4F60\u7684\u804C\u8D23\u662F\uFF1A
1. \u8C03\u7814\u6280\u672F\u65B9\u6848\u548C\u6700\u4F73\u5B9E\u8DF5
2. \u5206\u6790\u4E0D\u540C\u65B9\u6848\u7684\u4F18\u7F3A\u70B9
3. \u63D0\u4F9B\u6280\u672F\u9009\u578B\u5EFA\u8BAE
4. \u6574\u7406\u76F8\u5173\u6587\u6863\u548C\u8D44\u6E90

\u8BF7\u63D0\u4F9B\u7ED3\u6784\u5316\u7684\u7814\u7A76\u62A5\u544A\uFF0C\u5305\u62EC\uFF1A\u80CC\u666F\u3001\u65B9\u6848\u5BF9\u6BD4\u3001\u63A8\u8350\u65B9\u6848\u3001\u53C2\u8003\u8D44\u6599\u3002`,
          temperature: 0.7,
          enabled: true
        }
      },
      orchestrator: {
        max_concurrent_agents: 3,
        auto_decompose: true,
        collaboration_mode: "hierarchical"
      },
      sessions: {
        auto_save: true,
        max_history: 100
      }
    };
  }
});

// src/config/loader.ts
var loader_exports = {};
__export(loader_exports, {
  configExists: () => configExists,
  ensureConfigDir: () => ensureConfigDir,
  getConfigDir: () => getConfigDir,
  getConfigPath: () => getConfigPath,
  getSessionsDir: () => getSessionsDir,
  loadConfig: () => loadConfig,
  saveConfig: () => saveConfig,
  updateConfig: () => updateConfig
});
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as yaml from "js-yaml";
function getConfigDir() {
  return CONFIG_DIR;
}
function getConfigPath() {
  return CONFIG_FILE;
}
function getSessionsDir() {
  return SESSIONS_DIR;
}
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}
function configExists() {
  return fs.existsSync(CONFIG_FILE);
}
function loadConfig() {
  ensureConfigDir();
  if (!configExists()) {
    const defaultConfig = getDefaultConfig();
    saveConfig(defaultConfig);
    return defaultConfig;
  }
  try {
    const content = fs.readFileSync(CONFIG_FILE, "utf-8");
    const raw = yaml.load(content);
    const result = ConfigSchema.safeParse(raw);
    if (!result.success) {
      console.error("\u914D\u7F6E\u6587\u4EF6\u683C\u5F0F\u9519\u8BEF:");
      result.error.errors.forEach((err) => {
        console.error(`  ${err.path.join(".")}: ${err.message}`);
      });
      console.error("\n\u4F7F\u7528\u9ED8\u8BA4\u914D\u7F6E...");
      return getDefaultConfig();
    }
    return result.data;
  } catch (error) {
    console.error(`\u8BFB\u53D6\u914D\u7F6E\u6587\u4EF6\u5931\u8D25: ${error}`);
    return getDefaultConfig();
  }
}
function saveConfig(config) {
  ensureConfigDir();
  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    noRefs: true
  });
  fs.writeFileSync(CONFIG_FILE, content, "utf-8");
}
function updateConfig(updates) {
  const current = loadConfig();
  const merged = { ...current, ...updates };
  saveConfig(merged);
  return merged;
}
var CONFIG_DIR, CONFIG_FILE, SESSIONS_DIR;
var init_loader = __esm({
  "src/config/loader.ts"() {
    "use strict";
    init_schema();
    init_defaults();
    CONFIG_DIR = path.join(os.homedir(), ".openagents");
    CONFIG_FILE = path.join(CONFIG_DIR, "config.yaml");
    SESSIONS_DIR = path.join(CONFIG_DIR, "sessions");
  }
});

// src/core/session.ts
import * as fs2 from "fs";
import * as path2 from "path";
import { v4 as uuidv4 } from "uuid";
var Session;
var init_session = __esm({
  "src/core/session.ts"() {
    "use strict";
    init_loader();
    Session = class _Session {
      id;
      name;
      createdAt;
      updatedAt;
      messages = [];
      metadata = {};
      constructor(name, existingData) {
        if (existingData) {
          this.id = existingData.id;
          this.name = existingData.name;
          this.createdAt = new Date(existingData.createdAt);
          this.updatedAt = new Date(existingData.updatedAt);
          this.messages = existingData.messages;
          this.metadata = existingData.metadata;
        } else {
          this.id = uuidv4();
          this.name = name || `session-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`;
          this.createdAt = /* @__PURE__ */ new Date();
          this.updatedAt = /* @__PURE__ */ new Date();
        }
      }
      addMessage(message) {
        this.messages.push(message);
        this.updatedAt = /* @__PURE__ */ new Date();
      }
      getMessages(limit) {
        if (limit) {
          return this.messages.slice(-limit);
        }
        return [...this.messages];
      }
      getName() {
        return this.name;
      }
      setName(name) {
        this.name = name;
        this.updatedAt = /* @__PURE__ */ new Date();
      }
      save() {
        const sessionsDir = getSessionsDir();
        if (!fs2.existsSync(sessionsDir)) {
          fs2.mkdirSync(sessionsDir, { recursive: true });
        }
        const filePath = path2.join(sessionsDir, `${this.id}.json`);
        const data = {
          id: this.id,
          name: this.name,
          createdAt: this.createdAt.toISOString(),
          updatedAt: this.updatedAt.toISOString(),
          messages: this.messages,
          metadata: this.metadata
        };
        fs2.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      }
      static load(sessionId) {
        const sessionsDir = getSessionsDir();
        const filePath = path2.join(sessionsDir, `${sessionId}.json`);
        if (!fs2.existsSync(filePath)) {
          return null;
        }
        try {
          const content = fs2.readFileSync(filePath, "utf-8");
          const data = JSON.parse(content);
          return new _Session(void 0, data);
        } catch {
          return null;
        }
      }
      static listSessions() {
        const sessionsDir = getSessionsDir();
        if (!fs2.existsSync(sessionsDir)) {
          return [];
        }
        const files = fs2.readdirSync(sessionsDir).filter((f) => f.endsWith(".json"));
        const sessions = [];
        for (const file of files) {
          try {
            const content = fs2.readFileSync(path2.join(sessionsDir, file), "utf-8");
            sessions.push(JSON.parse(content));
          } catch {
          }
        }
        return sessions.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }
      static deleteSession(sessionId) {
        const sessionsDir = getSessionsDir();
        const filePath = path2.join(sessionsDir, `${sessionId}.json`);
        if (fs2.existsSync(filePath)) {
          fs2.unlinkSync(filePath);
          return true;
        }
        return false;
      }
    };
  }
});

// src/core/shared-context.ts
import { EventEmitter } from "events";
var SharedContext, sharedContext;
var init_shared_context = __esm({
  "src/core/shared-context.ts"() {
    "use strict";
    SharedContext = class extends EventEmitter {
      entries = [];
      workspace = /* @__PURE__ */ new Map();
      maxEntries;
      constructor(maxEntries = 200) {
        super();
        this.maxEntries = maxEntries;
      }
      // 添加上下文条目
      addEntry(entry) {
        const fullEntry = {
          ...entry,
          id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: /* @__PURE__ */ new Date()
        };
        this.entries.push(fullEntry);
        if (this.entries.length > this.maxEntries) {
          this.entries.shift();
        }
        this.emit("entry_added", fullEntry);
      }
      // 获取最近的上下文（用于构建 agent 的上下文窗口）
      getRecentContext(limit = 20) {
        return this.entries.slice(-limit);
      }
      // 获取特定 agent 的上下文
      getAgentContext(agentId, limit = 10) {
        return this.entries.filter((e) => e.agentId === agentId).slice(-limit);
      }
      // 获取所有 agent 的最新输出
      getLatestOutputs() {
        const outputs = /* @__PURE__ */ new Map();
        for (const entry of this.entries) {
          if (entry.type === "result" || entry.type === "code") {
            outputs.set(entry.agentId, entry.content);
          }
        }
        return outputs;
      }
      // 工作区文件操作
      setWorkspaceFile(path4, content, agentId) {
        this.workspace.set(path4, {
          path: path4,
          content,
          createdBy: agentId,
          updatedAt: /* @__PURE__ */ new Date()
        });
        this.emit("file_updated", { path: path4, agentId });
      }
      getWorkspaceFile(path4) {
        return this.workspace.get(path4);
      }
      getWorkspaceFiles() {
        return Array.from(this.workspace.values());
      }
      // 构建给 agent 的上下文摘要
      buildContextSummary(agentId) {
        const recentEntries = this.getRecentContext(15);
        const files = this.getWorkspaceFiles();
        let summary = "## \u5171\u4EAB\u5DE5\u4F5C\u533A\u4E0A\u4E0B\u6587\n\n";
        if (recentEntries.length > 0) {
          summary += "### \u6700\u8FD1\u6D3B\u52A8\n";
          for (const entry of recentEntries) {
            const time = entry.timestamp.toLocaleTimeString();
            const prefix = entry.agentId === agentId ? "[\u4F60]" : `[${entry.agentName}]`;
            const contentPreview = entry.content.slice(0, 200);
            summary += `${time} ${prefix}: ${contentPreview}${entry.content.length > 200 ? "..." : ""}
`;
          }
          summary += "\n";
        }
        if (files.length > 0) {
          summary += "### \u5DE5\u4F5C\u533A\u6587\u4EF6\n";
          for (const file of files) {
            summary += `- ${file.path} (\u7531 ${file.createdBy} \u521B\u5EFA)
`;
          }
          summary += "\n";
        }
        return summary;
      }
      // 清空上下文
      clear() {
        this.entries = [];
        this.workspace.clear();
        this.emit("cleared");
      }
      // 获取条目数
      getEntryCount() {
        return this.entries.length;
      }
    };
    sharedContext = new SharedContext();
  }
});

// src/tools/index.ts
import { execSync } from "child_process";
import * as fs3 from "fs";
import * as path3 from "path";
import * as os2 from "os";
function registerTool(tool) {
  tools.set(tool.name, tool);
}
function getToolsDescription() {
  let desc = `\u4F60\u53EF\u4EE5\u4F7F\u7528\u4EE5\u4E0B\u5DE5\u5177\u6765\u5B8C\u6210\u4EFB\u52A1\u3002\u5DE5\u5177\u8C03\u7528\u683C\u5F0F:

\`\`\`tool_call
{"tool": "\u5DE5\u5177\u540D", "params": {"\u53C2\u6570\u540D": "\u53C2\u6570\u503C"}}
\`\`\`

\u53EF\u7528\u5DE5\u5177:

`;
  for (const [name, tool] of tools) {
    desc += `- **${name}**: ${tool.description}${tool.dangerous ? " [\u9700\u8981\u5BA1\u6279]" : ""}
`;
  }
  desc += `
\u6CE8\u610F\u4E8B\u9879:
1. Windows \u548C Linux \u547D\u4EE4\u4E0D\u540C\uFF0C\u8BF7\u6839\u636E\u7CFB\u7EDF\u9009\u62E9\u5408\u9002\u7684\u547D\u4EE4
2. \u4F7F\u7528 get_system_info \u83B7\u53D6\u7CFB\u7EDF\u4FE1\u606F
3. \u6267\u884C\u547D\u4EE4\u65F6\u6CE8\u610F\u8DEF\u5F84\u5206\u9694\u7B26\uFF08Windows\u7528\\\uFF0CLinux\u7528/\uFF09
4. \u53EF\u4EE5\u4E00\u6B21\u8C03\u7528\u591A\u4E2A\u5DE5\u5177\uFF0C\u6BCF\u4E2A\u7528\u5355\u72EC\u7684 \`\`\`tool_call \u4EE3\u7801\u5757
5. \u5DE5\u5177\u6267\u884C\u7ED3\u679C\u4F1A\u81EA\u52A8\u6298\u53E0\uFF0C\u4F60\u9700\u8981\u603B\u7ED3\u7ED3\u679C\u7ED9\u7528\u6237`;
  return desc;
}
function parseToolCalls(content) {
  const calls = [];
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
      try {
        const cleaned = match[1].trim().replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
        const parsed = JSON.parse(cleaned);
        if (parsed.tool) {
          calls.push({ tool: parsed.tool, params: parsed.params || {} });
        }
      } catch {
      }
    }
  }
  return calls;
}
function isDangerousCommand(command) {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
}
async function executeToolCalls(calls, approveCallback) {
  const results = [];
  for (const call of calls) {
    const tool = tools.get(call.tool);
    if (!tool) {
      results.push({ tool: call.tool, success: false, output: `\u5DE5\u5177\u4E0D\u5B58\u5728: ${call.tool}` });
      continue;
    }
    const needsApproval = tool.dangerous || call.tool === "execute_command" && isDangerousCommand(call.params.command || "");
    if (needsApproval && approveCallback) {
      const approved = await approveCallback(call.tool, call.params);
      if (!approved) {
        results.push({ tool: call.tool, success: false, output: "\u7528\u6237\u62D2\u7EDD\u6267\u884C\u6B64\u547D\u4EE4" });
        continue;
      }
    }
    try {
      const output = await tool.execute(call.params);
      results.push({
        tool: call.tool,
        success: true,
        output,
        folded: output.length > 200
        // 长输出折叠
      });
    } catch (error) {
      results.push({ tool: call.tool, success: false, output: error.message });
    }
  }
  return results;
}
function formatToolResultsForUser(results) {
  if (results.length === 0) return "";
  let text = "";
  for (const result of results) {
    const status = result.success ? "\u2713" : "\u2717";
    text += `${status} ${result.tool}`;
    if (result.folded) {
      text += ` (${result.output.length} \u5B57\u7B26\uFF0C\u5DF2\u6298\u53E0)
`;
    } else if (result.output.length < 100) {
      text += `: ${result.output}
`;
    } else {
      text += `: ${result.output.slice(0, 100)}...
`;
    }
  }
  return text;
}
function formatToolResultsForAgent(results) {
  let text = "## \u5DE5\u5177\u6267\u884C\u7ED3\u679C\n\n";
  for (const result of results) {
    text += `### ${result.tool} ${result.success ? "(\u6210\u529F)" : "(\u5931\u8D25)"}
`;
    text += "```\n" + result.output + "\n```\n\n";
  }
  text += "\u8BF7\u6839\u636E\u4EE5\u4E0A\u5DE5\u5177\u6267\u884C\u7ED3\u679C\uFF0C\u7528\u7B80\u6D01\u7684\u8BED\u8A00\u603B\u7ED3\u7ED9\u7528\u6237\u3002";
  return text;
}
var isWindows, executeCommandTool, executeDangerousCommandTool, readFileTool, writeFileTool, listDirTool, createDirTool, getSystemInfoTool, getCwdTool, tools, DANGEROUS_PATTERNS;
var init_tools = __esm({
  "src/tools/index.ts"() {
    "use strict";
    isWindows = os2.platform() === "win32";
    executeCommandTool = {
      name: "execute_command",
      description: "\u6267\u884C shell \u547D\u4EE4",
      parameters: {
        command: { type: "string", description: "\u8981\u6267\u884C\u7684\u547D\u4EE4", required: true },
        cwd: { type: "string", description: "\u5DE5\u4F5C\u76EE\u5F55\uFF08\u53EF\u9009\uFF09" }
      },
      execute: async (params) => {
        try {
          const options = {
            encoding: "utf-8",
            timeout: 3e4,
            maxBuffer: 1024 * 1024
          };
          if (params.cwd) options.cwd = params.cwd;
          const result = execSync(params.command, options);
          return result.toString().slice(0, 5e3);
        } catch (error) {
          const err = error;
          return `\u547D\u4EE4\u6267\u884C\u5931\u8D25: ${err.stderr || err.message || "\u672A\u77E5\u9519\u8BEF"}`;
        }
      }
    };
    executeDangerousCommandTool = {
      name: "execute_dangerous_command",
      description: "\u6267\u884C\u53EF\u80FD\u6709\u98CE\u9669\u7684\u547D\u4EE4\uFF08\u5220\u9664\u3001\u8986\u76D6\u7B49\uFF09\uFF0C\u9700\u8981\u7528\u6237\u786E\u8BA4",
      dangerous: true,
      parameters: {
        command: { type: "string", description: "\u8981\u6267\u884C\u7684\u547D\u4EE4", required: true },
        reason: { type: "string", description: "\u4E3A\u4EC0\u4E48\u9700\u8981\u6267\u884C\u8FD9\u4E2A\u547D\u4EE4", required: true },
        cwd: { type: "string", description: "\u5DE5\u4F5C\u76EE\u5F55\uFF08\u53EF\u9009\uFF09" }
      },
      execute: async (params) => {
        try {
          const options = {
            encoding: "utf-8",
            timeout: 3e4
          };
          if (params.cwd) options.cwd = params.cwd;
          const result = execSync(params.command, options);
          return result.toString().slice(0, 5e3);
        } catch (error) {
          const err = error;
          return `\u547D\u4EE4\u6267\u884C\u5931\u8D25: ${err.stderr || err.message || "\u672A\u77E5\u9519\u8BEF"}`;
        }
      }
    };
    readFileTool = {
      name: "read_file",
      description: "\u8BFB\u53D6\u6587\u4EF6\u5185\u5BB9",
      parameters: {
        path: { type: "string", description: "\u6587\u4EF6\u8DEF\u5F84", required: true }
      },
      execute: async (params) => {
        try {
          const filePath = path3.resolve(params.path);
          if (!fs3.existsSync(filePath)) return `\u6587\u4EF6\u4E0D\u5B58\u5728: ${filePath}`;
          const content = fs3.readFileSync(filePath, "utf-8");
          return content.length > 5e3 ? content.slice(0, 5e3) + "\n...(\u5185\u5BB9\u5DF2\u622A\u65AD)" : content;
        } catch (error) {
          return `\u8BFB\u53D6\u5931\u8D25: ${error.message}`;
        }
      }
    };
    writeFileTool = {
      name: "write_file",
      description: "\u5199\u5165\u6587\u4EF6\u5185\u5BB9\uFF08\u4F1A\u81EA\u52A8\u521B\u5EFA\u76EE\u5F55\uFF09",
      dangerous: true,
      parameters: {
        path: { type: "string", description: "\u6587\u4EF6\u8DEF\u5F84", required: true },
        content: { type: "string", description: "\u6587\u4EF6\u5185\u5BB9", required: true }
      },
      execute: async (params) => {
        try {
          const filePath = path3.resolve(params.path);
          const dir = path3.dirname(filePath);
          if (!fs3.existsSync(dir)) fs3.mkdirSync(dir, { recursive: true });
          fs3.writeFileSync(filePath, params.content, "utf-8");
          return `\u6587\u4EF6\u5DF2\u5199\u5165: ${filePath} (${params.content.length} \u5B57\u8282)`;
        } catch (error) {
          return `\u5199\u5165\u5931\u8D25: ${error.message}`;
        }
      }
    };
    listDirTool = {
      name: "list_directory",
      description: "\u5217\u51FA\u76EE\u5F55\u5185\u5BB9",
      parameters: {
        path: { type: "string", description: "\u76EE\u5F55\u8DEF\u5F84", required: true }
      },
      execute: async (params) => {
        try {
          const dirPath = path3.resolve(params.path);
          if (!fs3.existsSync(dirPath)) return `\u76EE\u5F55\u4E0D\u5B58\u5728: ${dirPath}`;
          const entries = fs3.readdirSync(dirPath, { withFileTypes: true });
          return entries.map((e) => `${e.isDirectory() ? "[DIR]" : "[FILE]"} ${e.name}`).join("\n");
        } catch (error) {
          return `\u5217\u51FA\u5931\u8D25: ${error.message}`;
        }
      }
    };
    createDirTool = {
      name: "create_directory",
      description: "\u521B\u5EFA\u76EE\u5F55",
      parameters: {
        path: { type: "string", description: "\u76EE\u5F55\u8DEF\u5F84", required: true }
      },
      execute: async (params) => {
        try {
          const dirPath = path3.resolve(params.path);
          fs3.mkdirSync(dirPath, { recursive: true });
          return `\u76EE\u5F55\u5DF2\u521B\u5EFA: ${dirPath}`;
        } catch (error) {
          return `\u521B\u5EFA\u5931\u8D25: ${error.message}`;
        }
      }
    };
    getSystemInfoTool = {
      name: "get_system_info",
      description: "\u83B7\u53D6\u5F53\u524D\u7CFB\u7EDF\u4FE1\u606F\uFF08OS\u3001CPU\u3001\u5185\u5B58\u7B49\uFF09",
      parameters: {},
      execute: async () => {
        return JSON.stringify({
          platform: os2.platform(),
          arch: os2.arch(),
          release: os2.release(),
          hostname: os2.hostname(),
          cpus: os2.cpus().length,
          totalMemory: `${Math.round(os2.totalmem() / 1024 / 1024 / 1024)} GB`,
          freeMemory: `${Math.round(os2.freemem() / 1024 / 1024 / 1024)} GB`,
          homeDir: os2.homedir(),
          cwd: process.cwd(),
          nodeVersion: process.version
        }, null, 2);
      }
    };
    getCwdTool = {
      name: "get_cwd",
      description: "\u83B7\u53D6\u5F53\u524D\u5DE5\u4F5C\u76EE\u5F55",
      parameters: {},
      execute: async () => process.cwd()
    };
    tools = /* @__PURE__ */ new Map();
    registerTool(executeCommandTool);
    registerTool(executeDangerousCommandTool);
    registerTool(readFileTool);
    registerTool(writeFileTool);
    registerTool(listDirTool);
    registerTool(createDirTool);
    registerTool(getSystemInfoTool);
    registerTool(getCwdTool);
    DANGEROUS_PATTERNS = [
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
      />\s*\/dev\/sd[a-z]/i
    ];
  }
});

// src/agents/base-agent.ts
import { v4 as uuidv42 } from "uuid";
var BaseAgent;
var init_base_agent = __esm({
  "src/agents/base-agent.ts"() {
    "use strict";
    init_shared_context();
    init_tools();
    BaseAgent = class {
      id;
      name;
      type;
      config;
      llm;
      conversationHistory = [];
      status = "idle";
      currentTask;
      tasks = [];
      tokenUsage = 0;
      useTools = true;
      approveCallback;
      constructor(name, type, config, llm) {
        this.id = `agent-${type}-${uuidv42().slice(0, 8)}`;
        this.name = name;
        this.type = type;
        this.config = config;
        this.llm = llm;
      }
      setApproveCallback(callback) {
        this.approveCallback = callback;
      }
      getFullSystemPrompt() {
        let prompt = this.getSystemPrompt();
        if (this.useTools) {
          prompt += "\n\n" + getToolsDescription();
        }
        const contextSummary = sharedContext.buildContextSummary(this.id);
        if (contextSummary.length > 50) {
          prompt += "\n\n" + contextSummary;
        }
        return prompt;
      }
      async processTask(taskDescription) {
        const task = {
          id: `task-${uuidv42().slice(0, 8)}`,
          description: taskDescription,
          status: "in_progress",
          assignedAt: /* @__PURE__ */ new Date()
        };
        this.currentTask = task;
        this.tasks.push(task);
        this.setStatus("working");
        sharedContext.addEntry({
          agentId: this.id,
          agentName: this.name,
          type: "task",
          content: taskDescription
        });
        try {
          const messages = [
            { role: "system", content: this.getFullSystemPrompt() },
            ...this.conversationHistory,
            { role: "user", content: taskDescription }
          ];
          const response = await this.llm.chat(
            this.config.provider,
            this.config.model,
            messages,
            {
              temperature: this.config.temperature,
              max_tokens: this.config.max_tokens
            }
          );
          this.tokenUsage += response.usage?.total_tokens || 0;
          let mainContent = response.content;
          let toolSummary = "";
          let toolResultsForUser = "";
          if (this.useTools) {
            const toolCalls = parseToolCalls(response.content);
            if (toolCalls.length > 0) {
              const results = await executeToolCalls(toolCalls, this.approveCallback);
              toolResultsForUser = formatToolResultsForUser(results);
              const toolResultsForAgent = formatToolResultsForAgent(results);
              const summaryMessages = [
                { role: "system", content: "\u4F60\u662F\u52A9\u624B\uFF0C\u8BF7\u6839\u636E\u5DE5\u5177\u6267\u884C\u7ED3\u679C\u7528\u7B80\u6D01\u7684\u4E2D\u6587\u603B\u7ED3\u3002\u4E0D\u8981\u91CD\u590D\u5DE5\u5177\u539F\u59CB\u8F93\u51FA\uFF0C\u53EA\u8BF4\u7ED3\u8BBA\u3002" },
                { role: "user", content: `\u7528\u6237\u8BF7\u6C42: ${taskDescription}

${toolResultsForAgent}` }
              ];
              const summaryResponse = await this.llm.chat(
                this.config.provider,
                this.config.model,
                summaryMessages,
                { temperature: 0.3, max_tokens: 1e3 }
              );
              toolSummary = summaryResponse.content;
              mainContent = mainContent.replace(/```tool_call[\s\S]*?```/g, "").trim();
            }
          }
          this.conversationHistory.push(
            { role: "user", content: taskDescription },
            { role: "assistant", content: mainContent }
          );
          task.status = "completed";
          task.result = mainContent;
          task.completedAt = /* @__PURE__ */ new Date();
          this.currentTask = void 0;
          this.setStatus("idle");
          sharedContext.addEntry({
            agentId: this.id,
            agentName: this.name,
            type: "result",
            content: toolSummary || mainContent
          });
          return {
            content: mainContent,
            toolResults: toolResultsForUser,
            toolSummary
          };
        } catch (error) {
          task.status = "failed";
          task.result = error.message;
          this.currentTask = void 0;
          this.setStatus("error");
          throw error;
        }
      }
      getState() {
        return {
          id: this.id,
          name: this.name,
          type: this.type,
          status: this.status,
          currentTask: this.currentTask,
          tasks: this.tasks,
          tokenUsage: this.tokenUsage,
          messageCount: this.conversationHistory.length
        };
      }
      setStatus(status) {
        this.status = status;
      }
      reset() {
        this.conversationHistory = [];
        this.currentTask = void 0;
        this.tasks = [];
        this.tokenUsage = 0;
        this.setStatus("idle");
      }
      stop() {
        this.setStatus("stopped");
      }
    };
  }
});

// src/agents/planner.ts
var PlannerAgent;
var init_planner = __esm({
  "src/agents/planner.ts"() {
    "use strict";
    init_base_agent();
    PlannerAgent = class extends BaseAgent {
      constructor(config, llm) {
        super("Planner", "planner", config, llm);
      }
      getSystemPrompt() {
        return this.config.system_prompt;
      }
      getCapabilities() {
        return ["task_decomposition", "planning", "coordination"];
      }
      async planTask(userRequest) {
        const response = await this.processTask(userRequest);
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch {
        }
        return {
          tasks: [{
            id: "task-1",
            description: userRequest,
            assignee: "coder",
            dependencies: [],
            priority: "high"
          }],
          summary: response
        };
      }
    };
  }
});

// src/agents/coder.ts
var CoderAgent;
var init_coder = __esm({
  "src/agents/coder.ts"() {
    "use strict";
    init_base_agent();
    CoderAgent = class extends BaseAgent {
      constructor(config, llm) {
        super("Coder", "coder", config, llm);
      }
      getSystemPrompt() {
        return this.config.system_prompt;
      }
      getCapabilities() {
        return ["coding", "implementation", "debugging", "refactoring"];
      }
      async writeCode(taskDescription, onToken) {
        if (onToken) {
          return this.streamTask(taskDescription, onToken);
        }
        return this.processTask(taskDescription);
      }
    };
  }
});

// src/agents/reviewer.ts
var ReviewerAgent;
var init_reviewer = __esm({
  "src/agents/reviewer.ts"() {
    "use strict";
    init_base_agent();
    ReviewerAgent = class extends BaseAgent {
      constructor(config, llm) {
        super("Reviewer", "reviewer", config, llm);
      }
      getSystemPrompt() {
        return this.config.system_prompt;
      }
      getCapabilities() {
        return ["code_review", "quality_assurance", "security_audit"];
      }
      async reviewCode(code, context) {
        const prompt = context ? `\u8BF7\u5BA1\u67E5\u4EE5\u4E0B\u4EE3\u7801\uFF0C\u4E0A\u4E0B\u6587\u4FE1\u606F\uFF1A${context}

\`\`\`
${code}
\`\`\`` : `\u8BF7\u5BA1\u67E5\u4EE5\u4E0B\u4EE3\u7801\uFF1A

\`\`\`
${code}
\`\`\``;
        return this.processTask(prompt);
      }
    };
  }
});

// src/agents/researcher.ts
var ResearcherAgent;
var init_researcher = __esm({
  "src/agents/researcher.ts"() {
    "use strict";
    init_base_agent();
    ResearcherAgent = class extends BaseAgent {
      constructor(config, llm) {
        super("Researcher", "researcher", config, llm);
      }
      getSystemPrompt() {
        return this.config.system_prompt;
      }
      getCapabilities() {
        return ["research", "analysis", "comparison", "documentation"];
      }
      async research(topic) {
        return this.processTask(`\u8BF7\u7814\u7A76\u4EE5\u4E0B\u4E3B\u9898\u5E76\u63D0\u4F9B\u8BE6\u7EC6\u62A5\u544A\uFF1A
${topic}`);
      }
    };
  }
});

// src/agents/custom.ts
var CustomAgent;
var init_custom = __esm({
  "src/agents/custom.ts"() {
    "use strict";
    init_base_agent();
    CustomAgent = class extends BaseAgent {
      capabilities;
      constructor(name, config, llm, capabilities) {
        super(name, `custom-${name.toLowerCase()}`, config, llm);
        this.capabilities = capabilities || ["general"];
      }
      getSystemPrompt() {
        return this.config.system_prompt;
      }
      getCapabilities() {
        return this.capabilities;
      }
    };
  }
});

// src/agents/index.ts
var init_agents = __esm({
  "src/agents/index.ts"() {
    "use strict";
    init_base_agent();
    init_planner();
    init_coder();
    init_reviewer();
    init_researcher();
    init_custom();
  }
});

// src/core/message-bus.ts
import { EventEmitter as EventEmitter2 } from "events";
var MessageBus, messageBus;
var init_message_bus = __esm({
  "src/core/message-bus.ts"() {
    "use strict";
    MessageBus = class extends EventEmitter2 {
      history = [];
      maxHistory;
      constructor(maxHistory = 1e3) {
        super();
        this.maxHistory = maxHistory;
      }
      publish(message) {
        const fullMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: /* @__PURE__ */ new Date()
        };
        this.history.push(fullMessage);
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }
        this.emit("message", fullMessage);
        this.emit(fullMessage.type, fullMessage);
        if (fullMessage.to) {
          this.emit(`to:${fullMessage.to}`, fullMessage);
        }
        return fullMessage;
      }
      subscribe(handler) {
        this.on("message", handler);
        return () => this.off("message", handler);
      }
      subscribeToType(type, handler) {
        this.on(type, handler);
        return () => this.off(type, handler);
      }
      subscribeToAgent(agentId, handler) {
        this.on(`to:${agentId}`, handler);
        return () => this.off(`to:${agentId}`, handler);
      }
      getHistory(limit) {
        if (limit) {
          return this.history.slice(-limit);
        }
        return [...this.history];
      }
      clearHistory() {
        this.history = [];
      }
    };
    messageBus = new MessageBus();
  }
});

// src/core/orchestrator.ts
import { EventEmitter as EventEmitter3 } from "events";
var Orchestrator;
var init_orchestrator = __esm({
  "src/core/orchestrator.ts"() {
    "use strict";
    init_agents();
    init_message_bus();
    init_shared_context();
    Orchestrator = class extends EventEmitter3 {
      agents = /* @__PURE__ */ new Map();
      planner;
      llm;
      config;
      status = "idle";
      currentPlan;
      completedTasks = 0;
      totalTasks = 0;
      approveCallback;
      aborted = false;
      constructor(config, llm) {
        super();
        this.config = config;
        this.llm = llm;
        this.initializeAgents();
      }
      setApproveCallback(callback) {
        this.approveCallback = callback;
        for (const agent of this.agents.values()) {
          agent.setApproveCallback(callback);
        }
      }
      initializeAgents() {
        const plannerConfig = this.config.agents["planner"];
        if (plannerConfig) {
          this.planner = new PlannerAgent(plannerConfig, this.llm);
          this.agents.set(this.planner.id, this.planner);
        }
        const coderConfig = this.config.agents["coder"];
        if (coderConfig) {
          const coder = new CoderAgent(coderConfig, this.llm);
          this.agents.set(coder.id, coder);
        }
        const reviewerConfig = this.config.agents["reviewer"];
        if (reviewerConfig) {
          const reviewer = new ReviewerAgent(reviewerConfig, this.llm);
          this.agents.set(reviewer.id, reviewer);
        }
        const researcherConfig = this.config.agents["researcher"];
        if (researcherConfig) {
          const researcher = new ResearcherAgent(researcherConfig, this.llm);
          this.agents.set(researcher.id, researcher);
        }
        for (const [name, agentConfig] of Object.entries(this.config.agents)) {
          if (!["planner", "coder", "reviewer", "researcher"].includes(name)) {
            const customAgent = new CustomAgent(name, agentConfig, this.llm);
            this.agents.set(customAgent.id, customAgent);
          }
        }
      }
      abort() {
        this.aborted = true;
        this.setStatus("idle");
      }
      async processUserInput(input) {
        this.aborted = false;
        messageBus.publish({
          type: "user_input",
          from: "user",
          content: input
        });
        this.setStatus("routing");
        const category = this.categorizeInput(input);
        switch (category) {
          case "simple_question":
            await this.handleSimpleQuestion(input);
            break;
          case "direct_task":
            await this.handleDirectTask(input);
            break;
          case "complex_task":
            await this.handleComplexTask(input);
            break;
          case "discussion":
            await this.handleDiscussion(input);
            break;
        }
      }
      categorizeInput(input) {
        const lower = input.toLowerCase().trim();
        const simplePatterns = [
          /^你是/,
          /^你能/,
          /^介绍一下/,
          /^what/i,
          /^who/i,
          /^help$/i,
          /^帮助$/,
          /^你好/,
          /^hello/i,
          /^hi$/i,
          /^什么意思/,
          /^什么是/,
          /^怎么理解/
        ];
        if (input.length < 50 && simplePatterns.some((p) => p.test(lower))) {
          return "simple_question";
        }
        const discussionPatterns = [
          /你觉得/,
          /你认为/,
          /怎么看/,
          /有什么看法/,
          /建议/,
          /推荐/,
          /比较.*和/,
          /优缺点/
        ];
        if (discussionPatterns.some((p) => p.test(lower))) {
          return "discussion";
        }
        if (input.length > 200 || /首先.*然后.*最后/.test(lower) || /创建.*项目.*配置/.test(lower)) {
          return "complex_task";
        }
        return "direct_task";
      }
      async handleSimpleQuestion(input) {
        this.setStatus("executing");
        const agent = this.findBestAgent("answer");
        if (!agent) return;
        try {
          const result = await agent.processTask(input);
          if (this.aborted) return;
          this.emit("response", result.content);
        } catch (error) {
          if (!this.aborted) this.emit("error", error);
        }
        if (!this.aborted) this.setStatus("idle");
      }
      async handleDirectTask(input) {
        this.setStatus("executing");
        const agent = this.findBestAgentForTask(input);
        if (!agent) return;
        try {
          const result = await agent.processTask(input);
          if (this.aborted) return;
          let output = result.content;
          if (result.toolResults) {
            output += "\n\n---\n" + result.toolResults;
          }
          if (result.toolSummary) {
            output += "\n\n**\u603B\u7ED3:** " + result.toolSummary;
          }
          this.emit("response", output);
        } catch (error) {
          if (!this.aborted) this.emit("error", error);
        }
        if (!this.aborted) this.setStatus("idle");
      }
      async handleComplexTask(input) {
        this.setStatus("planning");
        try {
          const plan = await this.planner.planTask(input);
          if (this.aborted) return;
          this.currentPlan = plan;
          this.totalTasks = plan.tasks.length;
          this.completedTasks = 0;
          this.setStatus("executing");
          const results = await this.executePlan(plan);
          if (this.aborted) return;
          this.setStatus("summarizing");
          const summary = this.generateSummary(plan, results);
          this.emit("response", summary);
        } catch (error) {
          if (!this.aborted) this.emit("error", error);
        }
        if (!this.aborted) this.setStatus("idle");
      }
      async handleDiscussion(input) {
        this.setStatus("executing");
        const responses = [];
        const activeAgents = Array.from(this.agents.values()).filter((a) => a.type !== "planner").slice(0, 2);
        for (const agent of activeAgents) {
          if (this.aborted) break;
          try {
            const result = await agent.processTask(`\u7528\u6237\u63D0\u95EE: "${input}"
\u8BF7\u4ECE\u4F60\u7684\u4E13\u4E1A\u89D2\u5EA6\u56DE\u7B54\u3002`);
            if (this.aborted) break;
            responses.push(`**${agent.name}**: ${result.content}`);
            this.completedTasks++;
          } catch {
          }
        }
        if (!this.aborted) {
          this.emit("response", responses.join("\n\n---\n\n"));
          this.setStatus("idle");
        }
      }
      findBestAgentForTask(input) {
        const lower = input.toLowerCase();
        if (/代码|编程|函数|bug|修复|实现|写|创建|文件|脚本/.test(lower)) {
          return this.findAgentByType("coder");
        }
        if (/审查|review|检查|优化/.test(lower)) {
          return this.findAgentByType("reviewer");
        }
        if (/调研|研究|分析|对比|选型/.test(lower)) {
          return this.findAgentByType("researcher");
        }
        return this.findAgentByType("coder") || this.findBestAgent("general");
      }
      findAgentByType(type) {
        for (const agent of this.agents.values()) {
          if (agent.type === type) return agent;
        }
        return void 0;
      }
      findBestAgent(purpose) {
        return this.findAgentByType("coder") || this.findAgentByType("researcher") || Array.from(this.agents.values())[0];
      }
      async executePlan(plan) {
        const executed = /* @__PURE__ */ new Set();
        const allResults = [];
        while (executed.size < plan.tasks.length) {
          const readyTasks = plan.tasks.filter(
            (task) => !executed.has(task.id) && task.dependencies.every((dep) => executed.has(dep))
          );
          if (readyTasks.length === 0) break;
          for (const task of readyTasks) {
            const agent = this.findAgentByType(task.assignee) || this.findBestAgent("general");
            if (!agent) {
              executed.add(task.id);
              continue;
            }
            try {
              const contextInfo = sharedContext.buildContextSummary(agent.id);
              const taskWithContext = contextInfo.length > 50 ? `${task.description}

${contextInfo}` : task.description;
              const result = await agent.processTask(taskWithContext);
              allResults.push(result);
              executed.add(task.id);
              this.completedTasks++;
              this.emit("task_complete", task);
            } catch {
              executed.add(task.id);
            }
          }
        }
        return allResults;
      }
      generateSummary(plan, results) {
        const agentStates = Array.from(this.agents.values()).map((a) => a.getState());
        const totalTokens = agentStates.reduce((sum, s) => sum + s.tokenUsage, 0);
        let output = `## \u4EFB\u52A1\u5B8C\u6210

`;
        output += `- \u4EFB\u52A1\u6570: ${this.totalTasks} | Token: ${totalTokens}

`;
        for (const result of results) {
          if (result.toolSummary) {
            output += result.toolSummary + "\n\n";
          } else if (result.content) {
            output += result.content.slice(0, 300) + "\n\n";
          }
        }
        const foldedResults = results.filter((r) => r.toolResults);
        if (foldedResults.length > 0) {
          output += "---\n**\u5DE5\u5177\u6267\u884C\u8BE6\u60C5 (\u6298\u53E0):**\n";
          for (const r of foldedResults) {
            output += r.toolResults + "\n";
          }
        }
        return output;
      }
      setStatus(status) {
        this.status = status;
        this.emit("status_change", status);
      }
      getState() {
        return {
          status: this.status,
          agents: Array.from(this.agents.values()).map((a) => a.getState()),
          currentPlan: this.currentPlan,
          completedTasks: this.completedTasks,
          totalTasks: this.totalTasks
        };
      }
      getAgent(id) {
        return this.agents.get(id);
      }
      getAllAgents() {
        return Array.from(this.agents.values());
      }
      resetAllAgents() {
        for (const agent of this.agents.values()) {
          agent.reset();
        }
        sharedContext.clear();
        this.currentPlan = void 0;
        this.completedTasks = 0;
        this.totalTasks = 0;
        this.setStatus("idle");
      }
    };
  }
});

// src/llm/client.ts
import OpenAI2 from "openai";
var LLMClient;
var init_client = __esm({
  "src/llm/client.ts"() {
    "use strict";
    LLMClient = class {
      clients = /* @__PURE__ */ new Map();
      providers = /* @__PURE__ */ new Map();
      constructor(providers) {
        for (const provider of providers) {
          this.providers.set(provider.name, provider);
          this.clients.set(provider.name, new OpenAI2({
            apiKey: provider.api_key,
            baseURL: provider.base_url
          }));
        }
      }
      getClient(providerName) {
        const client = this.clients.get(providerName);
        if (!client) {
          throw new Error(`\u63D0\u4F9B\u5546 "${providerName}" \u672A\u914D\u7F6E\u3002\u8BF7\u5728 ~/.openagents/config.yaml \u4E2D\u6DFB\u52A0\u914D\u7F6E\u3002`);
        }
        return client;
      }
      getProvider(providerName) {
        const provider = this.providers.get(providerName);
        if (!provider) {
          throw new Error(`\u63D0\u4F9B\u5546 "${providerName}" \u672A\u914D\u7F6E\u3002`);
        }
        return provider;
      }
      async chat(providerName, model, messages, options) {
        const client = this.getClient(providerName);
        const response = await client.chat.completions.create({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.max_tokens
        });
        const choice = response.choices[0];
        return {
          content: choice.message?.content || "",
          usage: response.usage ? {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens
          } : void 0
        };
      }
      async streamChat(providerName, model, messages, callbacks, options) {
        const client = this.getClient(providerName);
        try {
          const stream = await client.chat.completions.create({
            model,
            messages,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.max_tokens,
            stream: true
          });
          let fullContent = "";
          let usage;
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              fullContent += delta.content;
              callbacks.onToken?.(delta.content);
            }
            if (chunk.usage) {
              usage = {
                prompt_tokens: chunk.usage.prompt_tokens,
                completion_tokens: chunk.usage.completion_tokens,
                total_tokens: chunk.usage.total_tokens
              };
            }
          }
          callbacks.onComplete?.({
            content: fullContent,
            usage
          });
        } catch (error) {
          callbacks.onError?.(error);
        }
      }
      listProviders() {
        return Array.from(this.providers.keys());
      }
      listModels(providerName) {
        const provider = this.providers.get(providerName);
        if (!provider) return [];
        return [provider.default_model || "default"];
      }
    };
  }
});

// src/tui/screen.ts
var screen_exports = {};
__export(screen_exports, {
  Screen: () => Screen
});
import chalk from "chalk";
var Screen;
var init_screen = __esm({
  "src/tui/screen.ts"() {
    "use strict";
    init_orchestrator();
    init_session();
    init_client();
    Screen = class {
      orchestrator;
      session;
      messages = [];
      agents = [];
      isLoading = false;
      inputBuffer = "";
      cursorPos = 0;
      scrollOffset = 0;
      agentPanelWidth = 20;
      lastRender = "";
      // 弹窗状态
      modal = null;
      modalResolve;
      modalData = null;
      constructor(options) {
        const llm = new LLMClient(options.config.providers);
        this.orchestrator = new Orchestrator(options.config, llm);
        this.orchestrator.setApproveCallback((tool, params) => this.showApproval(tool, params));
        if (options.resumeSessionId) {
          const loaded = Session.load(options.resumeSessionId);
          this.session = loaded || new Session(options.sessionName);
          if (loaded) this.messages = loaded.getMessages();
        } else {
          this.session = new Session(options.sessionName);
        }
        this.initTerminal();
        this.bindKeys();
        this.bindOrchestrator();
        this.render();
      }
      // ─── 终端初始化 ─────────────────────────────────────
      initTerminal() {
        process.stdout.write("\x1B[?1049h");
        process.stdout.write("\x1B[?25l");
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        process.stdin.setEncoding("utf-8");
        process.stdout.on("resize", () => this.render());
      }
      restoreTerminal() {
        process.stdout.write("\x1B[?25h");
        process.stdout.write("\x1B[?1049l");
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
      }
      get cols() {
        return process.stdout.columns || 120;
      }
      get rows() {
        return process.stdout.rows || 30;
      }
      // ─── 按键 ───────────────────────────────────────────
      bindKeys() {
        process.stdin.on("data", (data) => {
          this.onKey(data);
        });
        setInterval(() => {
          const fresh = this.orchestrator.getState().agents;
          if (JSON.stringify(fresh) !== JSON.stringify(this.agents)) {
            this.agents = fresh;
            this.render();
          }
        }, 2e3);
      }
      onKey(data) {
        if (data === "") {
          this.restoreTerminal();
          process.exit(0);
        }
        if (this.modal === "approval") {
          this.onApprovalKey(data);
          return;
        }
        if (this.modal === "session") {
          this.onSessionKey(data);
          return;
        }
        if (data === "\x1B") {
          if (this.isLoading) {
            this.orchestrator.abort();
            this.isLoading = false;
            this.addMsg("system", "system", "\u5DF2\u53D6\u6D88");
            this.render();
          }
          return;
        }
        if (data === "\x1B[A") {
          this.scroll(-1);
          return;
        }
        if (data === "\x1B[B") {
          this.scroll(1);
          return;
        }
        if (data === "\x1B[5~") {
          this.scroll(-10);
          return;
        }
        if (data === "\x1B[6~") {
          this.scroll(10);
          return;
        }
        if (data === "\r" || data === "\n") {
          if (this.inputBuffer.trim() && !this.isLoading) {
            const text = this.inputBuffer;
            this.inputBuffer = "";
            this.cursorPos = 0;
            this.submitInput(text);
          }
          return;
        }
        if (data === "\x7F" || data === "\b") {
          if (this.cursorPos > 0) {
            this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos - 1) + this.inputBuffer.slice(this.cursorPos);
            this.cursorPos--;
            this.render();
          }
          return;
        }
        if (data === "	") return;
        if (data.startsWith("\x1B[")) return;
        if (data.charCodeAt(0) < 32) return;
        this.inputBuffer = this.inputBuffer.slice(0, this.cursorPos) + data + this.inputBuffer.slice(this.cursorPos);
        this.cursorPos += data.length;
        this.render();
      }
      scroll(delta) {
        const maxOffset = Math.max(0, this.messages.length - 5);
        this.scrollOffset = Math.max(0, Math.min(maxOffset, this.scrollOffset - delta));
        this.render();
      }
      // ─── 弹窗按键 ─────────────────────────────────────
      onApprovalKey(data) {
        if (data === "y" || data === "Y") {
          this.closeModal();
          this.modalResolve?.(true);
        } else if (data === "n" || data === "N" || data === "\x1B") {
          this.closeModal();
          this.modalResolve?.(false);
        }
      }
      onSessionKey(data) {
        if (data === "q" || data === "\x1B") {
          this.closeModal();
          return;
        }
        if (data >= "0" && data <= "9") {
          this.modalData.buffer = (this.modalData.buffer || "") + data;
          this.render();
          return;
        }
        if (data === "\r" || data === "\n") {
          const sessions = Session.listSessions();
          const idx = parseInt(this.modalData.buffer || "0") - 1;
          if (idx >= 0 && idx < sessions.length) {
            const loaded = Session.load(sessions[idx].id);
            if (loaded) {
              this.session = loaded;
              this.messages = loaded.getMessages();
              this.scrollOffset = 0;
            }
          }
          this.closeModal();
          this.render();
        }
      }
      closeModal() {
        this.modal = null;
        this.modalData = null;
        this.modalResolve = void 0;
      }
      // ─── 消息处理 ─────────────────────────────────────
      async submitInput(input) {
        if (input.startsWith("/")) {
          this.handleCommand(input);
          return;
        }
        this.isLoading = true;
        this.addMsg("user_input", "user", input);
        this.scrollOffset = 0;
        this.render();
        try {
          await this.orchestrator.processUserInput(input);
        } catch (error) {
          if (error.name !== "AbortError") {
            this.addMsg("system", "system", `\u9519\u8BEF: ${error.message}`);
          }
          this.isLoading = false;
        }
        this.session.save();
        this.render();
      }
      handleCommand(input) {
        const cmd = input.slice(1).trim().split(" ")[0];
        switch (cmd) {
          case "quit":
          case "exit":
            this.restoreTerminal();
            process.exit(0);
            break;
          case "clear":
            this.messages = [];
            this.scrollOffset = 0;
            break;
          case "reset":
            this.orchestrator.resetAllAgents();
            this.messages = [];
            this.scrollOffset = 0;
            break;
          case "save":
            this.session.save();
            this.addMsg("system", "system", "\u4F1A\u8BDD\u5DF2\u4FDD\u5B58");
            break;
          case "sessions":
            this.modal = "session";
            this.modalData = { buffer: "" };
            this.render();
            return;
          case "help":
            this.addMsg("system", "system", [
              "/quit, /exit  \u9000\u51FA",
              "/clear  \u6E05\u5C4F",
              "/reset  \u91CD\u7F6E",
              "/save  \u4FDD\u5B58",
              "/sessions  \u5386\u53F2\u4F1A\u8BDD",
              "/help  \u5E2E\u52A9",
              "",
              "\u2191\u2193 \u6EDA\u52A8 | PageUp/Down \u7FFB\u9875 | ESC \u53D6\u6D88 | Ctrl+C \u9000\u51FA"
            ].join("\n"));
            break;
          default:
            this.addMsg("system", "system", `\u672A\u77E5\u547D\u4EE4: ${cmd}`);
        }
        this.inputBuffer = "";
        this.cursorPos = 0;
        this.render();
      }
      addMsg(type, from, content) {
        this.messages.push({
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type,
          from,
          content,
          timestamp: /* @__PURE__ */ new Date()
        });
        this.session.addMessage(this.messages[this.messages.length - 1]);
      }
      // ─── Orchestrator ──────────────────────────────────
      bindOrchestrator() {
        this.orchestrator.on("response", (text) => {
          this.addMsg("agent_message", "orchestrator", text);
          this.isLoading = false;
          this.scrollOffset = 0;
          this.render();
        });
        this.orchestrator.on("error", (err) => {
          this.addMsg("system", "system", `\u9519\u8BEF: ${err.message}`);
          this.isLoading = false;
          this.render();
        });
        this.orchestrator.on("status_change", () => {
          this.agents = this.orchestrator.getState().agents;
          this.render();
        });
      }
      // ─── 渲染（ANSI 全量刷新，无闪烁）──────────────
      render() {
        const w = this.cols;
        const h = this.rows;
        const agW = this.agentPanelWidth;
        const chatW = w - agW;
        const lines = [];
        const statusTag = this.isLoading ? chalk.yellow("\u27F3 \u5904\u7406\u4E2D") : chalk.green("\u5C31\u7EEA");
        const statusText = ` ${chalk.bold("OpenAgents")} \u2502 ${this.session.getName()} \u2502 ${statusTag} \u2502 ${this.messages.length}\u6761 \u2502 \u2191\u2193\u6EDA\u52A8 \u2502 /help`;
        lines.push(chalk.bgBlue.white(this.padLine(statusText, w)));
        const chatAreaH = h - 4;
        const chatLines = this.buildChatLines(chatW - 2);
        const agentLines = this.buildAgentLines(agW - 2);
        const totalChatLines = chatLines.length;
        const visibleChatStart = Math.max(0, totalChatLines - chatAreaH + this.scrollOffset);
        const visibleChat = chatLines.slice(visibleChatStart, visibleChatStart + chatAreaH);
        lines.push(
          chalk.cyan("\u250C" + "\u2500".repeat(chatW - 2) + "\u2510") + chalk.gray("\u250C" + "\u2500".repeat(agW - 2) + "\u2510")
        );
        for (let i = 0; i < chatAreaH - 2; i++) {
          const chatLine = visibleChat[i] || "";
          const agentLine = agentLines[i] || "";
          lines.push(
            chalk.cyan("\u2502") + this.padLine(chatLine, chatW - 2) + chalk.cyan("\u2502") + chalk.gray("\u2502") + this.padLine(agentLine, agW - 2) + chalk.gray("\u2502")
          );
        }
        lines.push(
          chalk.cyan("\u2514" + "\u2500".repeat(chatW - 2) + "\u2518") + chalk.gray("\u2514" + "\u2500".repeat(agW - 2) + "\u2518")
        );
        const inputW = w - 2;
        const inputLabel = this.isLoading ? chalk.yellow("\u27F3 ") : chalk.green("> ");
        const cursor = chalk.inverse(" ");
        const inputContent = inputLabel + this.inputBuffer + cursor;
        const padding = " ".repeat(Math.max(0, inputW - this.visibleLength(inputContent) - 1));
        lines.push(chalk.cyan("\u250C" + "\u2500".repeat(inputW) + "\u2510"));
        lines.push(chalk.cyan("\u2502") + " " + inputContent + padding + chalk.cyan("\u2502"));
        lines.push(chalk.cyan("\u2514" + "\u2500".repeat(inputW) + "\u2518"));
        if (this.modal === "approval") {
          this.overlayApproval(lines, w, h);
        } else if (this.modal === "session") {
          this.overlaySession(lines, w, h);
        }
        while (lines.length < h) lines.push(" ".repeat(w));
        let output = "\x1B[H";
        for (const line of lines.slice(0, h)) {
          output += line + "\x1B[K\n";
        }
        if (output !== this.lastRender) {
          process.stdout.write(output);
          this.lastRender = output;
        }
      }
      /** 聊天区内容行（纯文本+chalk颜色） */
      buildChatLines(maxWidth) {
        const lines = [];
        for (const msg of this.messages) {
          const t = msg.timestamp.toLocaleTimeString();
          let pre;
          switch (msg.type) {
            case "user_input":
              pre = chalk.green.bold("[You]");
              break;
            case "agent_message":
              pre = chalk.yellow.bold("[Agent]");
              break;
            case "system":
              pre = chalk.magenta.bold("[!]");
              break;
            default:
              pre = chalk.white(`[${msg.from}]`);
          }
          lines.push(`${pre} ${chalk.gray(t)}`);
          for (const l of msg.content.split("\n")) {
            if (this.visibleLength(l) > maxWidth - 2) {
              lines.push("  " + this.wrapText(l, maxWidth - 2));
            } else {
              lines.push("  " + l);
            }
          }
          lines.push("");
        }
        return lines;
      }
      /** Agent 面板内容行 */
      buildAgentLines(maxWidth) {
        const lines = [];
        for (const a of this.agents) {
          let icon;
          switch (a.status) {
            case "idle":
              icon = chalk.gray("\u25CB");
              break;
            case "working":
              icon = chalk.green("\u25CF");
              break;
            case "thinking":
              icon = chalk.yellow("\u25D0");
              break;
            case "error":
              icon = chalk.red("\u2717");
              break;
            default:
              icon = "?";
          }
          const name = (a.name || a.type).slice(0, 10);
          const tk = a.tokenUsage > 0 ? chalk.gray(` ${a.tokenUsage}tk`) : "";
          lines.push(`${icon} ${name}${tk}`);
          if (a.currentTask) {
            const desc = a.currentTask.description.slice(0, maxWidth - 4);
            lines.push(chalk.yellow(`  ${desc}`));
          }
        }
        if (lines.length === 0) lines.push(chalk.gray("\u7B49\u5F85\u542F\u52A8..."));
        return lines;
      }
      // ─── 弹窗渲染 ─────────────────────────────────────
      overlayApproval(lines, w, h) {
        const cmd = this.modalData?.command || "";
        const reason = this.modalData?.reason || "";
        const boxW = 48;
        const boxH = reason ? 9 : 7;
        const startRow = Math.floor((h - boxH) / 2);
        const startCol = Math.floor((w - boxW) / 2);
        const boxLines = [
          chalk.yellow("\u250C" + "\u2500".repeat(boxW - 2) + "\u2510"),
          chalk.yellow("\u2502") + this.padLine(chalk.yellow.bold(" \u26A0 \u9700\u8981\u5BA1\u6279 "), boxW - 2) + chalk.yellow("\u2502"),
          chalk.yellow("\u2502") + this.padLine(`  \u5DE5\u5177: ${this.modalData?.tool || ""}`, boxW - 2) + chalk.yellow("\u2502"),
          chalk.yellow("\u2502") + this.padLine(`  \u547D\u4EE4: ${chalk.red(cmd)}`, boxW - 2) + chalk.yellow("\u2502")
        ];
        if (reason) boxLines.push(chalk.yellow("\u2502") + this.padLine(`  \u539F\u56E0: ${reason}`, boxW - 2) + chalk.yellow("\u2502"));
        boxLines.push(chalk.yellow("\u2502") + " ".repeat(boxW - 2) + chalk.yellow("\u2502"));
        boxLines.push(chalk.yellow("\u2502") + this.padLine("  Y \u6267\u884C | N \u62D2\u7EDD", boxW - 2) + chalk.yellow("\u2502"));
        boxLines.push(chalk.yellow("\u2514" + "\u2500".repeat(boxW - 2) + "\u2518"));
        for (let i = 0; i < boxLines.length; i++) {
          const row = startRow + i;
          if (row >= 1 && row < lines.length - 3) {
            lines[row] = this.overlayString(lines[row], boxLines[i], startCol);
          }
        }
      }
      overlaySession(lines, w, h) {
        const sessions = Session.listSessions();
        const boxW = 50;
        const boxH = sessions.length + 6;
        const startRow = Math.floor((h - boxH) / 2);
        const startCol = Math.floor((w - boxW) / 2);
        const boxLines = [
          chalk.cyan("\u250C" + "\u2500".repeat(boxW - 2) + "\u2510"),
          chalk.cyan("\u2502") + this.padLine(chalk.bold(" \u5386\u53F2\u4F1A\u8BDD (\u8F93\u5165\u7F16\u53F7, q\u53D6\u6D88) "), boxW - 2) + chalk.cyan("\u2502")
        ];
        for (let i = 0; i < sessions.length; i++) {
          const s = sessions[i];
          const d = new Date(s.updatedAt).toLocaleString();
          const entry = `  ${i + 1}. ${s.name} (${s.messages.length}\u6761)`;
          boxLines.push(chalk.cyan("\u2502") + this.padLine(entry, boxW - 2) + chalk.cyan("\u2502"));
        }
        boxLines.push(chalk.cyan("\u2502") + " ".repeat(boxW - 2) + chalk.cyan("\u2502"));
        const buffer = this.modalData?.buffer || "";
        boxLines.push(chalk.cyan("\u2502") + this.padLine(`  \u8F93\u5165: ${buffer}_`, boxW - 2) + chalk.cyan("\u2502"));
        boxLines.push(chalk.cyan("\u2514" + "\u2500".repeat(boxW - 2) + "\u2518"));
        for (let i = 0; i < boxLines.length; i++) {
          const row = startRow + i;
          if (row >= 1 && row < lines.length - 3) {
            lines[row] = this.overlayString(lines[row], boxLines[i], startCol);
          }
        }
      }
      // ─── 工具函数 ─────────────────────────────────────
      /** 填充行到指定宽度 */
      padLine(text, width) {
        const vl = this.visibleLength(text);
        if (vl >= width) return text.slice(0, width);
        return text + " ".repeat(width - vl);
      }
      /** 计算 chalk 格式化后的可见长度 */
      visibleLength(text) {
        return text.replace(/\x1b\[[0-9;]*m/g, "").length;
      }
      /** 简单换行 */
      wrapText(text, maxWidth) {
        if (this.visibleLength(text) <= maxWidth) return text;
        return text.slice(0, maxWidth) + "\u2026";
      }
      /** 在原始行的指定位置覆盖弹窗行 */
      overlayString(base, overlay, col) {
        const baseVisible = this.visibleLength(base);
        const overlayVisible = this.visibleLength(overlay);
        return overlay;
      }
      showApproval(tool, params) {
        return new Promise((resolve2) => {
          this.modal = "approval";
          this.modalResolve = resolve2;
          this.modalData = { tool, command: params.command || "", reason: params.reason || "" };
          this.render();
        });
      }
    };
  }
});

// src/index.ts
init_loader();

// src/cli/commands.ts
init_loader();
init_session();
import { Command } from "commander";

// src/cli/setup.ts
init_loader();
import * as readline from "readline";
import OpenAI from "openai";
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
function ask(question) {
  return new Promise((resolve2) => {
    rl.question(question, (answer) => {
      resolve2(answer.trim());
    });
  });
}
function askPassword(question) {
  return new Promise((resolve2) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    let password = "";
    const onData = (char) => {
      const c = char.toString();
      if (c === "\n" || c === "\r") {
        if (stdin.setRawMode) {
          stdin.setRawMode(wasRaw ?? false);
        }
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve2(password);
      } else if (c === "") {
        process.exit();
      } else if (c === "\x7F" || c === "\b") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        password += c;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}
async function fetchModels(baseUrl, apiKey) {
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl
    });
    const response = await client.models.list();
    const models = response.data.map((m) => m.id).sort();
    return models;
  } catch (error) {
    console.log(`
\u83B7\u53D6\u6A21\u578B\u5217\u8868\u5931\u8D25: ${error.message}`);
    return [];
  }
}
async function selectFromList(items, prompt, allowMultiple = false) {
  console.log(`
${prompt}`);
  items.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item}`);
  });
  if (allowMultiple) {
    const answer = await ask("\n\u8F93\u5165\u7F16\u53F7\uFF08\u591A\u4E2A\u7528\u9017\u53F7\u5206\u9694\uFF0C\u5982 1,3,5\uFF09: ");
    const indices = answer.split(",").map((s) => parseInt(s.trim()) - 1).filter((i) => i >= 0 && i < items.length);
    return indices.map((i) => items[i]);
  } else {
    const answer = await ask("\n\u8F93\u5165\u7F16\u53F7: ");
    const index = parseInt(answer) - 1;
    if (index >= 0 && index < items.length) {
      return [items[index]];
    }
    return [];
  }
}
var AGENT_TYPES = [
  { key: "planner", name: "Planner\uFF08\u4EFB\u52A1\u89C4\u5212\uFF09", description: "\u8D1F\u8D23\u5206\u6790\u4EFB\u52A1\u3001\u5206\u89E3\u5B50\u4EFB\u52A1" },
  { key: "coder", name: "Coder\uFF08\u7F16\u7801\uFF09", description: "\u8D1F\u8D23\u7F16\u5199\u4EE3\u7801\u3001\u5B9E\u73B0\u529F\u80FD" },
  { key: "reviewer", name: "Reviewer\uFF08\u5BA1\u67E5\uFF09", description: "\u8D1F\u8D23\u4EE3\u7801\u5BA1\u67E5\u3001\u8D28\u91CF\u68C0\u67E5" },
  { key: "researcher", name: "Researcher\uFF08\u7814\u7A76\uFF09", description: "\u8D1F\u8D23\u6280\u672F\u8C03\u7814\u3001\u65B9\u6848\u5206\u6790" }
];
async function runSetup() {
  console.log("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("\u2551             OpenAgents \u4EA4\u4E92\u5F0F\u914D\u7F6E\u5411\u5BFC                     \u2551");
  console.log("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n");
  const providers = [];
  const agentConfigs = {};
  console.log("\u2500\u2500 \u6B65\u9AA4 1: \u914D\u7F6E API Provider \u2500\u2500\n");
  console.log("\u652F\u6301\u4EFB\u4F55 OpenAI \u517C\u5BB9\u7684 API \u63A5\u53E3\uFF08OpenAI\u3001DeepSeek\u3001Claude\u3001\u672C\u5730\u6A21\u578B\u7B49\uFF09\n");
  let addMore = true;
  while (addMore) {
    console.log(`
--- Provider ${providers.length + 1} ---`);
    const name = await ask("Provider \u540D\u79F0\uFF08\u5982 openai\u3001deepseek\u3001local\uFF09: ");
    if (!name) {
      console.log("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A\uFF0C\u8DF3\u8FC7\u6B64 provider\u3002");
      continue;
    }
    const baseUrl = await ask("API Base URL\uFF08\u5982 https://api.openai.com/v1\uFF09: ");
    if (!baseUrl) {
      console.log("URL \u4E0D\u80FD\u4E3A\u7A7A\uFF0C\u8DF3\u8FC7\u6B64 provider\u3002");
      continue;
    }
    const apiKey = await askPassword("API Key\uFF08\u8F93\u5165\u65F6\u4E0D\u4F1A\u663E\u793A\uFF09: ");
    if (!apiKey) {
      console.log("API Key \u4E0D\u80FD\u4E3A\u7A7A\uFF0C\u8DF3\u8FC7\u6B64 provider\u3002");
      continue;
    }
    console.log("\n\u6B63\u5728\u83B7\u53D6\u6A21\u578B\u5217\u8868...");
    const models = await fetchModels(baseUrl, apiKey);
    if (models.length === 0) {
      console.log("\u672A\u80FD\u83B7\u53D6\u5230\u6A21\u578B\u5217\u8868\u3002");
      const manualModel = await ask("\u8BF7\u624B\u52A8\u8F93\u5165\u6A21\u578B\u540D\u79F0\uFF08\u5982 gpt-4o\uFF09: ");
      if (manualModel) {
        providers.push({
          name,
          api_key: apiKey,
          base_url: baseUrl,
          default_model: manualModel
        });
        console.log(`\u2713 Provider "${name}" \u5DF2\u6DFB\u52A0\uFF08\u6A21\u578B: ${manualModel}\uFF09`);
      }
    } else {
      console.log(`
\u627E\u5230 ${models.length} \u4E2A\u6A21\u578B:`);
      const pageSize = 20;
      let page = 0;
      let showAll = false;
      while (!showAll) {
        const start = page * pageSize;
        const end = Math.min(start + pageSize, models.length);
        for (let i = start; i < end; i++) {
          console.log(`  ${i + 1}. ${models[i]}`);
        }
        if (end < models.length) {
          const action = await ask(`
\u663E\u793A ${end}/${models.length} \u4E2A\u6A21\u578B\u3002\u6309\u56DE\u8F66\u7EE7\u7EED\u663E\u793A\uFF0C\u8F93\u5165 "q" \u505C\u6B62: `);
          if (action.toLowerCase() === "q") {
            showAll = true;
          } else {
            page++;
          }
        } else {
          showAll = true;
        }
      }
      const selectedModels = await selectFromList(models, "\u9009\u62E9\u9ED8\u8BA4\u6A21\u578B\uFF08\u8F93\u5165\u7F16\u53F7\uFF09:");
      const defaultModel = selectedModels[0] || models[0];
      providers.push({
        name,
        api_key: apiKey,
        base_url: baseUrl,
        default_model: defaultModel
      });
      console.log(`\u2713 Provider "${name}" \u5DF2\u6DFB\u52A0\uFF08\u9ED8\u8BA4\u6A21\u578B: ${defaultModel}\uFF09`);
    }
    const more = await ask("\n\u662F\u5426\u7EE7\u7EED\u6DFB\u52A0 Provider\uFF1F(y/N): ");
    addMore = more.toLowerCase() === "y";
  }
  if (providers.length === 0) {
    console.log("\n\u274C \u81F3\u5C11\u9700\u8981\u914D\u7F6E\u4E00\u4E2A Provider\u3002\u914D\u7F6E\u5DF2\u53D6\u6D88\u3002");
    rl.close();
    return;
  }
  console.log("\n\n\u2500\u2500 \u6B65\u9AA4 2: \u4E3A Agent \u5206\u914D\u6A21\u578B \u2500\u2500\n");
  console.log("\u6BCF\u4E2A Agent \u53EF\u4EE5\u4F7F\u7528\u4E0D\u540C\u7684 Provider \u548C\u6A21\u578B\u3002\n");
  const allModels = [];
  for (const p of providers) {
    if (p.default_model) {
      allModels.push({ provider: p.name, model: p.default_model });
    }
  }
  for (const agent of AGENT_TYPES) {
    console.log(`
--- ${agent.name} ---`);
    console.log(`    ${agent.description}`);
    if (allModels.length === 1) {
      agentConfigs[agent.key] = {
        provider: allModels[0].provider,
        model: allModels[0].model,
        system_prompt: getDefaultSystemPrompt(agent.key),
        temperature: getDefaultTemperature(agent.key),
        enabled: true
      };
      console.log(`  \u2192 \u4F7F\u7528: ${allModels[0].provider}/${allModels[0].model}`);
    } else {
      console.log("\n\u53EF\u7528\u6A21\u578B:");
      allModels.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.provider}/${m.model}`);
      });
      console.log(`  ${allModels.length + 1}. \u81EA\u5B9A\u4E49\u6A21\u578B`);
      const choice = await ask(`\u9009\u62E9\u6A21\u578B (1-${allModels.length + 1}, \u76F4\u63A5\u56DE\u8F66\u4F7F\u7528\u9ED8\u8BA4): `);
      if (choice && parseInt(choice) === allModels.length + 1) {
        const customProvider = await ask("\u8F93\u5165 Provider \u540D\u79F0: ");
        const customModel = await ask("\u8F93\u5165\u6A21\u578B\u540D\u79F0: ");
        agentConfigs[agent.key] = {
          provider: customProvider,
          model: customModel,
          system_prompt: getDefaultSystemPrompt(agent.key),
          temperature: getDefaultTemperature(agent.key),
          enabled: true
        };
      } else if (choice && parseInt(choice) > 0 && parseInt(choice) <= allModels.length) {
        const selected = allModels[parseInt(choice) - 1];
        agentConfigs[agent.key] = {
          provider: selected.provider,
          model: selected.model,
          system_prompt: getDefaultSystemPrompt(agent.key),
          temperature: getDefaultTemperature(agent.key),
          enabled: true
        };
      } else {
        agentConfigs[agent.key] = {
          provider: allModels[0].provider,
          model: allModels[0].model,
          system_prompt: getDefaultSystemPrompt(agent.key),
          temperature: getDefaultTemperature(agent.key),
          enabled: true
        };
        console.log(`  \u2192 \u4F7F\u7528\u9ED8\u8BA4: ${allModels[0].provider}/${allModels[0].model}`);
      }
    }
  }
  console.log("\n\n\u2500\u2500 \u6B65\u9AA4 3: \u786E\u8BA4\u914D\u7F6E \u2500\u2500\n");
  console.log("Provider \u914D\u7F6E:");
  providers.forEach((p) => {
    console.log(`  - ${p.name}: ${p.base_url} (\u9ED8\u8BA4\u6A21\u578B: ${p.default_model || "N/A"})`);
  });
  console.log("\nAgent \u914D\u7F6E:");
  for (const [key, config2] of Object.entries(agentConfigs)) {
    console.log(`  - ${key}: ${config2.provider}/${config2.model}`);
  }
  const confirm = await ask("\n\u786E\u8BA4\u4FDD\u5B58\u914D\u7F6E\uFF1F(Y/n): ");
  if (confirm.toLowerCase() === "n") {
    console.log("\u914D\u7F6E\u5DF2\u53D6\u6D88\u3002");
    rl.close();
    return;
  }
  const config = {
    providers,
    agents: agentConfigs,
    orchestrator: {
      max_concurrent_agents: 3,
      auto_decompose: true,
      collaboration_mode: "hierarchical"
    },
    sessions: {
      auto_save: true,
      max_history: 100
    }
  };
  saveConfig(config);
  console.log(`
\u2713 \u914D\u7F6E\u5DF2\u4FDD\u5B58\u5230: ${getConfigPath()}`);
  console.log('\n\u73B0\u5728\u53EF\u4EE5\u8FD0\u884C "openagents" \u542F\u52A8\u4F1A\u8BDD\u4E86\uFF01');
  rl.close();
}
function getDefaultSystemPrompt(agentType) {
  const prompts = {
    planner: `\u4F60\u662F\u4E00\u4E2A\u4EFB\u52A1\u89C4\u5212\u4E13\u5BB6\u3002\u4F60\u7684\u804C\u8D23\u662F\uFF1A
1. \u5206\u6790\u7528\u6237\u7684\u8BF7\u6C42\uFF0C\u7406\u89E3\u5176\u610F\u56FE
2. \u5C06\u590D\u6742\u4EFB\u52A1\u5206\u89E3\u4E3A\u53EF\u6267\u884C\u7684\u5B50\u4EFB\u52A1
3. \u4E3A\u6BCF\u4E2A\u5B50\u4EFB\u52A1\u6307\u5B9A\u6700\u9002\u5408\u7684\u6267\u884C\u89D2\u8272\uFF08coder/reviewer/researcher\uFF09
4. \u786E\u4FDD\u4EFB\u52A1\u4E4B\u95F4\u7684\u4F9D\u8D56\u5173\u7CFB\u6E05\u6670

\u8BF7\u7528 JSON \u683C\u5F0F\u8F93\u51FA\u4EFB\u52A1\u5206\u89E3\u7ED3\u679C\uFF1A
{
  "tasks": [
    {
      "id": "task-1",
      "description": "\u4EFB\u52A1\u63CF\u8FF0",
      "assignee": "coder|reviewer|researcher",
      "dependencies": [],
      "priority": "high|medium|low"
    }
  ],
  "summary": "\u4EFB\u52A1\u603B\u4F53\u6982\u8FF0"
}`,
    coder: `\u4F60\u662F\u4E00\u4E2A\u9AD8\u7EA7\u7A0B\u5E8F\u5458\u3002\u4F60\u7684\u804C\u8D23\u662F\uFF1A
1. \u6839\u636E\u4EFB\u52A1\u63CF\u8FF0\u7F16\u5199\u9AD8\u8D28\u91CF\u4EE3\u7801
2. \u9075\u5FAA\u6700\u4F73\u5B9E\u8DF5\u548C\u8BBE\u8BA1\u6A21\u5F0F
3. \u7F16\u5199\u6E05\u6670\u7684\u6CE8\u91CA\u548C\u6587\u6863
4. \u8003\u8651\u8FB9\u754C\u60C5\u51B5\u548C\u9519\u8BEF\u5904\u7406

\u8F93\u51FA\u4EE3\u7801\u65F6\u8BF7\u4F7F\u7528 Markdown \u4EE3\u7801\u5757\uFF0C\u5E76\u6CE8\u660E\u7F16\u7A0B\u8BED\u8A00\u3002`,
    reviewer: `\u4F60\u662F\u4E00\u4E2A\u4EE3\u7801\u5BA1\u67E5\u4E13\u5BB6\u3002\u4F60\u7684\u804C\u8D23\u662F\uFF1A
1. \u5BA1\u67E5\u4EE3\u7801\u7684\u6B63\u786E\u6027\u3001\u53EF\u8BFB\u6027\u548C\u6027\u80FD
2. \u53D1\u73B0\u6F5C\u5728\u7684 bug \u548C\u5B89\u5168\u6F0F\u6D1E
3. \u63D0\u4F9B\u6539\u8FDB\u5EFA\u8BAE
4. \u786E\u4FDD\u4EE3\u7801\u7B26\u5408\u6700\u4F73\u5B9E\u8DF5

\u8BF7\u7528\u7ED3\u6784\u5316\u7684\u65B9\u5F0F\u8F93\u51FA\u5BA1\u67E5\u7ED3\u679C\uFF1A
- \u95EE\u9898\u5217\u8868\uFF08\u4E25\u91CD\u7A0B\u5EA6\uFF1A\u9AD8/\u4E2D/\u4F4E\uFF09
- \u6539\u8FDB\u5EFA\u8BAE
- \u603B\u4F53\u8BC4\u4EF7`,
    researcher: `\u4F60\u662F\u4E00\u4E2A\u6280\u672F\u7814\u7A76\u4E13\u5BB6\u3002\u4F60\u7684\u804C\u8D23\u662F\uFF1A
1. \u8C03\u7814\u6280\u672F\u65B9\u6848\u548C\u6700\u4F73\u5B9E\u8DF5
2. \u5206\u6790\u4E0D\u540C\u65B9\u6848\u7684\u4F18\u7F3A\u70B9
3. \u63D0\u4F9B\u6280\u672F\u9009\u578B\u5EFA\u8BAE
4. \u6574\u7406\u76F8\u5173\u6587\u6863\u548C\u8D44\u6E90

\u8BF7\u63D0\u4F9B\u7ED3\u6784\u5316\u7684\u7814\u7A76\u62A5\u544A\uFF0C\u5305\u62EC\uFF1A\u80CC\u666F\u3001\u65B9\u6848\u5BF9\u6BD4\u3001\u63A8\u8350\u65B9\u6848\u3001\u53C2\u8003\u8D44\u6599\u3002`
  };
  return prompts[agentType] || "\u4F60\u662F\u4E00\u4E2A\u6709\u7528\u7684 AI \u52A9\u624B\u3002";
}
function getDefaultTemperature(agentType) {
  const temps = {
    planner: 0.7,
    coder: 0.3,
    reviewer: 0.5,
    researcher: 0.7
  };
  return temps[agentType] || 0.7;
}
async function runUninstall() {
  console.log("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("\u2551             OpenAgents \u5378\u8F7D                              \u2551");
  console.log("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n");
  const { getConfigDir: getConfigDir2 } = await Promise.resolve().then(() => (init_loader(), loader_exports));
  const configDir = getConfigDir2();
  console.log("\u5C06\u8981\u6267\u884C\u4EE5\u4E0B\u64CD\u4F5C:");
  console.log(`  1. \u5220\u9664\u914D\u7F6E\u76EE\u5F55: ${configDir}`);
  console.log("  2. \u5168\u5C40\u5378\u8F7D openagents \u5305\n");
  const confirm = await ask("\u786E\u8BA4\u5378\u8F7D\uFF1F(y/N): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("\u5378\u8F7D\u5DF2\u53D6\u6D88\u3002");
    rl.close();
    return;
  }
  const fs4 = await import("fs");
  if (fs4.existsSync(configDir)) {
    fs4.rmSync(configDir, { recursive: true, force: true });
    console.log(`\u2713 \u5DF2\u5220\u9664\u914D\u7F6E\u76EE\u5F55: ${configDir}`);
  } else {
    console.log(`\u914D\u7F6E\u76EE\u5F55\u4E0D\u5B58\u5728: ${configDir}`);
  }
  console.log("\n\u6B63\u5728\u5378\u8F7D npm \u5305...");
  console.log("\u8BF7\u624B\u52A8\u8FD0\u884C: npm uninstall -g openagents");
  console.log("\n\u2713 \u5378\u8F7D\u5B8C\u6210\uFF01");
  rl.close();
}

// src/cli/commands.ts
function createCommands() {
  const program2 = new Command();
  program2.name("openagents").description("Terminal multi-agent collaboration tool").version("3.0.0");
  program2.command("start").description("Start an interactive session").option("-n, --name <name>", "Session name").option("-r, --resume <id>", "Resume a session by ID").action(async (options) => {
  });
  program2.command("resume").description("Resume the most recent session").action(async () => {
    const sessions = Session.listSessions();
    if (sessions.length === 0) {
      console.log("\u6CA1\u6709\u4FDD\u5B58\u7684\u4F1A\u8BDD\u3002");
      return;
    }
    process.env.OPENAGENTS_RESUME_ID = sessions[0].id;
  });
  const configCmd = program2.command("config").description("Manage configuration");
  configCmd.command("init").description("Interactive configuration setup").option("-f, --force", "Force overwrite existing configuration").action(async (options) => {
    if (configExists() && !options.force) {
      console.log(`\u914D\u7F6E\u6587\u4EF6\u5DF2\u5B58\u5728: ${getConfigPath()}`);
      console.log('\u5982\u9700\u91CD\u65B0\u914D\u7F6E\uFF0C\u8BF7\u4F7F\u7528 "openagents config init --force"');
      return;
    }
    await runSetup();
  });
  configCmd.command("show").description("Show current configuration").action(() => {
    const config = loadConfig();
    const safeConfig = {
      ...config,
      providers: config.providers.map((p) => ({
        ...p,
        api_key: p.api_key.slice(0, 8) + "***" + p.api_key.slice(-4)
      }))
    };
    console.log(JSON.stringify(safeConfig, null, 2));
  });
  configCmd.command("path").description("Show configuration file path").action(() => {
    console.log(getConfigPath());
  });
  const sessionCmd = program2.command("session").description("Manage sessions");
  sessionCmd.command("list").description("List all sessions").action(() => {
    const sessions = Session.listSessions();
    if (sessions.length === 0) {
      console.log("\u6CA1\u6709\u4FDD\u5B58\u7684\u4F1A\u8BDD\u3002");
      return;
    }
    console.log("\u4FDD\u5B58\u7684\u4F1A\u8BDD:\n");
    sessions.forEach((s, i) => {
      const date = new Date(s.updatedAt).toLocaleString();
      console.log(`${i + 1}. ${s.name}`);
      console.log(`   ID: ${s.id}`);
      console.log(`   \u66F4\u65B0: ${date} | \u6D88\u606F: ${s.messages.length} \u6761`);
      console.log();
    });
  });
  sessionCmd.command("delete <id>").description("Delete a session").action((id) => {
    if (Session.deleteSession(id)) {
      console.log(`\u4F1A\u8BDD ${id} \u5DF2\u5220\u9664\u3002`);
    } else {
      console.log(`\u672A\u627E\u5230\u4F1A\u8BDD ${id}\u3002`);
    }
  });
  sessionCmd.command("clear").description("Delete all sessions").action(async () => {
    const readline2 = await import("readline");
    const rl2 = readline2.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl2.question("\u786E\u8BA4\u5220\u9664\u6240\u6709\u4F1A\u8BDD\uFF1F(y/N): ", (answer) => {
      if (answer.toLowerCase() === "y") {
        const sessions = Session.listSessions();
        sessions.forEach((s) => Session.deleteSession(s.id));
        console.log(`\u5DF2\u5220\u9664 ${sessions.length} \u4E2A\u4F1A\u8BDD\u3002`);
      } else {
        console.log("\u64CD\u4F5C\u5DF2\u53D6\u6D88\u3002");
      }
      rl2.close();
    });
  });
  program2.command("agents").description("List available agents").action(() => {
    const config = loadConfig();
    console.log("\u914D\u7F6E\u7684 Agent:\n");
    for (const [name, agentConfig] of Object.entries(config.agents)) {
      console.log(`- ${name}`);
      console.log(`  Provider: ${agentConfig.provider} | Model: ${agentConfig.model}`);
      console.log(`  Temperature: ${agentConfig.temperature} | Enabled: ${agentConfig.enabled}`);
      console.log();
    }
  });
  program2.command("uninstall").description("Uninstall openagents and remove configuration").action(async () => {
    await runUninstall();
  });
  return program2;
}

// src/index.ts
var program = createCommands();
program.commands.forEach((cmd) => {
  if (cmd.name() === "start") {
    cmd.action(async (options) => {
      await startApp(options.name, options.resume);
    });
  }
});
program.action(async () => {
  await startApp();
});
async function startApp(sessionName, resumeSessionId) {
  try {
    if (!configExists()) {
      console.log("\u6B22\u8FCE\u4F7F\u7528 OpenAgents\uFF01\u9996\u6B21\u4F7F\u7528\u9700\u8981\u914D\u7F6E API Provider\u3002\n");
      await runSetup();
      console.log("\n\u6B63\u5728\u542F\u52A8 OpenAgents...\n");
    }
    const config = loadConfig();
    if (config.providers.length === 0) {
      console.log("\u9519\u8BEF: \u672A\u914D\u7F6E\u4EFB\u4F55 API Provider\u3002");
      console.log('\u8BF7\u8FD0\u884C "openagents config init" \u8FDB\u884C\u914D\u7F6E\u3002');
      return;
    }
    const { Screen: Screen2 } = await Promise.resolve().then(() => (init_screen(), screen_exports));
    new Screen2({ config, sessionName, resumeSessionId });
  } catch (error) {
    console.error("\u542F\u52A8\u5931\u8D25:", error.message);
    process.exit(1);
  }
}
program.parse();
//# sourceMappingURL=index.js.map