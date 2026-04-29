#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

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
var defaults_exports = {};
__export(defaults_exports, {
  DEFAULT_CONFIG: () => DEFAULT_CONFIG,
  getDefaultConfig: () => getDefaultConfig
});
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

// src/tui/components/Header.tsx
import React from "react";
import { Box, Text } from "ink";
function Header({ sessionName, agentCount, messageCount }) {
  return /* @__PURE__ */ React.createElement(
    Box,
    {
      borderStyle: "single",
      borderBottom: true,
      borderTop: false,
      borderLeft: false,
      borderRight: false,
      paddingX: 1
    },
    /* @__PURE__ */ React.createElement(Text, { bold: true, color: "cyan" }, "OpenAgents v1.0"),
    /* @__PURE__ */ React.createElement(Text, { color: "gray" }, " \u2500\u2500\u2500\u2500\u2500\u2500\u2500 "),
    /* @__PURE__ */ React.createElement(Text, { color: "yellow" }, "Session: ", sessionName),
    /* @__PURE__ */ React.createElement(Text, { color: "gray" }, " \u2500\u2500\u2500\u2500\u2500\u2500\u2500 "),
    /* @__PURE__ */ React.createElement(Text, { color: "green" }, "Agents: ", agentCount),
    /* @__PURE__ */ React.createElement(Text, { color: "gray" }, " \u2500\u2500\u2500\u2500\u2500\u2500\u2500 "),
    /* @__PURE__ */ React.createElement(Text, { color: "magenta" }, "Messages: ", messageCount)
  );
}
var init_Header = __esm({
  "src/tui/components/Header.tsx"() {
    "use strict";
  }
});

// src/tui/components/ChatPanel.tsx
import React2 from "react";
import { Box as Box2, Text as Text2 } from "ink";
import Spinner from "ink-spinner";
function ChatPanel({ messages, isLoading, active }) {
  const borderColor = active ? "cyan" : "gray";
  const formatMessage = (msg) => {
    switch (msg.type) {
      case "user_input":
        return { prefix: "You", color: "green" };
      case "agent_message":
        return { prefix: msg.from, color: "yellow" };
      case "task_completed":
        return { prefix: msg.from, color: "blue" };
      case "task_failed":
        return { prefix: msg.from, color: "red" };
      case "agent_status":
        return { prefix: msg.from, color: "gray" };
      case "system":
        return { prefix: "System", color: "magenta" };
      default:
        return { prefix: msg.from, color: "white" };
    }
  };
  return /* @__PURE__ */ React2.createElement(
    Box2,
    {
      flexDirection: "column",
      flexGrow: 2,
      borderStyle: "round",
      borderColor,
      paddingX: 1,
      overflow: "hidden"
    },
    /* @__PURE__ */ React2.createElement(Text2, { bold: true, color: "cyan" }, "Chat"),
    /* @__PURE__ */ React2.createElement(Box2, { flexDirection: "column", flexGrow: 1, overflow: "hidden" }, messages.length === 0 ? /* @__PURE__ */ React2.createElement(Box2, { marginTop: 1 }, /* @__PURE__ */ React2.createElement(Text2, { color: "gray", dimColor: true }, "\u8F93\u5165\u6D88\u606F\u5F00\u59CB\u5BF9\u8BDD...")) : messages.slice(-20).map((msg) => {
      const { prefix, color } = formatMessage(msg);
      return /* @__PURE__ */ React2.createElement(Box2, { key: msg.id, flexDirection: "column", marginBottom: 1 }, /* @__PURE__ */ React2.createElement(Text2, null, /* @__PURE__ */ React2.createElement(Text2, { color, bold: true }, "[", prefix, "]"), /* @__PURE__ */ React2.createElement(Text2, { color: "gray" }, " ", msg.timestamp.toLocaleTimeString())), /* @__PURE__ */ React2.createElement(Text2, { wrap: "wrap" }, msg.content));
    }), isLoading && /* @__PURE__ */ React2.createElement(Box2, null, /* @__PURE__ */ React2.createElement(Text2, { color: "yellow" }, /* @__PURE__ */ React2.createElement(Spinner, { type: "dots" }), " Agent \u6B63\u5728\u5904\u7406...")))
  );
}
var init_ChatPanel = __esm({
  "src/tui/components/ChatPanel.tsx"() {
    "use strict";
  }
});

// src/tui/components/AgentStatus.tsx
import React3 from "react";
import { Box as Box3, Text as Text3 } from "ink";
function AgentStatusPanel({ agents, active }) {
  const borderColor = active ? "cyan" : "gray";
  const getStatusIcon = (status) => {
    switch (status) {
      case "idle":
        return "\u25CB";
      case "working":
        return "\u25CF";
      case "thinking":
        return "\u25D0";
      case "error":
        return "\u2717";
      case "stopped":
        return "\u25A0";
      default:
        return "?";
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "idle":
        return "gray";
      case "working":
        return "green";
      case "thinking":
        return "yellow";
      case "error":
        return "red";
      case "stopped":
        return "gray";
      default:
        return "white";
    }
  };
  return /* @__PURE__ */ React3.createElement(
    Box3,
    {
      flexDirection: "column",
      width: 30,
      borderStyle: "round",
      borderColor,
      paddingX: 1
    },
    /* @__PURE__ */ React3.createElement(Text3, { bold: true, color: "cyan" }, "Agents"),
    /* @__PURE__ */ React3.createElement(Box3, { flexDirection: "column", marginTop: 1 }, agents.map((agent) => /* @__PURE__ */ React3.createElement(Box3, { key: agent.id, flexDirection: "column", marginBottom: 1 }, /* @__PURE__ */ React3.createElement(Text3, null, /* @__PURE__ */ React3.createElement(Text3, { color: getStatusColor(agent.status) }, getStatusIcon(agent.status), " "), /* @__PURE__ */ React3.createElement(Text3, { bold: true }, agent.name)), /* @__PURE__ */ React3.createElement(Text3, { color: "gray", dimColor: true }, agent.type, " | Token: ", agent.tokenUsage), agent.currentTask && /* @__PURE__ */ React3.createElement(Text3, { color: "yellow", dimColor: true }, "\u5F53\u524D: ", agent.currentTask.description.slice(0, 20), "...")))),
    active && /* @__PURE__ */ React3.createElement(Box3, { marginTop: 1, borderStyle: "single", borderTop: true, paddingX: 1 }, /* @__PURE__ */ React3.createElement(Text3, { color: "gray", dimColor: true }, "Tab \u5207\u6362\u9762\u677F"))
  );
}
var init_AgentStatus = __esm({
  "src/tui/components/AgentStatus.tsx"() {
    "use strict";
  }
});

// src/tui/components/InputBar.tsx
import React4, { useState } from "react";
import { Box as Box4, Text as Text4 } from "ink";
import TextInput from "ink-text-input";
function InputBar({ onSubmit, isLoading, disabled }) {
  const [value, setValue] = useState("");
  const handleSubmit = (input) => {
    if (input.trim()) {
      onSubmit(input);
      setValue("");
    }
  };
  return /* @__PURE__ */ React4.createElement(
    Box4,
    {
      borderStyle: "single",
      borderTop: true,
      borderBottom: false,
      borderLeft: false,
      borderRight: false,
      paddingX: 1
    },
    /* @__PURE__ */ React4.createElement(Text4, { color: "cyan", bold: true }, isLoading ? "\u27F3 " : "> "),
    /* @__PURE__ */ React4.createElement(
      TextInput,
      {
        value,
        onChange: setValue,
        onSubmit: handleSubmit,
        placeholder: isLoading ? "Agent \u6B63\u5728\u5904\u7406..." : "\u8F93\u5165\u6D88\u606F\u6216\u547D\u4EE4...",
        focus: !disabled
      }
    )
  );
}
var init_InputBar = __esm({
  "src/tui/components/InputBar.tsx"() {
    "use strict";
  }
});

// src/core/message-bus.ts
import { EventEmitter } from "events";
var MessageBus, messageBus;
var init_message_bus = __esm({
  "src/core/message-bus.ts"() {
    "use strict";
    MessageBus = class extends EventEmitter {
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

// src/agents/base-agent.ts
import { v4 as uuidv42 } from "uuid";
var BaseAgent;
var init_base_agent = __esm({
  "src/agents/base-agent.ts"() {
    "use strict";
    init_message_bus();
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
      constructor(name, type, config, llm) {
        this.id = `agent-${type}-${uuidv42().slice(0, 8)}`;
        this.name = name;
        this.type = type;
        this.config = config;
        this.llm = llm;
        messageBus.subscribeToAgent(this.id, (msg) => this.handleMessage(msg));
      }
      handleMessage(message) {
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
        messageBus.publish({
          type: "agent_status",
          from: this.id,
          content: `${this.name} \u5F00\u59CB\u5904\u7406\u4EFB\u52A1: ${taskDescription}`,
          metadata: { agentId: this.id, taskId: task.id }
        });
        try {
          const messages = [
            { role: "system", content: this.getSystemPrompt() },
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
          this.conversationHistory.push(
            { role: "user", content: taskDescription },
            { role: "assistant", content: response.content }
          );
          task.status = "completed";
          task.result = response.content;
          task.completedAt = /* @__PURE__ */ new Date();
          this.currentTask = void 0;
          this.setStatus("idle");
          messageBus.publish({
            type: "task_completed",
            from: this.id,
            content: response.content,
            metadata: { agentId: this.id, taskId: task.id }
          });
          return response.content;
        } catch (error) {
          task.status = "failed";
          task.result = error.message;
          this.currentTask = void 0;
          this.setStatus("error");
          messageBus.publish({
            type: "task_failed",
            from: this.id,
            content: `\u4EFB\u52A1\u5931\u8D25: ${error.message}`,
            metadata: { agentId: this.id, taskId: task.id }
          });
          throw error;
        }
      }
      async streamTask(taskDescription, onToken) {
        const task = {
          id: `task-${uuidv42().slice(0, 8)}`,
          description: taskDescription,
          status: "in_progress",
          assignedAt: /* @__PURE__ */ new Date()
        };
        this.currentTask = task;
        this.tasks.push(task);
        this.setStatus("working");
        try {
          const messages = [
            { role: "system", content: this.getSystemPrompt() },
            ...this.conversationHistory,
            { role: "user", content: taskDescription }
          ];
          let fullContent = "";
          await this.llm.streamChat(
            this.config.provider,
            this.config.model,
            messages,
            {
              onToken: (token) => {
                fullContent += token;
                onToken(token);
              },
              onComplete: (response) => {
                this.tokenUsage += response.usage?.total_tokens || 0;
              }
            },
            {
              temperature: this.config.temperature,
              max_tokens: this.config.max_tokens
            }
          );
          this.conversationHistory.push(
            { role: "user", content: taskDescription },
            { role: "assistant", content: fullContent }
          );
          task.status = "completed";
          task.result = fullContent;
          task.completedAt = /* @__PURE__ */ new Date();
          this.currentTask = void 0;
          this.setStatus("idle");
          return fullContent;
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
        messageBus.publish({
          type: "agent_status",
          from: this.id,
          content: `${this.name} \u72B6\u6001\u53D8\u66F4\u4E3A: ${status}`,
          metadata: { agentId: this.id, status }
        });
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

// src/core/orchestrator.ts
import { EventEmitter as EventEmitter2 } from "events";
var Orchestrator;
var init_orchestrator = __esm({
  "src/core/orchestrator.ts"() {
    "use strict";
    init_agents();
    init_message_bus();
    Orchestrator = class extends EventEmitter2 {
      agents = /* @__PURE__ */ new Map();
      planner;
      llm;
      config;
      status = "idle";
      currentPlan;
      completedTasks = 0;
      totalTasks = 0;
      constructor(config, llm) {
        super();
        this.config = config;
        this.llm = llm;
        this.initializeAgents();
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
      async processUserInput(input) {
        const mode = this.config.orchestrator.collaboration_mode;
        messageBus.publish({
          type: "user_input",
          from: "user",
          content: input
        });
        switch (mode) {
          case "hierarchical":
            await this.processHierarchical(input);
            break;
          case "peer":
            await this.processPeer(input);
            break;
          case "hybrid":
            await this.processHybrid(input);
            break;
        }
      }
      async processHierarchical(input) {
        this.setStatus("planning");
        this.emit("status_change", "planning");
        try {
          const plan = await this.planner.planTask(input);
          this.currentPlan = plan;
          this.totalTasks = plan.tasks.length;
          this.completedTasks = 0;
          messageBus.publish({
            type: "system",
            from: "orchestrator",
            content: `\u4EFB\u52A1\u5DF2\u5206\u89E3\u4E3A ${plan.tasks.length} \u4E2A\u5B50\u4EFB\u52A1`,
            metadata: { plan }
          });
          this.setStatus("executing");
          this.emit("status_change", "executing");
          await this.executePlan(plan);
          this.setStatus("summarizing");
          this.emit("status_change", "summarizing");
          const summary = this.generateSummary(plan);
          messageBus.publish({
            type: "system",
            from: "orchestrator",
            content: summary
          });
          this.setStatus("idle");
          this.emit("status_change", "idle");
          this.emit("complete", summary);
        } catch (error) {
          this.setStatus("idle");
          this.emit("error", error);
        }
      }
      async processPeer(input) {
        this.setStatus("executing");
        this.emit("status_change", "executing");
        const activeAgents = Array.from(this.agents.values()).filter((a) => a.type !== "planner").slice(0, this.config.orchestrator.max_concurrent_agents);
        const responses = [];
        for (const agent of activeAgents) {
          try {
            const response = await agent.processTask(input);
            responses.push(`[${agent.name}] ${response}`);
            this.completedTasks++;
          } catch (error) {
            responses.push(`[${agent.name}] \u5904\u7406\u5931\u8D25: ${error.message}`);
          }
        }
        const summary = responses.join("\n\n---\n\n");
        messageBus.publish({
          type: "system",
          from: "orchestrator",
          content: summary
        });
        this.setStatus("idle");
        this.emit("status_change", "idle");
        this.emit("complete", summary);
      }
      async processHybrid(input) {
        const isComplex = input.length > 200 || input.includes("\u548C") || input.includes("\u7136\u540E");
        if (isComplex) {
          await this.processHierarchical(input);
        } else {
          const coder = Array.from(this.agents.values()).find((a) => a.type === "coder");
          if (coder) {
            this.setStatus("executing");
            const response = await coder.processTask(input);
            messageBus.publish({
              type: "system",
              from: "orchestrator",
              content: response
            });
            this.setStatus("idle");
            this.emit("complete", response);
          }
        }
      }
      async executePlan(plan) {
        const executed = /* @__PURE__ */ new Set();
        const taskMap = new Map(plan.tasks.map((t) => [t.id, t]));
        while (executed.size < plan.tasks.length) {
          const readyTasks = plan.tasks.filter(
            (task) => !executed.has(task.id) && task.dependencies.every((dep) => executed.has(dep))
          );
          if (readyTasks.length === 0) {
            throw new Error("\u68C0\u6D4B\u5230\u5FAA\u73AF\u4F9D\u8D56");
          }
          const chunks = this.chunk(readyTasks, this.config.orchestrator.max_concurrent_agents);
          for (const chunk of chunks) {
            await Promise.all(chunk.map(async (task) => {
              const agent = this.findAgentForTask(task.assignee);
              if (!agent) {
                messageBus.publish({
                  type: "task_failed",
                  from: "orchestrator",
                  content: `\u627E\u4E0D\u5230\u9002\u5408\u6267\u884C\u4EFB\u52A1\u7684 Agent: ${task.assignee}`
                });
                executed.add(task.id);
                return;
              }
              try {
                await agent.processTask(task.description);
                executed.add(task.id);
                this.completedTasks++;
                this.emit("task_complete", task);
              } catch {
                executed.add(task.id);
              }
            }));
          }
        }
      }
      findAgentForTask(assignee) {
        for (const agent of this.agents.values()) {
          if (agent.type === assignee) return agent;
        }
        for (const agent of this.agents.values()) {
          if (agent.name.toLowerCase() === assignee.toLowerCase()) return agent;
        }
        return void 0;
      }
      generateSummary(plan) {
        const agentStates = Array.from(this.agents.values()).map((a) => a.getState());
        const totalTokens = agentStates.reduce((sum, s) => sum + s.tokenUsage, 0);
        return `\u4EFB\u52A1\u5B8C\u6210\uFF01

\u6267\u884C\u6458\u8981:
- \u603B\u4EFB\u52A1\u6570: ${this.totalTasks}
- \u5DF2\u5B8C\u6210: ${this.completedTasks}
- \u4F7F\u7528 Agent \u6570: ${agentStates.filter((s) => s.messageCount > 0).length}
- \u603B Token \u7528\u91CF: ${totalTokens}

${plan.summary}`;
      }
      chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }
        return chunks;
      }
      setStatus(status) {
        this.status = status;
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

// src/tui/App.tsx
var App_exports = {};
__export(App_exports, {
  App: () => App
});
import React5, { useState as useState2, useEffect, useCallback } from "react";
import { Box as Box5, useApp, useInput } from "ink";
function App({ config, sessionName }) {
  const { exit } = useApp();
  const [messages, setMessages] = useState2([]);
  const [agents, setAgents] = useState2([]);
  const [isLoading, setIsLoading] = useState2(false);
  const [orchestrator, setOrchestrator] = useState2(null);
  const [session, setSession] = useState2(null);
  const [activePanel, setActivePanel] = useState2("chat");
  useEffect(() => {
    const llm = new LLMClient(config.providers);
    const orch = new Orchestrator(config, llm);
    const sess = new Session(sessionName);
    setOrchestrator(orch);
    setSession(sess);
    const unsubscribe = messageBus.subscribe((message) => {
      setMessages((prev) => [...prev, message]);
      sess.addMessage(message);
    });
    const updateAgents = () => {
      setAgents(orch.getState().agents);
    };
    orch.on("status_change", updateAgents);
    orch.on("task_complete", updateAgents);
    return () => {
      unsubscribe();
      orch.removeAllListeners();
    };
  }, [config, sessionName]);
  useEffect(() => {
    if (!orchestrator) return;
    const timer = setInterval(() => {
      setAgents(orchestrator.getState().agents);
    }, 500);
    return () => clearInterval(timer);
  }, [orchestrator]);
  const handleInput = useCallback(async (input) => {
    if (!orchestrator || !session) return;
    if (input.trim() === "") return;
    if (input.startsWith("/")) {
      handleCommand(input);
      return;
    }
    setIsLoading(true);
    const userMessage = {
      id: `msg-${Date.now()}`,
      type: "user_input",
      from: "user",
      content: input,
      timestamp: /* @__PURE__ */ new Date()
    };
    setMessages((prev) => [...prev, userMessage]);
    session.addMessage(userMessage);
    try {
      await orchestrator.processUserInput(input);
    } catch (error) {
      const errorMessage = {
        id: `msg-${Date.now()}`,
        type: "system",
        from: "system",
        content: `\u9519\u8BEF: ${error.message}`,
        timestamp: /* @__PURE__ */ new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      if (config.sessions.auto_save) {
        session.save();
      }
    }
  }, [orchestrator, session, config]);
  const handleCommand = useCallback((input) => {
    const cmd = input.slice(1).trim().split(" ")[0];
    const args = input.slice(1).trim().split(" ").slice(1).join(" ");
    switch (cmd) {
      case "quit":
      case "exit":
        session?.save();
        exit();
        break;
      case "clear":
        setMessages([]);
        break;
      case "reset":
        orchestrator?.resetAllAgents();
        setMessages([]);
        break;
      case "save":
        session?.save();
        break;
      case "agents":
        setActivePanel((prev) => prev === "agents" ? "chat" : "agents");
        break;
      case "help":
        const helpMessage = {
          id: `msg-${Date.now()}`,
          type: "system",
          from: "system",
          content: `\u53EF\u7528\u547D\u4EE4:
/quit, /exit    - \u9000\u51FA\u7A0B\u5E8F
/clear          - \u6E05\u5C4F
/reset          - \u91CD\u7F6E\u6240\u6709 Agent
/save           - \u4FDD\u5B58\u4F1A\u8BDD
/agents         - \u5207\u6362 Agent \u9762\u677F
/help           - \u663E\u793A\u5E2E\u52A9\u4FE1\u606F`,
          timestamp: /* @__PURE__ */ new Date()
        };
        setMessages((prev) => [...prev, helpMessage]);
        break;
      default:
        const unknownCmd = {
          id: `msg-${Date.now()}`,
          type: "system",
          from: "system",
          content: `\u672A\u77E5\u547D\u4EE4: ${cmd}\u3002\u8F93\u5165 /help \u67E5\u770B\u53EF\u7528\u547D\u4EE4\u3002`,
          timestamp: /* @__PURE__ */ new Date()
        };
        setMessages((prev) => [...prev, unknownCmd]);
    }
  }, [orchestrator, session, exit]);
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      session?.save();
      exit();
    }
    if (key.tab) {
      setActivePanel((prev) => prev === "agents" ? "chat" : "agents");
    }
  });
  return /* @__PURE__ */ React5.createElement(Box5, { flexDirection: "column", height: "100%" }, /* @__PURE__ */ React5.createElement(
    Header,
    {
      sessionName: session?.getName() || "\u672A\u547D\u540D",
      agentCount: agents.length,
      messageCount: messages.length
    }
  ), /* @__PURE__ */ React5.createElement(Box5, { flexDirection: "row", flexGrow: 1 }, /* @__PURE__ */ React5.createElement(
    ChatPanel,
    {
      messages,
      isLoading,
      active: activePanel === "chat"
    }
  ), /* @__PURE__ */ React5.createElement(
    AgentStatusPanel,
    {
      agents,
      active: activePanel === "agents"
    }
  )), /* @__PURE__ */ React5.createElement(
    InputBar,
    {
      onSubmit: handleInput,
      isLoading,
      disabled: isLoading
    }
  ));
}
var init_App = __esm({
  "src/tui/App.tsx"() {
    "use strict";
    init_Header();
    init_ChatPanel();
    init_AgentStatus();
    init_InputBar();
    init_orchestrator();
    init_session();
    init_client();
    init_message_bus();
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
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}
function askPassword(question) {
  return new Promise((resolve) => {
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
        resolve(password);
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
  const fs3 = await import("fs");
  if (fs3.existsSync(configDir)) {
    fs3.rmSync(configDir, { recursive: true, force: true });
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
  program2.name("openagents").description("Terminal multi-agent collaboration tool").version("1.0.0");
  program2.command("start", { isDefault: true }).description("Start an interactive session").option("-n, --name <name>", "Session name").action(async (options) => {
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
  configCmd.command("reset").description("Reset configuration to defaults").action(async () => {
    const readline2 = await import("readline");
    const rl2 = readline2.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl2.question("\u786E\u8BA4\u91CD\u7F6E\u914D\u7F6E\uFF1F(y/N): ", (answer) => {
      if (answer.toLowerCase() === "y") {
        const { getDefaultConfig: getDefaultConfig2 } = (init_defaults(), __toCommonJS(defaults_exports));
        saveConfig(getDefaultConfig2());
        console.log("\u914D\u7F6E\u5DF2\u91CD\u7F6E\u4E3A\u9ED8\u8BA4\u503C\u3002");
      } else {
        console.log("\u64CD\u4F5C\u5DF2\u53D6\u6D88\u3002");
      }
      rl2.close();
    });
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
      console.log(`${i + 1}. ${s.name}`);
      console.log(`   ID: ${s.id}`);
      console.log(`   \u66F4\u65B0\u65F6\u95F4: ${new Date(s.updatedAt).toLocaleString()}`);
      console.log(`   \u6D88\u606F\u6570: ${s.messages.length}`);
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
      console.log(`  Provider: ${agentConfig.provider}`);
      console.log(`  Model: ${agentConfig.model}`);
      console.log(`  Temperature: ${agentConfig.temperature}`);
      console.log(`  Enabled: ${agentConfig.enabled}`);
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
      await startApp(options.name);
    });
  }
});
program.action(async () => {
  await startApp();
});
async function startApp(sessionName) {
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
    const React6 = await import("react");
    const { render } = await import("ink");
    const { App: App2 } = await Promise.resolve().then(() => (init_App(), App_exports));
    const { waitUntilExit } = render(
      React6.createElement(App2, { config, sessionName })
    );
    await waitUntilExit();
  } catch (error) {
    console.error("\u542F\u52A8\u5931\u8D25:", error.message);
    process.exit(1);
  }
}
program.parse();
//# sourceMappingURL=index.js.map