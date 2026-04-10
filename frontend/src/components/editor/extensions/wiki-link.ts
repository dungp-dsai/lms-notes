import { mergeAttributes, Node, nodeInputRule } from "@tiptap/react";

// Regex to match [[title]] pattern - captures the title inside brackets
const WIKI_LINK_INPUT_REGEX = /\[\[([^\]]+)\]\]$/;

// Type for the global notes registry
declare global {
  interface Window {
    __notesRegistry?: { id: string; title: string }[];
  }
}

// Helper to find a note by title
function findNoteByTitle(title: string): { id: string; title: string } | undefined {
  const notes = window.__notesRegistry || [];
  return notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
}

export const WikiLink = Node.create({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes) => ({
          "data-title": attributes.title,
        }),
      },
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-note-id"),
        renderHTML: (attributes) => ({
          "data-note-id": attributes.noteId,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="wiki-link"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "wiki-link",
        class: "wiki-link",
      }),
      `[[${HTMLAttributes["data-title"]}]]`,
    ];
  },

  renderText({ node }) {
    return `[[${node.attrs.title}]]`;
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement("span");
      const title = node.attrs.title;
      
      // Function to update styling based on note existence
      const updateStyling = () => {
        const existingNote = findNoteByTitle(title);
        const noteExists = !!node.attrs.noteId || !!existingNote;
        dom.className = noteExists ? "wiki-link" : "wiki-link wiki-link-new";
      };
      
      // Set initial attributes
      Object.entries(
        mergeAttributes(HTMLAttributes, {
          "data-type": "wiki-link",
        })
      ).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          dom.setAttribute(key, String(value));
        }
      });
      dom.textContent = `[[${title}]]`;
      updateStyling();

      // Listen for notes registry updates to refresh styling
      const handleNotesUpdate = () => updateStyling();
      window.addEventListener("notes-registry-updated", handleNotesUpdate);

      dom.addEventListener("click", () => {
        // Check dynamically for existing note
        const existing = findNoteByTitle(title);
        const targetNoteId = node.attrs.noteId || existing?.id;
        
        if (targetNoteId) {
          // Navigate to existing note
          window.dispatchEvent(
            new CustomEvent("navigate-note", {
              detail: { noteId: targetNoteId },
            })
          );
        } else if (title) {
          // Create new note with this title
          window.dispatchEvent(
            new CustomEvent("create-note-from-link", {
              detail: { title },
            })
          );
        }
      });

      return {
        dom,
        destroy() {
          window.removeEventListener("notes-registry-updated", handleNotesUpdate);
        },
      };
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: WIKI_LINK_INPUT_REGEX,
        type: this.type,
        getAttributes: (match: RegExpMatchArray) => {
          const title = match[1]?.trim();
          // Check if note already exists and set noteId
          const existingNote = findNoteByTitle(title);
          return { title, noteId: existingNote?.id || null };
        },
      }),
    ];
  },
});
