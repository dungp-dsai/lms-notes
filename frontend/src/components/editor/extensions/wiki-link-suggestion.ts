import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { api } from "@/lib/api";
import { WikiLinkList } from "../WikiLinkList";

export type WikiLinkSuggestionItem = {
  id: string;
  title: string;
};

export const wikiLinkSuggestion = {
  char: "[[",
  allowSpaces: true,

  items: async ({ query }: { query: string }) => {
    const results = await api.searchNotes(query);
    return results.map((r) => ({ id: r.id, title: r.title }));
  },

  render: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let component: ReactRenderer<any>;
    let popup: TippyInstance[];

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onStart: (props: any) => {
        component = new ReactRenderer(WikiLinkList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) return;

        popup[0].setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === "Escape") {
          popup[0].hide();
          return true;
        }
        return component.ref?.onKeyDown(props) ?? false;
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};
