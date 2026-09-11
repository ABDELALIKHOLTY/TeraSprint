export interface SubTask {
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  story_points: number;
  us_title?: string;
  epic_title?: string;
  subtasks?: (string | SubTask)[];
  estimated_hours?: number;
  start_date?: string;
  end_date?: string;
  taskNumber?: number;
}

export interface UserStory {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  story_points: number;
  acceptance_criteria: string[];
  tasks: Task[];
}

export interface Epic {
  id: string;
  title: string;
  user_stories: UserStory[];
}

export interface Backlog {
  project_title: string;
  architecture_report?: string;
  columns?: string[];
  epics: Epic[];
}
