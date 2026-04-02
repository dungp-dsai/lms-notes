import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useNoteList(tagId?: string | null) {
  return useQuery({
    queryKey: ["notes", { tagId }],
    queryFn: () => api.listNotes(tagId || undefined),
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
