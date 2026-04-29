import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { ConfigSchema, type AppConfig } from './schema';
import { getDefaultConfig } from './defaults';

const CONFIG_DIR = path.join(os.homedir(), '.openagents');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.yaml');
const SESSIONS_DIR = path.join(CONFIG_DIR, 'sessions');

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getSessionsDir(): string {
  return SESSIONS_DIR;
}

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE);
}

export function loadConfig(): AppConfig {
  ensureConfigDir();

  if (!configExists()) {
    const defaultConfig = getDefaultConfig();
    saveConfig(defaultConfig);
    return defaultConfig;
  }

  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const raw = yaml.load(content);
    const result = ConfigSchema.safeParse(raw);

    if (!result.success) {
      console.error('配置文件格式错误:');
      result.error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n使用默认配置...');
      return getDefaultConfig();
    }

    return result.data;
  } catch (error) {
    console.error(`读取配置文件失败: ${error}`);
    return getDefaultConfig();
  }
}

export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });
  fs.writeFileSync(CONFIG_FILE, content, 'utf-8');
}

export function updateConfig(updates: Partial<AppConfig>): AppConfig {
  const current = loadConfig();
  const merged = { ...current, ...updates };
  saveConfig(merged);
  return merged;
}
