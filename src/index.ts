/** @pajama-studio/prefab-studio — domain-agnostic prefab editing.
 *  Phase 1: the headless core — every editor op (select/transform/component/
 *  entity/rename), undo/redo, revisioned state, PrefabStore autosave, React
 *  bindings. Viewports and domain inspectors plug in on top. */
export * from "./editor-core.js";
export { usePrefabEditor } from "./usePrefabEditor.js";
