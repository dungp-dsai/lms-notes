export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface NoteListItem {
  id: string;
  title: string;
  updated_at: string;
  tags: Tag[];
}

export interface NoteDetail {
  id: string;
  title: string;
  content: string;
  original_text: string;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface NoteSearchResult {
  id: string;
  title: string;
}

export interface BacklinkItem {
  id: string;
  title: string;
}

export interface ImageUploadResponse {
  id: string;
  url: string;
  filename: string;
}

export interface TaskListItem {
  id: string;
  tag_id: string;
  title: string;
  task_type: "coding" | "answering";
  status: "pending" | "completed";
  result: "correct" | "wrong" | null;
}

export interface TaskDetail {
  id: string;
  tag_id: string;
  title: string;
  description: string;
  task_type: "coding" | "answering";
  status: "pending" | "completed";
  result: "correct" | "wrong" | null;
  language: string | null;
  starter_code: string | null;
  test_code: string | null;
  expected_answer: string | null;
  user_answer: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagTaskStats {
  tag_id: string;
  pending: number;
  completed: number;
  correct: number;
  wrong: number;
}

export interface TaskFrequencyConfig {
  frequency: number;
  times: string[];
}

export interface TagSettings {
  tag_id: string;
  coding: TaskFrequencyConfig;
  answering: TaskFrequencyConfig;
  revising: TaskFrequencyConfig;
}

export interface ScheduledJob {
  id: string;
  name: string;
  next_run_time: string;
  next_run_relative: string;
}

const API_HOST = import.meta.env.VITE_API_URL || "";
const BASE = `${API_HOST}/api`;

export function resolveUploadUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_HOST}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listNotes: (tagId?: string, untagged?: boolean) => {
    const params = new URLSearchParams();
    if (tagId) params.set("tag_id", tagId);
    if (untagged) params.set("untagged", "true");
    const query = params.toString();
    return request<NoteListItem[]>(query ? `/notes?${query}` : "/notes");
  },

  getNote: (id: string) => request<NoteDetail>(`/notes/${id}`),

  createNote: (data: { title?: string; content?: string; original_text?: string; tag_ids?: string[] } = {}) =>
    request<NoteDetail>("/notes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateNote: (id: string, data: { title?: string; content?: string; original_text?: string; tag_ids?: string[] }) =>
    request<NoteDetail>(`/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteNote: (id: string) =>
    request<void>(`/notes/${id}`, { method: "DELETE" }),

  searchNotes: (q: string) =>
    request<NoteSearchResult[]>(`/notes/search?q=${encodeURIComponent(q)}`),

  getBacklinks: (id: string) =>
    request<BacklinkItem[]>(`/notes/${id}/backlinks`),

  uploadImage: async (file: File): Promise<ImageUploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/images/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  },

  listTags: () => request<Tag[]>("/tags"),

  createTag: (data: { name: string; color?: string }) =>
    request<Tag>("/tags", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTag: (id: string, data: { name: string; color: string }) =>
    request<Tag>(`/tags/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTag: (id: string) => request<void>(`/tags/${id}`, { method: "DELETE" }),

  listTasks: (tagId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (tagId) params.set("tag_id", tagId);
    if (status) params.set("status", status);
    const query = params.toString();
    return request<TaskListItem[]>(query ? `/tasks?${query}` : "/tasks");
  },

  getTaskStats: () => request<TagTaskStats[]>("/tasks/stats"),

  getTask: (id: string) => request<TaskDetail>(`/tasks/${id}`),

  createTask: (data: {
    tag_id: string;
    title: string;
    description?: string;
    task_type: "coding" | "answering";
    language?: string;
    starter_code?: string;
    test_code?: string;
    expected_answer?: string;
  }) =>
    request<TaskDetail>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  submitTask: (id: string, answer: string) =>
    request<TaskDetail>(`/tasks/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    }),

  updateTaskResult: (id: string, result: "correct" | "wrong") =>
    request<TaskDetail>(`/tasks/${id}/result?result=${result}`, {
      method: "POST",
    }),

  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),

  listSettings: () => request<TagSettings[]>("/settings"),

  getSettings: (tagId: string) => request<TagSettings>(`/settings/${tagId}`),

  updateSettings: (tagId: string, data: Partial<{
    coding: TaskFrequencyConfig;
    answering: TaskFrequencyConfig;
    revising: TaskFrequencyConfig;
  }>) =>
    request<TagSettings>(`/settings/${tagId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getScheduledJobs: () => request<ScheduledJob[]>("/scheduler/jobs"),

  syncScheduler: () => request<{ status: string; jobs_count: number }>("/scheduler/sync", { method: "POST" }),

  testTelegram: (message?: string) =>
    request<{ status: string; message_sent: boolean }>("/scheduler/test-telegram", {
      method: "POST",
      body: JSON.stringify({ message: message || "Hello from LMS Notes! 👋" }),
    }),
};
