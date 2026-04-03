import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  FileText,
  Tag as TagIcon,
  ChevronDown,
  ChevronRight,
  Code,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useNoteList,
  useTags,
  useCreateNote,
  useTaskStats,
  useTasks,
} from "@/hooks/useNotes";
import { cn } from "@/lib/utils";
import { SettingsModal } from "@/components/SettingsModal";

const TAG_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export function HomePage() {
  const navigate = useNavigate();
  const { data: notes = [] } = useNoteList();
  const { data: tags = [] } = useTags();
  const { data: taskStats = [] } = useTaskStats();
  const createNote = useCreateNote();
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const taskStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { pending: number; completed: number; correct: number; wrong: number }
    >();
    taskStats.forEach((stat) => {
      map.set(stat.tag_id, stat);
    });
    return map;
  }, [taskStats]);

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
      noteCount: stats.get(tag.id) || 0,
      displayColor: TAG_COLORS[index % TAG_COLORS.length],
      tasks: taskStatsMap.get(tag.id) || {
        pending: 0,
        completed: 0,
        correct: 0,
        wrong: 0,
      },
    }));
  }, [notes, tags, taskStatsMap]);

  const untaggedCount = useMemo(() => {
    return notes.filter((note) => note.tags.length === 0).length;
  }, [notes]);

  const handleCreateNote = async () => {
    const note = await createNote.mutateAsync({ title: "Untitled" });
    navigate(`/notes/${note.id}`);
  };

  const toggleExpand = (tagId: string) => {
    setExpandedTag(expandedTag === tagId ? null : tagId);
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={handleCreateNote} disabled={createNote.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center gap-2 mb-2">
            <TagIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Tags & Review Tasks</h2>
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
                <TagRow
                  key={tag.id}
                  tag={tag}
                  isExpanded={expandedTag === tag.id}
                  onToggle={() => toggleExpand(tag.id)}
                  onNavigateNotes={() => navigate(`/notes?tag=${tag.id}`)}
                />
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

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

interface TagRowProps {
  tag: {
    id: string;
    name: string;
    displayColor: string;
    noteCount: number;
    tasks: { pending: number; completed: number; correct: number; wrong: number };
  };
  isExpanded: boolean;
  onToggle: () => void;
  onNavigateNotes: () => void;
}

function TagRow({ tag, isExpanded, onToggle, onNavigateNotes }: TagRowProps) {
  const navigate = useNavigate();
  const { data: pendingTasks = [] } = useTasks(
    isExpanded ? tag.id : undefined,
    isExpanded ? "pending" : undefined
  );

  const hasTasks =
    tag.tasks.pending > 0 ||
    tag.tasks.completed > 0;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={hasTasks ? onToggle : onNavigateNotes}
      >
        {hasTasks ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: tag.displayColor }}
        />
        <span className="flex-1 text-left font-medium text-foreground">
          {tag.name}
        </span>

        {(tag.tasks.pending > 0 || tag.tasks.completed > 0) && (
          <div className="flex items-center gap-3 text-sm">
            {tag.tasks.pending > 0 && (
              <div className="flex items-center gap-1 text-amber-500">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">{tag.tasks.pending}</span>
              </div>
            )}
            {tag.tasks.correct > 0 && (
              <div className="flex items-center gap-1 text-green-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">{tag.tasks.correct}</span>
              </div>
            )}
            {tag.tasks.wrong > 0 && (
              <div className="flex items-center gap-1 text-red-500">
                <XCircle className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">{tag.tasks.wrong}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <FileText className="h-4 w-4" />
          <span className="font-mono">{tag.noteCount}</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onNavigateNotes();
          }}
        >
          View Notes
        </Button>
      </div>

      {isExpanded && pendingTasks.length > 0 && (
        <div className="border-t border-border bg-muted/30">
          <div className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Pending Tasks
            </p>
            <div className="space-y-1">
              {pendingTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => navigate(`/task/${task.id}`)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-accent transition-colors cursor-pointer text-left",
                    "border border-transparent hover:border-border"
                  )}
                >
                  {task.task_type === "coding" ? (
                    <Code className="h-4 w-4 text-blue-500 shrink-0" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-purple-500 shrink-0" />
                  )}
                  <span className="flex-1 text-sm truncate">{task.title}</span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                    {task.task_type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isExpanded && pendingTasks.length === 0 && tag.tasks.pending === 0 && (
        <div className="border-t border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          No pending tasks
        </div>
      )}
    </div>
  );
}
