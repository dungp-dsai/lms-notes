import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useNoteList(tagId?: string | null, untagged?: boolean) {
  return useQuery({
    queryKey: ["notes", { tagId, untagged }],
    queryFn: () => api.listNotes(tagId || undefined, untagged),
  });
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: ["notes", id],
    queryFn: () => api.getNote(id!),
    enabled: !!id,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: { title?: string; content?: string; tag_ids?: string[] }) =>
      api.createNote(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      content?: string;
      original_text?: string;
      tag_ids?: string[];
    }) => api.updateNote(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["notes", variables.id] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useBacklinks(id: string | null) {
  return useQuery({
    queryKey: ["backlinks", id],
    queryFn: () => api.getBacklinks(id!),
    enabled: !!id,
  });
}

export function useSearchNotes(query: string) {
  return useQuery({
    queryKey: ["notes", "search", query],
    queryFn: () => api.searchNotes(query),
    enabled: query.length >= 0,
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: api.listTags,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => api.createTag(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; color: string }) =>
      api.updateTag(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useTasks(tagId?: string, status?: string) {
  return useQuery({
    queryKey: ["tasks", { tagId, status }],
    queryFn: () => api.listTasks(tagId, status),
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: ["tasks", "stats"],
    queryFn: api.getTaskStats,
  });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => api.getTask(id!),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
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
    }) => api.createTask(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useSubmitTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) =>
      api.submitTask(id, answer),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks", variables.id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTaskResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, result }: { id: string; result: "correct" | "wrong" }) =>
      api.updateTaskResult(id, result),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks", variables.id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useSubmitRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revisedContent }: { id: string; revisedContent: string }) =>
      api.submitRevision(id, revisedContent),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks", variables.id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useTriggerRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, quantity }: { tagId: string; quantity?: number }) =>
      api.triggerRevision(tagId, quantity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useAllSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: api.listSettings,
  });
}

export function useTagSettings(tagId: string | null) {
  return useQuery({
    queryKey: ["settings", tagId],
    queryFn: () => api.getSettings(tagId!),
    enabled: !!tagId,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tagId,
      ...data
    }: {
      tagId: string;
      coding?: { frequency: number; times: string[]; quantity: number };
      answering?: { frequency: number; times: string[]; quantity: number };
      revising?: { frequency: number; times: string[]; quantity: number };
    }) => api.updateSettings(tagId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["settings", variables.tagId] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["scheduled-jobs"] });
    },
  });
}

export function useScheduledJobs() {
  return useQuery({
    queryKey: ["scheduled-jobs"],
    queryFn: () => api.getScheduledJobs(),
    refetchInterval: 30000,
  });
}

export function useJobHistory(limit?: number) {
  return useQuery({
    queryKey: ["job-history", limit],
    queryFn: () => api.getJobHistory(limit),
    refetchInterval: 30000,
  });
}

export function useSyncScheduler() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.syncScheduler(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-jobs"] });
    },
  });
}

export function useTestTelegram() {
  return useMutation({
    mutationFn: (message?: string) => api.testTelegram(message),
  });
}
