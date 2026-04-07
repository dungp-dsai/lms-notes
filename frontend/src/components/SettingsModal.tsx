import { useState, useEffect } from "react";
import { X, Settings, Code, MessageSquare, BookOpen, Clock, Send, RefreshCw, Info, History, CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTagSettings, useUpdateSettings, useTags, useScheduledJobs, useTestTelegram, useSyncScheduler, useJobHistory } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FREQUENCY_OPTIONS = [
  { value: 0, label: "Disabled" },
  { value: 1, label: "1x/day" },
  { value: 2, label: "2x/day" },
  { value: 3, label: "3x/day" },
];

const DEFAULT_TIMES: Record<number, string[]> = {
  0: [],
  1: ["09:00"],
  2: ["09:00", "18:00"],
  3: ["09:00", "14:00", "20:00"],
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { data: tags = [] } = useTags();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"settings" | "jobs" | "history">("settings");

  useEffect(() => {
    if (tags.length > 0 && !selectedTagId) {
      setSelectedTagId(tags[0].id);
    }
  }, [tags, selectedTagId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border sm:rounded-lg shadow-xl w-full h-full sm:h-auto max-w-2xl sm:max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <h2 className="text-base sm:text-lg font-semibold">Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors",
              activeTab === "settings"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Frequency</span>
              <span className="sm:hidden">Freq</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("jobs")}
            className={cn(
              "flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors",
              activeTab === "jobs"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Upcoming</span>
              <span className="sm:hidden">Jobs</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors",
              activeTab === "history"
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              History
            </div>
          </button>
        </div>

        {activeTab === "settings" ? (
          <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
            <div className="sm:w-48 border-b sm:border-b-0 sm:border-r border-border p-2 shrink-0 overflow-x-auto sm:overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1 hidden sm:block">
                Select Tag
              </p>
              <div className="flex sm:flex-col gap-1 sm:gap-0">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTagId(tag.id)}
                    className={cn(
                      "text-left px-3 py-2 rounded-md text-xs sm:text-sm transition-colors whitespace-nowrap sm:whitespace-normal sm:w-full",
                      selectedTagId === tag.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
              {selectedTagId ? (
                <TagSettingsPanel tagId={selectedTagId} />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Select a tag to configure
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "jobs" ? (
          <ScheduledJobsPanel />
        ) : (
          <JobHistoryPanel />
        )}
      </div>
    </div>
  );
}

function ScheduledJobsPanel() {
  const { data: jobs = [], isLoading, refetch } = useScheduledJobs();
  const testTelegram = useTestTelegram();
  const syncScheduler = useSyncScheduler();

  const handleTestTelegram = async () => {
    try {
      await testTelegram.mutateAsync(undefined);
    } catch (error) {
      console.error("Telegram test failed:", error);
    }
  };

  const handleSync = async () => {
    try {
      await syncScheduler.mutateAsync();
    } catch (error) {
      console.error("Sync failed:", error);
    }
  };

  return (
    <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
        <h3 className="font-medium text-sm sm:text-base">Upcoming Tasks</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-xs h-8"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 sm:mr-1", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncScheduler.isPending}
            className="text-xs h-8"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 sm:mr-1", syncScheduler.isPending && "animate-spin")} />
            <span className="hidden sm:inline">Sync Jobs</span>
            <span className="sm:hidden">Sync</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No scheduled jobs</p>
          <p className="text-xs mt-1">Configure task frequencies in the Settings tab</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 p-3 rounded-lg border border-border bg-muted/30"
            >
              <div>
                <p className="font-medium text-xs sm:text-sm">{job.name}</p>
                <p className="text-xs text-muted-foreground">ID: {job.id}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs sm:text-sm font-medium text-primary">{job.next_run_relative}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(job.next_run_time).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-border">
        <h3 className="font-medium text-sm sm:text-base mb-3">Telegram Notifications</h3>
        <Button
          onClick={handleTestTelegram}
          disabled={testTelegram.isPending}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {testTelegram.isPending ? "Sending..." : testTelegram.isSuccess ? "Sent!" : "Test Telegram"}
        </Button>
        {testTelegram.isError && (
          <p className="text-xs text-red-500 mt-2">Failed to send message. Check Telegram configuration.</p>
        )}
        {testTelegram.isSuccess && (
          <p className="text-xs text-green-500 mt-2">Message sent successfully!</p>
        )}
      </div>
    </div>
  );
}

function JobHistoryPanel() {
  const { data: history = [], isLoading, refetch } = useJobHistory(100);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-sm sm:text-base">Job History</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="text-xs h-8"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 sm:mr-1", isLoading && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      ) : history.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <History className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No job history yet</p>
          <p className="text-xs mt-1">Jobs will appear here after they run</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  item.status === "success"
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-red-500/30 bg-red-500/5"
                )}
              >
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                  )}
                  
                  {item.status === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{item.job_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.task_type} • {item.tag_name}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{formatDate(item.executed_at)}</p>
                    {item.tasks_created > 0 && (
                      <p className="text-xs text-green-500">+{item.tasks_created}</p>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 pt-0 border-t border-border/50 mt-1">
                    <p className="text-xs text-muted-foreground mb-1">Details:</p>
                    <p className="text-xs sm:text-sm">{item.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {item.executed_at && new Date(item.executed_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TagSettingsPanel({ tagId }: { tagId: string }) {
  const { data: settings, isLoading } = useTagSettings(tagId);
  const updateSettings = useUpdateSettings();
  const [saved, setSaved] = useState(false);

  const [coding, setCoding] = useState({ frequency: 0, times: [] as string[], quantity: 1 });
  const [answering, setAnswering] = useState({ frequency: 0, times: [] as string[], quantity: 1 });
  const [revising, setRevising] = useState({ frequency: 0, times: [] as string[], quantity: 3 });

  useEffect(() => {
    if (settings) {
      setCoding(settings.coding);
      setAnswering(settings.answering);
      setRevising(settings.revising);
    }
  }, [settings]);

  useEffect(() => {
    setSaved(false);
  }, [tagId]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        tagId,
        coding,
        answering,
        revising,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <TaskTypeSettings
        icon={<Code className="h-4 w-4 text-blue-500" />}
        label="Coding"
        tooltip="Coding challenges to practice programming skills"
        config={coding}
        onChange={setCoding}
        quantityLabel="challenges"
      />

      <TaskTypeSettings
        icon={<MessageSquare className="h-4 w-4 text-purple-500" />}
        label="Q&A"
        tooltip="Questions to test your understanding of concepts"
        config={answering}
        onChange={setAnswering}
        quantityLabel="questions"
      />

      <TaskTypeSettings
        icon={<BookOpen className="h-4 w-4 text-green-500" />}
        label="Revising"
        tooltip="Flashcards for spaced repetition review"
        config={revising}
        onChange={setRevising}
        quantityLabel="cards"
      />

      <div className="pt-4 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className={cn("w-full", saved && "bg-green-600 hover:bg-green-600")}
        >
          {updateSettings.isPending ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

interface TaskTypeSettingsProps {
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  config: { frequency: number; times: string[]; quantity: number };
  onChange: (config: { frequency: number; times: string[]; quantity: number }) => void;
  quantityLabel: string;
}

function TaskTypeSettings({ icon, label, tooltip, config, onChange, quantityLabel }: TaskTypeSettingsProps) {
  const handleFrequencyChange = (frequency: number) => {
    const times = DEFAULT_TIMES[frequency] || [];
    onChange({ ...config, frequency, times });
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...config.times];
    newTimes[index] = value;
    onChange({ ...config, times: newTimes });
  };

  const handleQuantityChange = (quantity: number) => {
    onChange({ ...config, quantity: Math.max(1, Math.min(20, quantity)) });
  };

  return (
    <TooltipProvider>
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-xs sm:text-sm">{label}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFrequencyChange(opt.value)}
                className={cn(
                  "px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-medium transition-colors",
                  config.frequency === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {config.frequency > 0 && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-help whitespace-nowrap">
                    Qty:
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Number of {quantityLabel} per notification</p>
                </TooltipContent>
              </Tooltip>
              <Input
                type="number"
                min={1}
                max={20}
                value={config.quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="w-14 sm:w-16 h-7 sm:h-8 text-xs text-center"
              />
            </div>
          )}
        </div>

        {config.frequency > 0 && (
          <div className="flex flex-wrap gap-2 pl-0 sm:pl-6">
            {config.times.map((time, index) => (
              <div key={index} className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">T{index + 1}:</span>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => handleTimeChange(index, e.target.value)}
                  className="w-24 sm:w-28 h-7 sm:h-8 text-xs"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
