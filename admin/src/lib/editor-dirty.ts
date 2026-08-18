// Module-level dirty flag shared between the post editor page and the app shell,
// so sidebar navigation can warn before unsaved post changes are lost.
let editorDirty = false

export function setEditorDirty(dirty: boolean): void {
  editorDirty = dirty
}

export function isEditorDirty(): boolean {
  return editorDirty
}
