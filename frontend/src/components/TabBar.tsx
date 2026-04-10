import { useRef, useEffect } from "react";
import { X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  title: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: TabBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTabId]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center border-b border-border bg-card/50 min-h-[36px]">
      <div
        ref={scrollRef}
        className="flex-1 flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        style={{ scrollbarWidth: "thin" }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => onSelectTab(tab.id)}
              className={cn(
                "group flex items-center gap-1.5 px-3 py-1.5 text-sm border-r border-border",
                "min-w-[100px] max-w-[180px] shrink-0",
                "transition-colors duration-100",
                isActive
                  ? "bg-background text-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="truncate flex-1 text-left">{tab.title || "Untitled"}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={cn(
                  "p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors shrink-0",
                  "opacity-0 group-hover:opacity-100",
                  isActive && "opacity-60"
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </button>
          );
        })}
      </div>
    </div>
  );
}
