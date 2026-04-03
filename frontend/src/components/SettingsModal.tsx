import { useState, useEffect } from "react";
import { X, Settings, Code, MessageSquare, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTagSettings, useUpdateSettings, useTags } from "@/hooks/useNotes";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (tags.length > 0 && !selectedTagId) {
      setSelectedTagId(tags[0].id);
    }
  }, [tags, selectedTagId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Task Frequency Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex h-[500px]">
          <div className="w-48 border-r border-border p-2 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
              Select Tag
            </p>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTagId(tag.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  selectedTagId === tag.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {selectedTagId ? (
              <TagSettingsPanel tagId={selectedTagId} />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a tag to configure
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TagSettingsPanel({ tagId }: { tagId: string }) {
  const { data: settings, isLoading } = useTagSettings(tagId);
  const updateSettings = useUpdateSettings();
  const [saved, setSaved] = useState(false);

  const [coding, setCoding] = useState({ frequency: 0, times: [] as string[] });
  const [answering, setAnswering] = useState({ frequency: 0, times: [] as string[] });
  const [revising, setRevising] = useState({ frequency: 0, times: [] as string[] });

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
        label="Coding Tasks"
        config={coding}
        onChange={setCoding}
      />

      <TaskTypeSettings
        icon={<MessageSquare className="h-4 w-4 text-purple-500" />}
        label="Answering Tasks"
        config={answering}
        onChange={setAnswering}
      />

      <TaskTypeSettings
        icon={<BookOpen className="h-4 w-4 text-green-500" />}
        label="Revising Cards"
        config={revising}
        onChange={setRevising}
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
  config: { frequency: number; times: string[] };
  onChange: (config: { frequency: number; times: string[] }) => void;
}

function TaskTypeSettings({ icon, label, config, onChange }: TaskTypeSettingsProps) {
  const handleFrequencyChange = (frequency: number) => {
    const times = DEFAULT_TIMES[frequency] || [];
    onChange({ frequency, times });
  };

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...config.times];
    newTimes[index] = value;
    onChange({ ...config, times: newTimes });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>

      <div className="flex gap-2">
        {FREQUENCY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleFrequencyChange(opt.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
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
        <div className="flex flex-wrap gap-2 pl-6">
          {config.times.map((time, index) => (
            <div key={index} className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Time {index + 1}:</span>
              <Input
                type="time"
                value={time}
                onChange={(e) => handleTimeChange(index, e.target.value)}
                className="w-28 h-8 text-xs"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
