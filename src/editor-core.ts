import type { CoreComponents, KitPrefab, KitEntity, Transform } from "@pajama-studio/prefab-core/schema";

/** Domain-erased prefab/entity (any component vocabulary). */
export type AnyPrefab = KitPrefab<CoreComponents<never>>;
export type AnyEntity = KitEntity<CoreComponents<never>>;

/** Editor operations — the complete, undoable vocabulary of a prefab editor.
 *  A viewport gizmo emits setTransform; an inspector emits setComponentField;
 *  an outliner emits select/add/remove/rename. All domain-agnostic. */
export type EditorOp =
  | { op: "select"; entityId: string | null }
  | { op: "setTransform"; entityId: string; transform: Transform }
  | { op: "setComponentField"; entityId: string; component: string; field: string; value: unknown }
  | { op: "setComponent"; entityId: string; component: string; value: unknown }
  | { op: "removeComponent"; entityId: string; component: string }
  | { op: "addEntity"; entity: AnyEntity }
  | { op: "removeEntity"; entityId: string }
  | { op: "renameEntity"; entityId: string; name: string }
  | { op: "setPrefabName"; name: string }
  | { op: "replacePrefab"; prefab: AnyPrefab };

export interface EditorState {
  prefab: AnyPrefab;
  selectedId: string | null;
  /** Bumps on every content change — hosts key autosave off this. */
  revision: number;
  past: AnyPrefab[];
  future: AnyPrefab[];
}

const HISTORY_LIMIT = 100;

export function createEditorState(prefab: AnyPrefab): EditorState {
  return { prefab, selectedId: null, revision: 0, past: [], future: [] };
}

function mutateEntity(p: AnyPrefab, id: string, fn: (e: AnyEntity) => AnyEntity): AnyPrefab {
  return { ...p, entities: p.entities.map((e) => (e.id === id ? fn(e as AnyEntity) : e)) } as AnyPrefab;
}

function contentChange(s: EditorState, next: AnyPrefab): EditorState {
  return {
    ...s,
    prefab: next,
    revision: s.revision + 1,
    past: [...s.past.slice(-HISTORY_LIMIT + 1), s.prefab],
    future: [],
  };
}

export function applyOp(s: EditorState, op: EditorOp): EditorState {
  switch (op.op) {
    case "select":
      return { ...s, selectedId: op.entityId };
    case "setTransform":
      return contentChange(s, mutateEntity(s.prefab, op.entityId, (e) => ({
        ...e, components: { ...e.components, transform: op.transform },
      })));
    case "setComponentField":
      return contentChange(s, mutateEntity(s.prefab, op.entityId, (e) => {
        const comps = e.components as Record<string, unknown>;
        const current = (comps[op.component] ?? {}) as Record<string, unknown>;
        return { ...e, components: { ...comps, [op.component]: { ...current, [op.field]: op.value } } } as AnyEntity;
      }));
    case "setComponent":
      return contentChange(s, mutateEntity(s.prefab, op.entityId, (e) => ({
        ...e, components: { ...(e.components as Record<string, unknown>), [op.component]: op.value },
      }) as AnyEntity));
    case "removeComponent":
      return contentChange(s, mutateEntity(s.prefab, op.entityId, (e) => {
        const comps = { ...(e.components as Record<string, unknown>) };
        delete comps[op.component];
        return { ...e, components: comps } as AnyEntity;
      }));
    case "addEntity":
      if (s.prefab.entities.some((e) => e.id === op.entity.id)) return s;
      return contentChange(s, { ...s.prefab, entities: [...s.prefab.entities, op.entity] } as AnyPrefab);
    case "removeEntity": {
      if (op.entityId === s.prefab.rootId) return s; // the root is not deletable
      const next = contentChange(s, {
        ...s.prefab,
        entities: s.prefab.entities.filter((e) => e.id !== op.entityId),
      } as AnyPrefab);
      return next.selectedId === op.entityId ? { ...next, selectedId: null } : next;
    }
    case "renameEntity":
      return contentChange(s, mutateEntity(s.prefab, op.entityId, (e) => ({ ...e, name: op.name })));
    case "setPrefabName":
      return contentChange(s, { ...s.prefab, name: op.name } as AnyPrefab);
    case "replacePrefab":
      return contentChange(s, op.prefab);
  }
}

export function undo(s: EditorState): EditorState {
  const prev = s.past[s.past.length - 1];
  if (!prev) return s;
  return { ...s, prefab: prev, revision: s.revision + 1, past: s.past.slice(0, -1), future: [s.prefab, ...s.future] };
}

export function redo(s: EditorState): EditorState {
  const [next, ...rest] = s.future;
  if (!next) return s;
  return { ...s, prefab: next, revision: s.revision + 1, past: [...s.past, s.prefab], future: rest };
}
