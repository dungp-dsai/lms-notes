import { Plugin } from "@tiptap/pm/state";
import { Extension } from "@tiptap/react";
import { api, resolveUploadUrl } from "@/lib/api";

export const ImagePaste = Extension.create({
  name: "imagePaste",

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;

            for (const item of items) {
              if (item.type.startsWith("image/")) {
                event.preventDefault();
                const file = item.getAsFile();
                if (!file) return false;

                api.uploadImage(file).then((res) => {
                  editor
                    .chain()
                    .focus()
                    .setImage({ src: resolveUploadUrl(res.url) })
                    .run();
                });
                return true;
              }
            }
            return false;
          },

          handleDrop(_view, event) {
            const files = event.dataTransfer?.files;
            if (!files?.length) return false;

            for (const file of files) {
              if (file.type.startsWith("image/")) {
                event.preventDefault();
                api.uploadImage(file).then((res) => {
                  editor
                    .chain()
                    .focus()
                    .setImage({ src: resolveUploadUrl(res.url) })
                    .run();
                });
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
