# OpenAgents

Terminal multi-agent collaboration CLI tool. A powerful tool where multiple AI agents work together to help you with coding, research, planning, and more.

## Features

- 🤖 **Multi-Agent Collaboration**: Multiple specialized agents work together on your tasks
- 🎯 **Task Decomposition**: Automatically break complex tasks into manageable subtasks
- 💬 **Rich TUI**: Beautiful terminal interface with real-time agent status
- ⚙️ **Configurable**: Support multiple LLM providers with per-agent model configuration
- 💾 **Session Management**: Save and resume your conversations
- 🔄 **Multiple Collaboration Modes**: Hierarchical, peer, and hybrid modes

## Installation

### Quick Install (Recommended)

**Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/zhangjiabo522/openagents/main/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/zhangjiabo522/openagents/main/install.ps1 | iex
```

### Manual Install

```bash
npm install -g openagents
```

### Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)

## Quick Start

1. **Initialize configuration:**
   ```bash
   openagents config init
   ```

2. **Edit configuration file** (`~/.openagents/config.yaml`):
   ```yaml
   providers:
     - name: openai
       api_key: sk-your-api-key
       base_url: https://api.openai.com/v1
     - name: deepseek
       api_key: sk-your-api-key
       base_url: https://api.deepseek.com/v1

   agents:
     planner:
       provider: openai
       model: gpt-4o
       system_prompt: "你是一个任务规划专家..."
       temperature: 0.7
     coder:
       provider: deepseek
       model: deepseek-coder
       system_prompt: "你是一个高级程序员..."
       temperature: 0.3
   ```

3. **Start a session:**
   ```bash
   openagents
   ```

## Usage

### Commands

```bash
openagents              # Start interactive session
openagents start        # Start interactive session (same as above)
openagents config init  # Initialize configuration
openagents config show  # Show current configuration
openagents config path  # Show configuration file path
openagents session list # List saved sessions
openagents agents       # List configured agents
openagents --help       # Show help
openagents --version    # Show version
```

### In-Session Commands

```
/quit, /exit    - Exit the program
/clear          - Clear screen
/reset          - Reset all agents
/save           - Save current session
/agents         - Toggle agent panel
/help           - Show help
```

### Keyboard Shortcuts

- `Tab` - Switch between chat and agent panels
- `Ctrl+C` - Exit

## Configuration

The configuration file is located at `~/.openagents/config.yaml`.

### Providers

Configure multiple LLM providers (any OpenAI-compatible API):

```yaml
providers:
  - name: openai
    api_key: sk-your-api-key
    base_url: https://api.openai.com/v1
  - name: deepseek
    api_key: sk-your-api-key
    base_url: https://api.deepseek.com/v1
  - name: local
    api_key: not-needed
    base_url: http://localhost:11434/v1
```

### Agents

Each agent can use a different provider and model:

```yaml
agents:
  planner:
    provider: openai
    model: gpt-4o
    system_prompt: "Your custom system prompt..."
    temperature: 0.7
    enabled: true
  coder:
    provider: deepseek
    model: deepseek-coder
    system_prompt: "Your custom system prompt..."
    temperature: 0.3
```

### Orchestrator

Configure how agents collaborate:

```yaml
orchestrator:
  max_concurrent_agents: 3
  auto_decompose: true
  collaboration_mode: hierarchical  # hierarchical | peer | hybrid
```

## Built-in Agents

| Agent | Role | Default Model |
|-------|------|---------------|
| **Planner** | Task decomposition and planning | gpt-4o |
| **Coder** | Code writing and implementation | gpt-4o |
| **Reviewer** | Code review and quality assurance | gpt-4o |
| **Researcher** | Technical research and analysis | gpt-4o |

## Collaboration Modes

- **Hierarchical** (default): Planner decomposes tasks → Orchestrator assigns to agents → Results summarized
- **Peer**: All agents discuss and contribute equally
- **Hybrid**: Automatically switches based on task complexity

## Development

```bash
# Clone the repository
git clone https://github.com/zhangjiabo522/openagents.git
cd openagents

# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev

# Link locally for testing
npm link
```

## License

MIT
