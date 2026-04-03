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

  createNote: (data: { title?: string; content?: string; tag_ids?: string[] } = {}) =>
    request<NoteDetail>("/notes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateNote: (id: string, data: { title?: string; content?: string; tag_ids?: string[] }) =>
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
};
