import { z } from 'zod';

export const ProviderSchema = z.object({
  name: z.string(),
  api_key: z.string(),
  base_url: z.string().url(),
  default_model: z.string().optional(),
});

export const AgentConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  system_prompt: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().positive().optional(),
  enabled: z.boolean().default(true),
});

export const OrchestratorConfigSchema = z.object({
  max_concurrent_agents: z.number().positive().default(3),
  auto_decompose: z.boolean().default(true),
  collaboration_mode: z.enum(['hierarchical', 'peer', 'hybrid']).default('hierarchical'),
});

export const SessionsConfigSchema = z.object({
  auto_save: z.boolean().default(true),
  max_history: z.number().positive().default(100),
  storage_dir: z.string().optional(),
});

export const ConfigSchema = z.object({
  providers: z.array(ProviderSchema).min(1),
  agents: z.record(AgentConfigSchema),
  orchestrator: OrchestratorConfigSchema.default({}),
  sessions: SessionsConfigSchema.default({}),
});

export type Provider = z.infer<typeof ProviderSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type OrchestratorConfig = z.infer<typeof OrchestratorConfigSchema>;
export type SessionsConfig = z.infer<typeof SessionsConfigSchema>;
export type AppConfig = z.infer<typeof ConfigSchema>;
