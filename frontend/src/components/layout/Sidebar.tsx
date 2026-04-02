import { useState } from "react";
import { Plus, Search, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNoteList, useCreateNote, useDeleteNote } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
}

export function Sidebar({ activeNoteId, onSelectNote }: SidebarProps) {
  const [search, setSearch] = useState("");
  const { data: notes = [], isLoading } = useNoteList();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const handleCreate = async () => {
    const note = await createNote.mutateAsync({ title: "Untitled" });
    onSelectNote(note.id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (activeNoteId === id) {
      const remaining = notes.filter((n) => n.id !== id);
      if (remaining.length > 0) onSelectNote(remaining[0].id);
    }
    deleteNote.mutate(id);
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 p-3">
        <h1 className="text-sm font-semibold tracking-tight flex-1">Notes</h1>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={handleCreate}
          disabled={createNote.isPending}
          title="Add Card"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-sidebar-border/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-2">
          {isLoading && (
            <div className="px-2 py-4 text-xs text-muted-foreground">
              Loading...
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-2 py-4 text-xs text-muted-foreground text-center">
              {search ? "No matching notes" : "No notes yet. Click + to create one."}
            </div>
          )}
          {filtered.map((note) => (
            <button
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={cn(
                "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer",
                activeNoteId === note.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-muted-foreground"
              )}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{note.title}</span>
              <button
                onClick={(e) => handleDelete(e, note.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
