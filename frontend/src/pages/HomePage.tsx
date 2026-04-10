import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  FileText,
  Tag as TagIcon,
  ChevronDown,
  ChevronRight,
  Code,
  MessageSquare,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Settings,
  History,
  SkipForward,
  Shield,
  Info,
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
import { showToast } from "@/components/ui/toast";

const FOCUS_MODE_KEY = "lms_focus_mode";
const FOCUS_MODE_LIMIT = 5;

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
  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem(FOCUS_MODE_KEY) === "true";
  });
  const [showFocusInfo, setShowFocusInfo] = useState(false);

  // Persist focus mode to localStorage
  useEffect(() => {
    localStorage.setItem(FOCUS_MODE_KEY, focusMode.toString());
    // Broadcast to other components
    window.dispatchEvent(new CustomEvent("focus-mode-changed", { detail: { enabled: focusMode } }));
  }, [focusMode]);

  const taskStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { pending: number; completed: number; correct: number; wrong: number; skipped: number }
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
        skipped: 0,
      },
    }));
  }, [notes, tags, taskStatsMap]);

  const untaggedCount = useMemo(() => {
    return notes.filter((note) => note.tags.length === 0).length;
  }, [notes]);

  // Check if any tag exceeds the pending task limit
  const tagsOverLimit = useMemo(() => {
    if (!focusMode) return [];
    return tagStats.filter((tag) => tag.tasks.pending >= FOCUS_MODE_LIMIT);
  }, [focusMode, tagStats]);

  const handleCreateNote = async () => {
    // If focus mode is on and ALL tags are over the limit, block creation
    if (focusMode && tagsOverLimit.length === tagStats.length && tagStats.length > 0) {
      showToast(
        `Focus Mode: Complete pending tasks first. All tags have ${FOCUS_MODE_LIMIT}+ pending tasks.`,
        "error"
      );
      return;
    }
    
    try {
      const note = await createNote.mutateAsync({ title: "Untitled" });
      navigate(`/notes/${note.id}`);
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, "error");
      }
    }
  };

  const toggleExpand = (tagId: string) => {
    setExpandedTag(expandedTag === tagId ? null : tagId);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Notes</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {notes.length} {notes.length === 1 ? "card" : "cards"} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Focus Mode Toggle */}
            <div className="relative flex items-center">
              <button
                onClick={() => setFocusMode(!focusMode)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors",
                  focusMode
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                )}
                title="Focus Mode"
              >
                <Shield className="h-4 w-4" />
                <span className="text-xs font-medium hidden sm:inline">Focus</span>
              </button>
              <button
                onClick={() => setShowFocusInfo(!showFocusInfo)}
                className="p-1 text-muted-foreground hover:text-foreground"
                title="What is Focus Mode?"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {showFocusInfo && (
                <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-popover border border-border rounded-lg shadow-lg z-50 text-sm">
                  <p className="font-medium mb-1">Focus Mode</p>
                  <p className="text-muted-foreground text-xs">
                    When enabled, you cannot add notes to a tag that has {FOCUS_MODE_LIMIT}+ pending tasks. 
                    Complete your existing tasks first to stay focused!
                  </p>
                  <button
                    onClick={() => setShowFocusInfo(false)}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Got it
                  </button>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettings(true)}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={handleCreateNote} disabled={createNote.isPending} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center gap-2 mb-2">
            <TagIcon className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base sm:text-lg font-semibold">Tags & Review Tasks</h2>
          </div>

          {tagStats.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <TagIcon className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p>No tags yet</p>
              <p className="text-sm mt-1">Create tags from the notes page</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-hidden">
              {tagStats.map((tag) => (
                <TagRow
                  key={tag.id}
                  tag={tag}
                  isExpanded={expandedTag === tag.id}
                  onToggle={() => toggleExpand(tag.id)}
                  onNavigateNotes={() => navigate(`/notes?tag=${tag.id}`)}
                  focusMode={focusMode}
                  isOverLimit={focusMode && tag.tasks.pending >= FOCUS_MODE_LIMIT}
                />
              ))}

              {untaggedCount > 0 && (
                <button
                  onClick={() => navigate("/notes?untagged=true")}
                  className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-dashed border-border hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <div className="w-3 h-3 rounded-full shrink-0 border-2 border-muted-foreground/50" />
                  <span className="flex-1 text-left text-sm sm:text-base font-medium text-muted-foreground group-hover:text-foreground">
                    Untagged
                  </span>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="font-mono text-xs sm:text-sm">
                      {untaggedCount} {untaggedCount === 1 ? "card" : "cards"}
                    </span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-border flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/notes")}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-2" />
            View All Notes
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/tasks/history")}
            className="flex-1"
          >
            <History className="h-4 w-4 mr-2" />
            Task History
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
    tasks: { pending: number; completed: number; correct: number; wrong: number; skipped: number };
  };
  isExpanded: boolean;
  onToggle: () => void;
  onNavigateNotes: () => void;
  focusMode?: boolean;
  isOverLimit?: boolean;
}

function TagRow({ tag, isExpanded, onToggle, onNavigateNotes, isOverLimit }: TagRowProps) {
  const navigate = useNavigate();
  const { data: pendingTasks = [] } = useTasks(
    isExpanded ? tag.id : undefined,
    isExpanded ? "pending" : undefined
  );

  const hasTasks =
    tag.tasks.pending > 0 ||
    tag.tasks.completed > 0 ||
    tag.tasks.skipped > 0;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden max-w-full">
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={hasTasks ? onToggle : onNavigateNotes}
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {hasTasks ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )
          ) : (
            <div className="w-4 shrink-0" />
          )}
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: tag.displayColor }}
          />
          <span className="flex-1 text-left text-sm sm:text-base font-medium text-foreground truncate">
            {tag.name}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-10 sm:ml-0 flex-wrap">
          {(tag.tasks.pending > 0 || tag.tasks.completed > 0 || tag.tasks.skipped > 0) && (
            <div className="flex items-center gap-2 sm:gap-3 text-sm">
              {tag.tasks.pending > 0 && (
                <div className={cn(
                  "flex items-center gap-1",
                  isOverLimit ? "text-red-500" : "text-amber-500"
                )}>
                  {isOverLimit && <Shield className="h-3.5 w-3.5" />}
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-mono text-xs">{tag.tasks.pending}</span>
                  {isOverLimit && (
                    <span className="text-[10px] font-medium ml-0.5">LIMIT</span>
                  )}
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
              {tag.tasks.skipped > 0 && (
                <div className="flex items-center gap-1 text-gray-500">
                  <SkipForward className="h-3.5 w-3.5" />
                  <span className="font-mono text-xs">{tag.tasks.skipped}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <FileText className="h-4 w-4" />
            <span className="font-mono text-xs sm:text-sm">{tag.noteCount}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateNotes();
            }}
          >
            View Notes
          </Button>
        </div>
      </div>

      {isExpanded && pendingTasks.length > 0 && (
        <div className="border-t border-border bg-muted/30">
          <div className="p-2 sm:p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Pending Tasks
            </p>
            <div className="space-y-1">
              {pendingTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => navigate(`/task/${task.id}`)}
                  className={cn(
                    "w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-md hover:bg-accent transition-colors cursor-pointer text-left",
                    "border border-transparent hover:border-border",
                    "min-w-0 overflow-hidden"
                  )}
                >
                  {task.task_type === "coding" ? (
                    <Code className="h-4 w-4 text-blue-500 shrink-0" />
                  ) : task.task_type === "revising" ? (
                    <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-purple-500 shrink-0" />
                  )}
                  <span className="flex-1 text-xs sm:text-sm truncate min-w-0">{task.title}</span>
                  <span className={cn(
                    "text-xs px-1.5 sm:px-2 py-0.5 rounded shrink-0",
                    task.task_type === "revising" 
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {task.task_type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isExpanded && pendingTasks.length === 0 && tag.tasks.pending === 0 && (
        <div className="border-t border-border bg-muted/30 p-3 sm:p-4 text-center text-sm text-muted-foreground">
          No pending tasks
        </div>
      )}
    </div>
  );
}
