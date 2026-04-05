import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Code,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTask, useSubmitTask, useUpdateTaskResult } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";

export function TaskPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { data: task, isLoading } = useTask(taskId || null);

  useEffect(() => {
    if (task && task.task_type === "revising" && task.note_id) {
      navigate(`/notes/${task.note_id}?revision=${task.id}`, { replace: true });
    }
  }, [task, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">Task not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (task.task_type === "revising") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            {task.task_type === "coding" ? (
              <Code className="h-5 w-5 text-blue-500" />
            ) : (
              <MessageSquare className="h-5 w-5 text-purple-500" />
            )}
            <h1 className="text-lg font-semibold">{task.title}</h1>
          </div>
          {task.status === "completed" && task.result && (
            <div
              className={cn(
                "ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium",
                task.result === "correct"
                  ? "bg-green-500/10 text-green-500"
                  : "bg-red-500/10 text-red-500"
              )}
            >
              {task.result === "correct" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Correct
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Wrong
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {task.task_type === "coding" ? (
        <CodingTask task={task} />
      ) : (
        <AnsweringTask task={task} />
      )}
    </div>
  );
}

interface TaskProps {
  task: {
    id: string;
    title: string;
    description: string;
    task_type: "coding" | "answering" | "revising";
    status: "pending" | "completed";
    result: "correct" | "wrong" | null;
    language: string | null;
    starter_code: string | null;
    test_code: string | null;
    expected_answer: string | null;
    user_answer: string | null;
    note_id: string | null;
    revision_explanation: string | null;
    original_note_content: string | null;
  };
}

function CodingTask({ task }: TaskProps) {
  const [code, setCode] = useState(task.user_answer || task.starter_code || "");
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const submitTask = useSubmitTask();
  const updateResult = useUpdateTaskResult();

  const language = task.language || "python";
  const isCompleted = task.status === "completed";

  const runCode = async () => {
    setIsRunning(true);
    setOutput("");

    try {
      const fullCode = task.test_code
        ? `${code}\n\n# Test code\n${task.test_code}`
        : code;

      const response = await fetch("https://api.codapi.org/v1/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sandbox: language,
          command: "run",
          files: { "": fullCode },
        }),
      });

      const result = await response.json();

      if (result.ok) {
        setOutput(result.stdout || "No output");

        if (!isCompleted) {
          await submitTask.mutateAsync({ id: task.id, answer: code });

          const passed =
            !result.stderr &&
            result.stdout &&
            !result.stdout.toLowerCase().includes("error") &&
            !result.stdout.toLowerCase().includes("fail");

          await updateResult.mutateAsync({
            id: task.id,
            result: passed ? "correct" : "wrong",
          });
        }
      } else {
        setOutput(result.stderr || "Execution failed");
        if (!isCompleted) {
          await submitTask.mutateAsync({ id: task.id, answer: code });
          await updateResult.mutateAsync({ id: task.id, result: "wrong" });
        }
      }
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {task.description && (
        <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {task.description}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-muted-foreground">
              Code ({language})
            </label>
            <Button
              onClick={runCode}
              disabled={isRunning || !code.trim()}
              size="sm"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run
            </Button>
          </div>
          <Textarea
            value={code}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCode(e.target.value)}
            placeholder="Write your code here..."
            className="font-mono text-sm min-h-[400px] resize-none"
            disabled={isCompleted}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            Output
          </label>
          <div className="min-h-[400px] p-4 rounded-md bg-zinc-900 border border-border font-mono text-sm text-green-400 whitespace-pre-wrap overflow-auto">
            {output || (
              <span className="text-muted-foreground">
                Click "Run" to execute your code
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnsweringTask({ task }: TaskProps) {
  const [answer, setAnswer] = useState(task.user_answer || "");
  const submitTask = useSubmitTask();
  const isCompleted = task.status === "completed";

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    await submitTask.mutateAsync({ id: task.id, answer });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      {task.description && (
        <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {task.description}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <label className="text-sm font-medium text-muted-foreground">
          Your Answer
        </label>
        <Textarea
          value={answer}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswer(e.target.value)}
          placeholder="Type your answer here..."
          className="min-h-[200px] resize-none"
          disabled={isCompleted}
        />

        {!isCompleted && (
          <Button
            onClick={handleSubmit}
            disabled={submitTask.isPending || !answer.trim()}
            className="w-full"
          >
            {submitTask.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit Answer
          </Button>
        )}

        {isCompleted && task.expected_answer && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Expected Answer
            </p>
            <p className="text-sm text-foreground">{task.expected_answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}

