import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNoteList, useTags, useCreateNote } from "@/hooks/useNotes";

const TAG_COLORS = [
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

export function HomePage() {
  const navigate = useNavigate();
  const { data: notes = [] } = useNoteList();
  const { data: tags = [] } = useTags();
  const createNote = useCreateNote();

  const tagStats = useMemo(() => {
    const stats = new Map<string, number>();
    
    tags.forEach((tag) => {
      stats.set(tag.id, 0);
    });

    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        stats.set(tag.id, (stats.get(tag.id) || 0) + 1);
      });
    });

    return tags.map((tag, index) => ({
      ...tag,
      count: stats.get(tag.id) || 0,
      displayColor: TAG_COLORS[index % TAG_COLORS.length],
    }));
  }, [notes, tags]);

  const untaggedCount = useMemo(() => {
    return notes.filter((note) => note.tags.length === 0).length;
  }, [notes]);

  const handleCreateNote = async () => {
    const note = await createNote.mutateAsync({ title: "Untitled" });
    navigate(`/notes/${note.id}`);
  };

  const handleTagClick = (tagId: string) => {
    navigate(`/notes?tag=${tagId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notes</h1>
            <p className="text-muted-foreground mt-1">
              {notes.length} {notes.length === 1 ? "card" : "cards"} total
            </p>
          </div>
          <Button onClick={handleCreateNote} disabled={createNote.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Add Card
          </Button>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center gap-2 mb-2">
            <TagIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Tags Summary</h2>
          </div>

          {tagStats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tags yet</p>
              <p className="text-sm mt-1">Create tags from the notes page</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tagStats.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.displayColor }}
                  />
                  <span className="flex-1 text-left font-medium text-foreground group-hover:text-foreground">
                    {tag.name}
                  </span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="font-mono text-sm">
                      {tag.count} {tag.count === 1 ? "card" : "cards"}
                    </span>
                  </div>
                </button>
              ))}

              {untaggedCount > 0 && (
                <button
                  onClick={() => navigate("/notes?untagged=true")}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-dashed border-border hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <div className="w-3 h-3 rounded-full shrink-0 border-2 border-muted-foreground/50" />
                  <span className="flex-1 text-left font-medium text-muted-foreground group-hover:text-foreground">
                    Untagged
                  </span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="font-mono text-sm">
                      {untaggedCount} {untaggedCount === 1 ? "card" : "cards"}
                    </span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <Button
            variant="outline"
            onClick={() => navigate("/notes")}
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            View All Notes
          </Button>
        </div>
      </div>
    </div>
  );
}
