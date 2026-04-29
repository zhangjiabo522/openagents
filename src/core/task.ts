export interface Task {
  id: string;
  description: string;
  assignee: string;
  dependencies: string[];
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
}

export function createTask(
  description: string,
  assignee: string,
  dependencies: string[] = [],
  priority: 'high' | 'medium' | 'low' = 'medium'
): Task {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    description,
    assignee,
    dependencies,
    priority,
    status: 'pending',
  };
}
