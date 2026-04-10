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
  task_type: "coding" | "answering" | "revising";
  status: "pending" | "completed" | "skipped";
  result: "correct" | "wrong" | null;
  note_id: string | null;
}

export interface TaskDetail {
  id: string;
  tag_id: string;
  title: string;
  description: string;
  task_type: "coding" | "answering" | "revising";
  status: "pending" | "completed" | "skipped";
  result: "correct" | "wrong" | null;
  language: string | null;
  starter_code: string | null;
  test_code: string | null;
  expected_answer: string | null;
  user_answer: string | null;
  note_id: string | null;
  revision_explanation: string | null;
  original_note_content: string | null;
  evaluation_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagTaskStats {
  tag_id: string;
  pending: number;
  completed: number;
  correct: number;
  wrong: number;
  skipped: number;
}

export interface TaskFrequencyConfig {
  frequency: number;
  times: string[];
  quantity: number;
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

export interface JobHistoryItem {
  id: string;
  job_id: string;
  job_name: string;
  tag_name: string;
  task_type: string;
  status: "success" | "failed";
  message: string;
  tasks_created: number;
  executed_at: string | null;
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
    // Try to get error message from response body
    let errorMessage = `API error: ${res.status}`;
    try {
      const errorData = await res.json();
      if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
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
    task_type: "coding" | "answering" | "revising";
    language?: string;
    starter_code?: string;
    test_code?: string;
    expected_answer?: string;
    note_id?: string;
    revision_explanation?: string;
    original_note_content?: string;
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

  redoTask: (id: string) =>
    request<TaskDetail>(`/tasks/${id}/redo`, { method: "POST" }),

  skipTask: (id: string) =>
    request<TaskDetail>(`/tasks/${id}/skip`, { method: "POST" }),

  submitRevision: (id: string, revisedContent: string) =>
    request<TaskDetail>(`/tasks/${id}/revision`, {
      method: "POST",
      body: JSON.stringify({ revised_content: revisedContent }),
    }),

  triggerRevision: (tagId: string, quantity?: number) =>
    request<TaskDetail[]>(
      `/tasks/trigger-revision/${tagId}${quantity ? `?quantity=${quantity}` : ""}`,
      { method: "POST" }
    ),

  triggerCoding: (tagId: string, quantity?: number) =>
    request<TaskDetail[]>(
      `/tasks/trigger-coding/${tagId}${quantity ? `?quantity=${quantity}` : ""}`,
      { method: "POST" }
    ),

  triggerAnswering: (tagId: string, quantity?: number) =>
    request<TaskDetail[]>(
      `/tasks/trigger-answering/${tagId}${quantity ? `?quantity=${quantity}` : ""}`,
      { method: "POST" }
    ),

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

  getJobHistory: (limit?: number) =>
    request<JobHistoryItem[]>(`/scheduler/history${limit ? `?limit=${limit}` : ""}`),

  syncScheduler: () => request<{ status: string; jobs_count: number }>("/scheduler/sync", { method: "POST" }),

  testTelegram: (message?: string) =>
    request<{ status: string; message_sent: boolean }>("/scheduler/test-telegram", {
      method: "POST",
      body: JSON.stringify({ message: message || "Hello from LMS Notes! 👋" }),
    }),

  evaluateCode: (taskId: string, code: string) =>
    request<CodeEvaluationResult>(`/tasks/${taskId}/evaluate`, {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  evaluateAnswer: (taskId: string, answer: string) =>
    request<AnswerEvaluationResult>(`/tasks/${taskId}/evaluate-answer`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    }),
};

export interface CodeEvaluationResult {
  is_correct: boolean;
  feedback: string;
  concept_understanding: string;
  comment_quality: string;
}

export interface AnswerEvaluationResult {
  is_correct: boolean;
  feedback: string;
}
