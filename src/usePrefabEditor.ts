import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PrefabStore } from "@pajama-studio/prefab-core/schema";
import {
  applyOp, createEditorState, redo as redoOp, undo as undoOp,
  type AnyPrefab, type EditorOp, type EditorState,
} from "./editor-core.js";

/** Headless React binding for the prefab editor: state + ops + undo/redo +
 *  debounced autosave into any PrefabStore (memory, localStorage, REST/D1). */
export function usePrefabEditor(initial: AnyPrefab, opts: { store?: PrefabStore; autosaveMs?: number } = {}) {
  const [state, setState] = useState<EditorState>(() => createEditorState(initial));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedRevision = useRef(0);

  const dispatch = useCallback((op: EditorOp) => setState((s) => applyOp(s, op)), []);
  const undo = useCallback(() => setState(undoOp), []);
  const redo = useCallback(() => setState(redoOp), []);

  const { store, autosaveMs = 800 } = opts;
  useEffect(() => {
    if (!store || state.revision === savedRevision.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const rev = state.revision;
      setSaveStatus("saving");
      store.save(state.prefab)
        .then(() => { savedRevision.current = rev; setSaveStatus("saved"); })
        .catch(() => setSaveStatus("error"));
    }, autosaveMs);
    return () => clearTimeout(timer.current);
  }, [state.revision, state.prefab, store, autosaveMs]);

  return useMemo(() => ({
    prefab: state.prefab,
    selectedId: state.selectedId,
    selected: state.prefab.entities.find((e) => e.id === state.selectedId) ?? null,
    revision: state.revision,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    saveStatus,
    dispatch, undo, redo,
  }), [state, saveStatus, dispatch, undo, redo]);
}
