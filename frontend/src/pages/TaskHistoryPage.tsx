import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Code,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Filter,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks, useTags, useRedoTask } from "@/hooks/useNotes";

type TaskType = "all" | "coding" | "answering" | "revising";
type StatusFilter = "all" | "completed" | "skipped";
type ResultFilter = "all" | "correct" | "wrong";

export function TaskHistoryPage() {
  const navigate = useNavigate();
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const { data: completedTasks = [] } = useTasks(
    selectedTagId || undefined,
    "completed"
  );
  const { data: skippedTasks = [], isLoading } = useTasks(
    selectedTagId || undefined,
    "skipped"
  );
  const { data: tags = [] } = useTags();
  const redoTask = useRedoTask();

  const allTasks = [...completedTasks, ...skippedTasks].sort(
    (a, b) => new Date(b.id).getTime() - new Date(a.id).getTime()
  );

  const filteredTasks = allTasks.filter((task) => {
    if (taskTypeFilter !== "all" && task.task_type !== taskTypeFilter) {
      return false;
    }
    if (statusFilter !== "all" && task.status !== statusFilter) {
      return false;
    }
    if (resultFilter !== "all" && task.result !== resultFilter) {
      return false;
    }
    return true;
  });

  const handleRedo = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await redoTask.mutateAsync(taskId);
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "coding":
        return <Code className="h-4 w-4 text-blue-500" />;
      case "answering":
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case "revising":
        return <BookOpen className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const getTagName = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    return tag?.name || "Unknown";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Task History</h1>
          <span className="text-sm text-muted-foreground">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>

          <select
            value={selectedTagId || ""}
            onChange={(e) => setSelectedTagId(e.target.value || null)}
            className="text-sm px-3 py-1.5 rounded-md border border-border bg-background"
          >
            <option value="">All Tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>

          <select
            value={taskTypeFilter}
            onChange={(e) => setTaskTypeFilter(e.target.value as TaskType)}
            className="text-sm px-3 py-1.5 rounded-md border border-border bg-background"
          >
            <option value="all">All Types</option>
            <option value="coding">Coding</option>
            <option value="answering">Answering</option>
            <option value="revising">Revising</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="text-sm px-3 py-1.5 rounded-md border border-border bg-background"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="skipped">Skipped</option>
          </select>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as ResultFilter)}
            className="text-sm px-3 py-1.5 rounded-md border border-border bg-background"
          >
            <option value="all">All Results</option>
            <option value="correct">Correct</option>
            <option value="wrong">Wrong</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tasks found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(`/task/${task.id}`)}
                className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getTaskIcon(task.task_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {getTagName(task.tag_id)} · {task.task_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === "skipped" ? (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-500/10 text-gray-500">
                        <SkipForward className="h-3 w-3" />
                        Skipped
                      </span>
                    ) : task.result === "correct" ? (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                        <CheckCircle2 className="h-3 w-3" />
                        Correct
                      </span>
                    ) : task.result === "wrong" ? (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-500">
                        <XCircle className="h-3 w-3" />
                        Wrong
                      </span>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleRedo(task.id, e)}
                      disabled={redoTask.isPending}
                      className="h-8"
                    >
                      {redoTask.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Redo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
