import { describe, expect, it } from "vitest";
import { applyOp, createEditorState, redo, undo, type AnyPrefab } from "./editor-core.js";

const prefab: AnyPrefab = {
  id: "kettle", name: "Kettle", version: 1, rootId: "root",
  entities: [
    { id: "root", name: "Root", components: { transform: { position: { x: 0, y: 0, z: 0 }, rotationY: 0, scale: 1 } } },
    { id: "cup", name: "Cup", components: { transform: { position: { x: 1, y: 0, z: 0 }, rotationY: 0, scale: 1 } } },
  ],
} as unknown as AnyPrefab;

describe("prefab editor core", () => {
  it("edits component fields immutably and bumps revision", () => {
    let s = createEditorState(prefab);
    s = applyOp(s, { op: "setComponentField", entityId: "cup", component: "fillable", field: "capacity", value: 2 });
    expect((s.prefab.entities[1].components as Record<string, { capacity: number }>).fillable.capacity).toBe(2);
    expect(prefab.entities[1].components).not.toHaveProperty("fillable");
    expect(s.revision).toBe(1);
  });

  it("undo/redo walk the exact history", () => {
    let s = createEditorState(prefab);
    s = applyOp(s, { op: "renameEntity", entityId: "cup", name: "Glass" });
    s = applyOp(s, { op: "setPrefabName", name: "Kettle & glass" });
    s = undo(s);
    expect(s.prefab.name).toBe("Kettle");
    expect(s.prefab.entities[1].name).toBe("Glass");
    s = redo(s);
    expect(s.prefab.name).toBe("Kettle & glass");
  });

  it("selection survives content ops; the root refuses deletion", () => {
    let s = createEditorState(prefab);
    s = applyOp(s, { op: "select", entityId: "cup" });
    s = applyOp(s, { op: "setTransform", entityId: "cup", transform: { position: { x: 2, y: 0, z: 0 }, rotationY: 0, scale: 1 } });
    expect(s.selectedId).toBe("cup");
    s = applyOp(s, { op: "removeEntity", entityId: "root" });
    expect(s.prefab.entities).toHaveLength(2);
    s = applyOp(s, { op: "removeEntity", entityId: "cup" });
    expect(s.prefab.entities).toHaveLength(1);
    expect(s.selectedId).toBeNull();
  });

  it("select does not pollute undo history", () => {
    let s = createEditorState(prefab);
    s = applyOp(s, { op: "select", entityId: "cup" });
    expect(s.past).toHaveLength(0);
  });
});
