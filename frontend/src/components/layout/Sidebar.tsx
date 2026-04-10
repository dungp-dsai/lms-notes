import { useState, useEffect } from "react";
import { Plus, Search, FileText, Trash2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNoteList,
  useCreateNote,
  useDeleteNote,
  useTags,
  useCreateTag,
  useDeleteTag,
  useTaskStats,
} from "@/hooks/useNotes";
import { showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const FOCUS_MODE_KEY = "lms_focus_mode";
const FOCUS_MODE_LIMIT = 5;

interface SidebarProps {
  activeNoteId: string | null;
  onSelectNote: (id: string, title?: string) => void;
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
  showUntagged?: boolean;
  onToggleUntagged?: (untagged: boolean) => void;
}

export function Sidebar({
  activeNoteId,
  onSelectNote,
  selectedTagId,
  onSelectTag,
  showUntagged = false,
  onToggleUntagged,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useNoteList(selectedTagId, showUntagged);
  const { data: allNotes = [] } = useNoteList(); // For duplicate checking
  const { data: tags = [] } = useTags();
  const { data: taskStats = [] } = useTaskStats();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  
  // Focus mode state
  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem(FOCUS_MODE_KEY) === "true";
  });

  // Listen for focus mode changes from HomePage
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setFocusMode(detail.enabled);
    };
    window.addEventListener("focus-mode-changed", handler);
    return () => window.removeEventListener("focus-mode-changed", handler);
  }, []);

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const handleCreate = async () => {
    const tagIds = selectedTagId ? [selectedTagId] : [];
    
    // Check focus mode limit for the selected tag
    if (focusMode && selectedTagId) {
      const tagStat = taskStats.find((s) => s.tag_id === selectedTagId);
      if (tagStat && tagStat.pending >= FOCUS_MODE_LIMIT) {
        const tag = tags.find((t) => t.id === selectedTagId);
        showToast(
          `Focus Mode: "${tag?.name || 'This tag'}" has ${tagStat.pending} pending tasks. Complete some first!`,
          "error"
        );
        return;
      }
    }
    
    // Generate unique title
    let title = "Untitled";
    let counter = 1;
    const existingTitles = new Set(allNotes.map((n) => n.title.toLowerCase()));
    while (existingTitles.has(title.toLowerCase())) {
      title = `Untitled ${counter}`;
      counter++;
    }
    
    try {
      const note = await createNote.mutateAsync({ title, tag_ids: tagIds });
      onSelectNote(note.id, note.title);
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, "error");
      }
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNoteToDelete(id);
  };

  const confirmDeleteNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (noteToDelete) {
      if (activeNoteId === noteToDelete) {
        const remaining = notes.filter((n) => n.id !== noteToDelete);
        if (remaining.length > 0) onSelectNote(remaining[0].id, remaining[0].title);
      }
      deleteNote.mutate(noteToDelete);
      setNoteToDelete(null);
    }
  };

  const cancelDeleteNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteToDelete(null);
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const colors = ["#8b5cf6", "#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#ec4899"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    await createTag.mutateAsync({ name: newTagName.trim(), color });
    setNewTagName("");
    setShowTagInput(false);
  };

  const handleDeleteTag = (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation();
    setTagToDelete(tagId);
  };

  const confirmDeleteTag = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tagToDelete) {
      if (selectedTagId === tagToDelete) onSelectTag(null);
      deleteTag.mutate(tagToDelete);
      setTagToDelete(null);
    }
  };

  const cancelDeleteTag = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTagToDelete(null);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
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

      <div className="px-3 pb-2">
        <div className="flex items-center gap-1 mb-1.5">
          <Tag className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Tags</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 ml-auto"
            onClick={() => setShowTagInput(!showTagInput)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {showTagInput && (
          <form onSubmit={handleCreateTag} className="mb-2">
            <Input
              placeholder="New tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="h-7 text-xs"
              autoFocus
              onBlur={() => {
                if (!newTagName.trim()) setShowTagInput(false);
              }}
            />
          </form>
        )}

        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => tagToDelete !== tag.id && onSelectTag(selectedTagId === tag.id ? null : tag.id)}
              className={cn(
                "group text-xs px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 border",
                tagToDelete === tag.id
                  ? "border-red-500/50 bg-red-500/10 text-red-400"
                  : selectedTagId === tag.id
                  ? "border-foreground/50 bg-accent/50 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {tagToDelete === tag.id ? (
                <>
                  <span>Delete?</span>
                  <span
                    className="text-red-400 hover:text-red-300 font-medium cursor-pointer"
                    onClick={confirmDeleteTag}
                  >
                    Yes
                  </span>
                  <span
                    className="text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                    onClick={cancelDeleteTag}
                  >
                    No
                  </span>
                </>
              ) : (
                <>
                  {tag.name}
                  <X
                    className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125"
                    onClick={(e) => handleDeleteTag(e, tag.id)}
                  />
                </>
              )}
            </button>
          ))}
          {onToggleUntagged && (
            <button
              onClick={() => onToggleUntagged(!showUntagged)}
              className={cn(
                "text-xs px-2 py-0.5 rounded-md transition-colors cursor-pointer border border-dashed",
                showUntagged
                  ? "border-foreground/50 bg-accent/50 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              Untagged
            </button>
          )}
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
              {search
                ? "No matching notes"
                : selectedTagId
                ? "No notes with this tag"
                : showUntagged
                ? "No untagged notes"
                : "No notes yet. Click + to create one."}
            </div>
          )}
          {filtered.map((note) => (
            <div
              key={note.id}
              onClick={() => noteToDelete !== note.id && onSelectNote(note.id, note.title)}
              className={cn(
                "group rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer",
                noteToDelete === note.id
                  ? "bg-red-500/10 border border-red-500/30"
                  : activeNoteId === note.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-muted-foreground"
              )}
            >
              {noteToDelete === note.id ? (
                <div className="flex items-center gap-2 text-xs py-0.5">
                  <span className="text-red-400">Delete this note?</span>
                  <button
                    onClick={confirmDeleteNote}
                    className="text-red-400 hover:text-red-300 font-medium px-2 py-0.5 bg-red-500/20 rounded"
                  >
                    Yes
                  </button>
                  <button
                    onClick={cancelDeleteNote}
                    className="text-muted-foreground hover:text-foreground font-medium px-2 py-0.5 bg-muted rounded"
                  >
                    No
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="truncate flex-1 min-w-0">{note.title}</span>
                    <button
                      onClick={(e) => handleDeleteClick(e, note.id)}
                      className={cn(
                        "p-1 -mr-1 rounded transition-all shrink-0",
                        activeNoteId === note.id
                          ? "text-red-400 hover:bg-red-500/20"
                          : "text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/20"
                      )}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 ml-5">
                      {note.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="text-[10px] px-1.5 py-0 rounded border border-border text-muted-foreground"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
