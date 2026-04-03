import { useState } from "react";
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
} from "@/hooks/useNotes";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
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

  const { data: notes = [], isLoading } = useNoteList(selectedTagId, showUntagged);
  const { data: tags = [] } = useTags();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const handleCreate = async () => {
    const tagIds = selectedTagId ? [selectedTagId] : [];
    const note = await createNote.mutateAsync({ title: "Untitled", tag_ids: tagIds });
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
            <button
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={cn(
                "group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer",
                activeNoteId === note.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-muted-foreground"
              )}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="truncate block">{note.title}</span>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
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
              </div>
              <button
                onClick={(e) => handleDelete(e, note.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 mt-0.5"
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
