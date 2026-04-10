import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Home, Menu, X, PanelLeftClose, PanelLeft } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { NoteEditor } from "@/components/editor/NoteEditor";
import { TabBar, type Tab } from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { useTask, useNoteList, useCreateNote } from "@/hooks/useNotes";
import { showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 256;

export function NotesPage() {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(noteId || null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(
    searchParams.get("tag")
  );
  const [showUntagged, setShowUntagged] = useState<boolean>(
    searchParams.get("untagged") === "true"
  );
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const revisionTaskId = searchParams.get("revision");
  const { data: revisionTask } = useTask(revisionTaskId);

  // Fetch filtered notes for sidebar and auto-select
  const { data: notes = [] } = useNoteList(selectedTagId || undefined, showUntagged);
  // Fetch all notes for tab validation (tabs can have notes from any tag)
  const { data: allNotes = [] } = useNoteList();
  const createNote = useCreateNote();

  // Auto-select first note when no note is selected
  useEffect(() => {
    if (!activeNoteId && notes.length > 0) {
      const firstNote = notes[0];
      setActiveNoteId(firstNote.id);
      // Add to tabs if not already there
      setOpenTabs((prev) => {
        if (prev.some((t) => t.id === firstNote.id)) return prev;
        return [...prev, { id: firstNote.id, title: firstNote.title }];
      });
      navigate(`/notes/${firstNote.id}`, { replace: true });
    }
  }, [activeNoteId, notes, navigate]);

  // Update tab titles and cleanup deleted notes' tabs
  useEffect(() => {
    if (allNotes.length === 0) return;
    
    const noteIds = new Set(allNotes.map((n) => n.id));
    
    setOpenTabs((prev) => {
      // Filter out tabs for deleted notes
      const validTabs = prev.filter((t) => noteIds.has(t.id));
      
      // Update titles for existing tabs
      return validTabs.map((t) => {
        const note = allNotes.find((n) => n.id === t.id);
        return note ? { ...t, title: note.title } : t;
      });
    });
  }, [allNotes]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (noteId) {
      setActiveNoteId(noteId);
      // Add to tabs if not already there
      const noteTitle = allNotes.find((n) => n.id === noteId)?.title || "Untitled";
      setOpenTabs((prev) => {
        if (prev.some((t) => t.id === noteId)) return prev;
        return [...prev, { id: noteId, title: noteTitle }];
      });
    }
  }, [noteId, allNotes]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.noteId) {
        handleSelectNote(detail.noteId, detail.title);
      }
    };
    window.addEventListener("select-note", handler);
    return () => window.removeEventListener("select-note", handler);
  }, [allNotes]);

  // Handle creating new note from wiki-link click
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.title) {
        // Check if note exists locally first (fast path)
        const existingNote = allNotes.find(
          (n) => n.title.toLowerCase() === detail.title.toLowerCase()
        );
        
        if (existingNote) {
          handleSelectNote(existingNote.id, existingNote.title);
          return;
        }
        
        // Auto-save current note before creating new one
        if (activeNoteId) {
          window.dispatchEvent(
            new CustomEvent("save-current-note", { detail: { noteId: activeNoteId } })
          );
        }
        
        try {
          const newNote = await createNote.mutateAsync({ title: detail.title });
          handleSelectNote(newNote.id, newNote.title);
        } catch (error) {
          // Backend returns 409 if note already exists
          if (error instanceof Error) {
            showToast(error.message, "error");
          }
        }
      }
    };
    window.addEventListener("create-note-from-link", handler);
    return () => window.removeEventListener("create-note-from-link", handler);
  }, [activeNoteId, createNote, allNotes]);

  const handleSelectNote = (id: string, title?: string) => {
    // Auto-save current note before switching
    if (activeNoteId && activeNoteId !== id) {
      window.dispatchEvent(
        new CustomEvent("save-current-note", { detail: { noteId: activeNoteId } })
      );
    }
    setActiveNoteId(id);
    setIsMobileSidebarOpen(false);
    // Add to tabs if not already there
    setOpenTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      const noteTitle = title || allNotes.find((n) => n.id === id)?.title || "Untitled";
      return [...prev, { id, title: noteTitle }];
    });
    navigate(`/notes/${id}`, { replace: true });
  };

  const handleSelectTab = (id: string) => {
    // Auto-save current note before switching tabs
    if (activeNoteId && activeNoteId !== id) {
      window.dispatchEvent(
        new CustomEvent("save-current-note", { detail: { noteId: activeNoteId } })
      );
    }
    setActiveNoteId(id);
    navigate(`/notes/${id}`, { replace: true });
  };

  const handleCloseTab = (id: string) => {
    // Auto-save before closing the tab
    window.dispatchEvent(
      new CustomEvent("save-current-note", { detail: { noteId: id } })
    );
    
    setOpenTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== id);
      // If closing active tab, switch to another one
      if (id === activeNoteId && newTabs.length > 0) {
        const closingIndex = prev.findIndex((t) => t.id === id);
        const newActiveIndex = Math.min(closingIndex, newTabs.length - 1);
        const newActive = newTabs[newActiveIndex];
        setActiveNoteId(newActive.id);
        navigate(`/notes/${newActive.id}`, { replace: true });
      } else if (newTabs.length === 0) {
        setActiveNoteId(null);
        navigate("/notes", { replace: true });
      }
      return newTabs;
    });
  };

  const handleSelectTag = (tagId: string | null) => {
    setSelectedTagId(tagId);
    setShowUntagged(false);
    setActiveNoteId(null); // Reset so first note gets auto-selected
    if (tagId) {
      setSearchParams({ tag: tagId });
    } else {
      setSearchParams({});
    }
  };

  const handleToggleUntagged = (untagged: boolean) => {
    setShowUntagged(untagged);
    setSelectedTagId(null);
    setActiveNoteId(null); // Reset so first note gets auto-selected
    if (untagged) {
      setSearchParams({ untagged: "true" });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${isResizing ? "select-none" : ""}`}>
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      <div
        ref={sidebarRef}
        style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
        className={cn(
          "flex h-full flex-col border-r border-sidebar-border bg-sidebar relative shrink-0",
          "fixed md:static inset-y-0 left-0 z-50 md:z-auto",
          "transition-all duration-300 ease-in-out",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isSidebarCollapsed && "md:w-0 md:border-r-0 md:overflow-hidden"
        )}
      >
        <div className="p-2 border-b border-sidebar-border flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="flex-1 justify-start"
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(true)}
            className="hidden md:flex h-8 w-8"
            title="Hide sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Sidebar
            activeNoteId={activeNoteId}
            onSelectNote={handleSelectNote}
            selectedTagId={selectedTagId}
            onSelectTag={handleSelectTag}
            showUntagged={showUntagged}
            onToggleUntagged={handleToggleUntagged}
          />
        </div>
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors group hidden md:block",
            isSidebarCollapsed && "md:hidden"
          )}
        >
          <div className="absolute top-0 right-0 w-1 h-full group-hover:bg-primary/50" />
        </div>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="md:hidden flex items-center gap-2 p-2 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium truncate flex-1">
            {activeNoteId ? "Note Editor" : "Notes"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="h-8"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab Bar - Desktop only */}
        <div className="hidden md:block">
          <TabBar
            tabs={openTabs}
            activeTabId={activeNoteId}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
          />
        </div>

        <div className="flex-1 overflow-hidden relative">
          {isSidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(false)}
              className="absolute top-2 left-2 z-10 h-8 w-8 hidden md:flex bg-card/80 hover:bg-card border border-border shadow-sm"
              title="Show sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          {activeNoteId ? (
            <NoteEditor 
              key={activeNoteId} 
              noteId={activeNoteId}
              revisionTask={revisionTaskId && revisionTask ? {
                id: revisionTask.id,
                explanation: revisionTask.revision_explanation || "",
              } : undefined}
              onRevisionComplete={() => {
                searchParams.delete("revision");
                setSearchParams(searchParams);
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground p-4">
              <div className="text-center">
                <p className="text-base sm:text-lg font-medium">No note selected</p>
                <p className="text-sm mt-1">
                  Select a note from the sidebar or create a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
