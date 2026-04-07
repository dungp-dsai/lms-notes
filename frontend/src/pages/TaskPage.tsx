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
  RotateCcw,
  SkipForward,
  ChevronDown,
  Terminal,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTask, useRedoTask, useSkipTask, useEvaluateCode, useEvaluateAnswer, useNote } from "@/hooks/useNotes";
import type { CodeEvaluationResult, AnswerEvaluationResult } from "@/lib/api";
import { cn } from "@/lib/utils";

export function TaskPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { data: task, isLoading } = useTask(taskId || null);
  const redoTask = useRedoTask();
  const skipTask = useSkipTask();

  useEffect(() => {
    if (task && task.task_type === "revising" && task.note_id) {
      navigate(`/notes/${task.note_id}?revision=${task.id}`, { replace: true });
    }
  }, [task, navigate]);

  const handleRedo = async () => {
    if (taskId) {
      await redoTask.mutateAsync(taskId);
    }
  };

  const handleSkip = async () => {
    if (taskId) {
      await skipTask.mutateAsync(taskId);
      navigate("/");
    }
  };

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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card shrink-0">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {task.task_type === "coding" ? (
              <>
                <Code className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
                <h1 className="text-sm sm:text-lg font-semibold truncate">{task.title}</h1>
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 shrink-0" />
                <h1 className="text-sm sm:text-lg font-semibold truncate">Answering Task</h1>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {task.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkip}
                disabled={skipTask.isPending}
                className="h-8 px-2 sm:px-3"
              >
                {skipTask.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <SkipForward className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Skip</span>
                  </>
                )}
              </Button>
            )}
            {task.status === "skipped" && (
              <>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-500/10 text-gray-500">
                  <SkipForward className="h-4 w-4" />
                  Skipped
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={redoTask.isPending}
                  className="h-8 px-2 sm:px-3"
                >
                  {redoTask.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Redo</span>
                    </>
                  )}
                </Button>
              </>
            )}
            {task.status === "completed" && (
              <>
                {task.result && (
                  <div
                    className={cn(
                      "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium",
                      task.result === "correct"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    )}
                  >
                    {task.result === "correct" ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Correct</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Wrong</span>
                      </>
                    )}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={redoTask.isPending}
                  className="h-8 px-2 sm:px-3"
                >
                  {redoTask.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Redo</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
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
    status: "pending" | "completed" | "skipped";
    result: "correct" | "wrong" | null;
    language: string | null;
    starter_code: string | null;
    test_code: string | null;
    expected_answer: string | null;
    user_answer: string | null;
    note_id: string | null;
    revision_explanation: string | null;
    original_note_content: string | null;
    evaluation_feedback: string | null;
  };
}

const SUPPORTED_LANGUAGES = [
  { id: "python", name: "Python", monaco: "python" },
  { id: "javascript", name: "JavaScript", monaco: "javascript" },
  { id: "typescript", name: "TypeScript", monaco: "typescript" },
  { id: "cpp", name: "C++", monaco: "cpp" },
  { id: "c", name: "C", monaco: "c" },
  { id: "java", name: "Java", monaco: "java" },
  { id: "go", name: "Go", monaco: "go" },
  { id: "rust", name: "Rust", monaco: "rust" },
  { id: "ruby", name: "Ruby", monaco: "ruby" },
  { id: "php", name: "PHP", monaco: "php" },
];

function formatCode(code: string): string {
  if (!code) return "";
  let formatted = code
    .replace(/;\s*/g, ";\n")
    .replace(/\{\s*/g, " {\n")
    .replace(/\}\s*/g, "\n}\n")
    .replace(/\n\s*\n+/g, "\n\n");
  
  const lines = formatted.split("\n");
  let indent = 0;
  const result: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith("}")) {
      indent = Math.max(0, indent - 1);
    }
    
    result.push("  ".repeat(indent) + trimmed);
    
    if (trimmed.endsWith("{")) {
      indent++;
    }
  }
  
  return result.join("\n");
}

function CodingTask({ task }: TaskProps) {
  const [code, setCode] = useState(task.user_answer || task.starter_code || "");
  const [selectedLanguage, setSelectedLanguage] = useState(task.language || "python");
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [evaluation, setEvaluation] = useState<CodeEvaluationResult | null>(() => {
    if (task.evaluation_feedback) {
      try {
        return JSON.parse(task.evaluation_feedback);
      } catch {
        return null;
      }
    }
    return null;
  });
  const evaluateCode = useEvaluateCode();
  const { data: note, isLoading: isNoteLoading } = useNote(task.note_id);
  const navigate = useNavigate();

  const isCompleted = task.status === "completed";
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.id === selectedLanguage) || SUPPORTED_LANGUAGES[0];
  const formattedSolution = task.expected_answer ? formatCode(task.expected_answer) : "";

  const runCode = async () => {
    setIsRunning(true);
    setOutput("");

    try {
      const response = await fetch("https://api.codapi.org/v1/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sandbox: selectedLanguage,
          command: "run",
          files: { "": code },
        }),
      });

      const result = await response.json();

      if (result.ok) {
        setOutput(result.stdout || "No output");
      } else {
        setOutput(result.stderr || "Execution failed");
      }
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    if (!code.trim()) return;
    
    setIsSubmitting(true);
    setEvaluation(null);
    
    try {
      const result = await evaluateCode.mutateAsync({ taskId: task.id, code });
      setEvaluation(result);
    } catch (error) {
      setOutput(`Evaluation error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0">
      <div className="hidden lg:flex w-[340px] border-r border-border bg-zinc-950 flex-col shrink-0">
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Code className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Challenge</span>
          </div>
          <h2 className="text-lg font-semibold text-white leading-tight">
            {task.title}
          </h2>
        </div>
        
        <div className="flex-1 p-5 overflow-auto">
          {task.description && (
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap mb-4">
              {task.description}
            </p>
          )}
          
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs font-medium text-blue-400 mb-1">📝 Note</p>
            <p className="text-sm text-blue-300">
              Explain the code by using comments. The comments are used for evaluation as well.
            </p>
          </div>

          {task.note_id && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs font-medium text-emerald-400 mb-2">📚 Study Material</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNote(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-sm font-medium text-white"
                >
                  <BookOpen className="h-4 w-4" />
                  Review Note
                </button>
                <button
                  onClick={() => navigate(`/notes/${task.note_id}`)}
                  className="flex items-center justify-center px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors text-sm font-medium text-zinc-300"
                  title="Open note in editor"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {task.expected_answer && (
          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={() => setShowSolution(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 transition-colors text-sm font-medium text-white"
            >
              <Code className="h-4 w-4" />
              {isCompleted ? "View Reference Solution" : "Peek at Solution"}
            </button>
          </div>
        )}

        {showSolution && task.expected_answer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full h-full sm:h-auto sm:max-h-[90vh] max-w-3xl bg-zinc-900 sm:rounded-xl border border-zinc-700 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-700 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10">
                    <Code className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-white">Reference Solution</h3>
                    <p className="text-xs text-zinc-400">{currentLang.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSolution(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 h-[400px] sm:h-[500px]">
                <Editor
                  height="100%"
                  language={currentLang.monaco}
                  value={formattedSolution}
                  theme="vs-dark"
                  options={{
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                    padding: { top: 12, bottom: 12 },
                    readOnly: true,
                    renderLineHighlight: "none",
                    scrollbar: {
                      vertical: "auto",
                      horizontal: "auto",
                    },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {showNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full h-full sm:h-auto sm:max-h-[90vh] max-w-3xl bg-zinc-900 sm:rounded-xl border border-zinc-700 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-700 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white truncate">{note?.title || "Loading..."}</h3>
                    <p className="text-xs text-zinc-400">Study material for this task</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {task.note_id && (
                    <button
                      onClick={() => navigate(`/notes/${task.note_id}`)}
                      className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                      title="Open in editor"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowNote(false)}
                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 sm:p-6">
                {isNoteLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                  </div>
                ) : note ? (
                  <div 
                    className="prose prose-invert prose-emerald max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-strong:text-zinc-200 prose-code:text-emerald-400 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-zinc-700 text-sm sm:text-base"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                ) : (
                  <p className="text-zinc-400 text-center">Note not found</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showDescription && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden bg-black/70 backdrop-blur-sm" onClick={() => setShowDescription(false)}>
          <div className="w-full max-h-[70vh] bg-zinc-900 rounded-t-xl border-t border-zinc-700 shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <Code className="h-4 w-4 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white">Challenge Details</h3>
              </div>
              <button
                onClick={() => setShowDescription(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {task.description && (
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </p>
              )}
              
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs font-medium text-blue-400 mb-1">📝 Note</p>
                <p className="text-sm text-blue-300">
                  Explain the code by using comments. The comments are used for evaluation as well.
                </p>
              </div>

              {task.note_id && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs font-medium text-emerald-400 mb-2">📚 Study Material</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowDescription(false); setShowNote(true); }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-sm font-medium text-white"
                    >
                      <BookOpen className="h-4 w-4" />
                      Review Note
                    </button>
                    <button
                      onClick={() => navigate(`/notes/${task.note_id}`)}
                      className="flex items-center justify-center px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 transition-colors text-sm font-medium text-zinc-300"
                      title="Open note in editor"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {task.expected_answer && (
                <button
                  onClick={() => { setShowDescription(false); setShowSolution(true); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 transition-colors text-sm font-medium text-white"
                >
                  <Code className="h-4 w-4" />
                  {isCompleted ? "View Reference Solution" : "Peek at Solution"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b border-border bg-card gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowDescription(true)}
              className="lg:hidden flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
            >
              <Code className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Details</span>
            </button>
            <div className="relative">
              <button
                onClick={() => !isCompleted && setShowLanguageMenu(!showLanguageMenu)}
                className={cn(
                  "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors border",
                  isCompleted 
                    ? "bg-muted text-muted-foreground cursor-not-allowed border-transparent"
                    : "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
                )}
                disabled={isCompleted}
              >
                <span className="hidden sm:inline">{currentLang.name}</span>
                <span className="sm:hidden">{currentLang.id.toUpperCase()}</span>
                {!isCompleted && <ChevronDown className="h-3 w-3" />}
              </button>
              {showLanguageMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowLanguageMenu(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 z-20 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px] sm:min-w-[160px] max-h-[60vh] overflow-auto">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => {
                          setSelectedLanguage(lang.id);
                          setShowLanguageMenu(false);
                        }}
                        className={cn(
                          "w-full px-3 sm:px-4 py-2 text-left text-sm hover:bg-zinc-700 transition-colors text-zinc-200",
                          lang.id === selectedLanguage && "bg-zinc-700 font-medium text-white"
                        )}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              onClick={runCode}
              disabled={isRunning || !code.trim()}
              size="sm"
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-8 px-2 sm:px-3"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="hidden sm:inline ml-2">Run</span>
            </Button>
            {!isCompleted && (
              <Button
                onClick={submitCode}
                disabled={isSubmitting || !code.trim()}
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white h-8 px-2 sm:px-4"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-2">Submit</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-[200px]">
            <Editor
              height="100%"
              language={currentLang.monaco}
              value={code}
              onChange={(value) => setCode(value || "")}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: "on",
                padding: { top: 12, bottom: 12 },
                readOnly: isCompleted,
                renderLineHighlight: "all",
                cursorBlinking: "smooth",
                smoothScrolling: true,
              }}
            />
          </div>
          
          <div className="h-[140px] sm:h-[180px] border-t border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-green-500" />
                <span className="text-xs sm:text-sm font-medium text-zinc-300">Output</span>
              </div>
              {evaluation && (
                <button
                  onClick={() => setShowFeedback(true)}
                  className={cn(
                    "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors",
                    evaluation.is_correct 
                      ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" 
                      : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  )}
                >
                  {evaluation.is_correct ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                  <span className="hidden sm:inline">{evaluation.is_correct ? "Passed - View Feedback" : "Failed - View Feedback"}</span>
                  <span className="sm:hidden">{evaluation.is_correct ? "Passed" : "Failed"}</span>
                </button>
              )}
            </div>
            <div className="flex-1 p-3 sm:p-4 overflow-auto font-mono text-xs sm:text-sm">
              {output ? (
                <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
              ) : (
                <p className="text-zinc-600">Run your code to see output...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFeedback && evaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl bg-zinc-900 sm:rounded-xl border border-zinc-700 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-700 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={cn(
                  "p-1.5 sm:p-2 rounded-lg",
                  evaluation.is_correct ? "bg-green-500/10" : "bg-red-500/10"
                )}>
                  {evaluation.is_correct ? (
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
                  )}
                </div>
                <div>
                  <h3 className={cn(
                    "text-lg sm:text-xl font-semibold",
                    evaluation.is_correct ? "text-green-400" : "text-red-400"
                  )}>
                    {evaluation.is_correct ? "Great Job!" : "Keep Learning"}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400">AI Evaluation Result</p>
                </div>
              </div>
              <button
                onClick={() => setShowFeedback(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-auto">
              <div className="p-3 sm:p-4 rounded-lg bg-zinc-800/50">
                <h4 className="text-xs sm:text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  Feedback
                </h4>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">{evaluation.feedback}</p>
              </div>
              
              <div className="p-3 sm:p-4 rounded-lg bg-zinc-800/50">
                <h4 className="text-xs sm:text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                  <Code className="h-4 w-4 text-purple-400" />
                  Concept Understanding
                </h4>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">{evaluation.concept_understanding}</p>
              </div>
              
              <div className="p-3 sm:p-4 rounded-lg bg-zinc-800/50">
                <h4 className="text-xs sm:text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-amber-400" />
                  Comment Quality
                </h4>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">{evaluation.comment_quality}</p>
              </div>
            </div>
            
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-zinc-700 bg-zinc-800/30 shrink-0">
              <button
                onClick={() => setShowFeedback(false)}
                className="w-full py-2 sm:py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium transition-colors text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnsweringTask({ task }: TaskProps) {
  const [answer, setAnswer] = useState(task.user_answer || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluationResult | null>(() => {
    if (task.evaluation_feedback) {
      try {
        return JSON.parse(task.evaluation_feedback);
      } catch {
        return null;
      }
    }
    return null;
  });
  const evaluateAnswer = useEvaluateAnswer();
  const { data: note, isLoading: isNoteLoading } = useNote(task.note_id);
  const navigate = useNavigate();
  const isCompleted = task.status === "completed";

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    
    setIsSubmitting(true);
    try {
      const result = await evaluateAnswer.mutateAsync({ taskId: task.id, answer });
      setEvaluation(result);
      setShowFeedback(true);
    } catch (error) {
      console.error("Evaluation error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1 overflow-auto">
      <div className="mb-4 sm:mb-6 p-4 sm:p-5 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-2">
          Question
        </p>
        <p className="text-base sm:text-lg font-medium text-foreground">
          {task.title}
        </p>
      </div>

      {task.description && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            💡 Hints - Consider these points in your answer:
          </p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {task.description}
          </p>
        </div>
      )}

      {task.note_id && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-2">
            📚 Need to review the concept?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNote(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors text-sm font-medium text-white"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Review Note</span>
              <span className="sm:hidden">Review</span>
            </button>
            <button
              onClick={() => navigate(`/notes/${task.note_id}`)}
              className="flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium text-muted-foreground"
              title="Open note in editor"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 sm:space-y-4">
        <label className="text-sm font-medium text-muted-foreground">
          Your Answer
        </label>
        <Textarea
          value={answer}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswer(e.target.value)}
          placeholder="Type your answer here..."
          className="min-h-[150px] sm:min-h-[200px] resize-none text-sm sm:text-base"
          disabled={isCompleted}
        />

        {!isCompleted && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !answer.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit for Grading
          </Button>
        )}

        {evaluation && (
          <button
            onClick={() => setShowFeedback(true)}
            className={cn(
              "w-full flex items-center justify-center gap-2 p-3 sm:p-4 rounded-lg transition-colors",
              evaluation.is_correct 
                ? "bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20" 
                : "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
            )}
          >
            {evaluation.is_correct ? (
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
            <span className="text-sm sm:text-base font-semibold">
              {evaluation.is_correct ? "Correct! - View Feedback" : "Needs Improvement - View Feedback"}
            </span>
          </button>
        )}
      </div>

      {showFeedback && evaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full h-full sm:h-auto sm:max-h-[90vh] max-w-xl bg-zinc-900 sm:rounded-xl border border-zinc-700 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-700 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={cn(
                  "p-1.5 sm:p-2 rounded-lg",
                  evaluation.is_correct ? "bg-green-500/10" : "bg-red-500/10"
                )}>
                  {evaluation.is_correct ? (
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
                  )}
                </div>
                <div>
                  <h3 className={cn(
                    "text-lg sm:text-xl font-semibold",
                    evaluation.is_correct ? "text-green-400" : "text-red-400"
                  )}>
                    {evaluation.is_correct ? "Great Understanding!" : "Keep Learning"}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400">AI Evaluation Result</p>
                </div>
              </div>
              <button
                onClick={() => setShowFeedback(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 overflow-auto">
              <div className="p-3 sm:p-4 rounded-lg bg-zinc-800/50">
                <h4 className="text-xs sm:text-sm font-semibold text-zinc-300 mb-2 sm:mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  Feedback
                </h4>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">{evaluation.feedback}</p>
              </div>
            </div>
            
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-zinc-700 bg-zinc-800/30 shrink-0">
              <button
                onClick={() => setShowFeedback(false)}
                className="w-full py-2 sm:py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium transition-colors text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full h-full sm:h-auto sm:max-h-[90vh] max-w-3xl bg-zinc-900 sm:rounded-xl border border-zinc-700 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-700 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 shrink-0">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white truncate">{note?.title || "Loading..."}</h3>
                  <p className="text-xs text-zinc-400">Study material for this question</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {task.note_id && (
                  <button
                    onClick={() => navigate(`/notes/${task.note_id}`)}
                    className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                    title="Open in editor"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => setShowNote(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6">
              {isNoteLoading ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : note ? (
                <div 
                  className="prose prose-invert prose-emerald max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-strong:text-zinc-200 prose-code:text-emerald-400 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-zinc-700 text-sm sm:text-base"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              ) : (
                <p className="text-zinc-400 text-center">Note not found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

