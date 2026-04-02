import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useNoteList() {
  return useQuery({
    queryKey: ["notes"],
    queryFn: api.listNotes,
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
    mutationFn: (data?: { title?: string; content?: string }) =>
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
