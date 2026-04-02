import { mergeAttributes, Node } from "@tiptap/react";

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
      Object.entries(
        mergeAttributes(HTMLAttributes, {
          "data-type": "wiki-link",
          class: "wiki-link",
        })
      ).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          dom.setAttribute(key, String(value));
        }
      });
      dom.textContent = `[[${node.attrs.title}]]`;

      dom.addEventListener("click", () => {
        if (node.attrs.noteId) {
          window.dispatchEvent(
            new CustomEvent("navigate-note", {
              detail: { noteId: node.attrs.noteId },
            })
          );
        }
      });

      return { dom };
    };
  },
});
