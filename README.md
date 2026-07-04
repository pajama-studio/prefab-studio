# @pajama-studio/prefab-studio

Domain-agnostic prefab **editing** for the Pajama Studio prefab framework.

**Phase 1 — the headless core (this release):**

- `EditorOp` — the complete, undoable editor vocabulary: select, transform,
  component/field edits, add/remove/rename entities.
- `createEditorState` / `applyOp` / `undo` / `redo` — a pure reducer with a
  bounded history; selection changes never pollute undo.
- `usePrefabEditor(prefab, { store })` — React bindings with revision
  tracking and debounced autosave into any `PrefabStore`. The hook edits one
  root prefab today; package-aware stores wrap that root into a
  `PrefabPackage` so the same backend can later preserve nested dependencies.

Bring your own viewport: a gizmo emits `setTransform`, an outliner emits
`select`, an inspector emits `setComponentField` — the core doesn't care
what renders the scene. Domain packs contribute their own inspector
sections keyed off their component vocabularies (see prefab-core's Agent
Catalog for machine-readable block semantics).

Phase 2 adds reference DOM panels; phase 3 an optional R3F viewport.
