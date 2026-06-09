import {
  Copy,
  Edit3,
  FileText,
  GripVertical,
  List,
  Send,
  SlidersHorizontal,
  Trash2
} from "lucide-react";
import { useRef, useState } from "react";
import { exportProjectsToJson, importProjectsFromJson } from "../../lib/projectExchange";
import { useStudioStore } from "../../store/useStudioStore";

const fallbackForms = [
  "default",
  "NoWin",
  "Đập mob",
  "Đập mobs",
  "Mob",
  "SuperMegaWin",
  "MegaWin"
];

export function OperationsPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggingId, setDraggingId] = useState("");
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: "before" | "after";
  } | null>(null);
  const {
    projects,
    activeProjectId,
    activePresetId,
    importProjects,
    loadPreset,
    savePreset,
    renamePreset,
    deletePreset,
    reorderPreset
  } = useStudioStore();
  const project = projects.find((item) => item.projectId === activeProjectId);
  const forms = project?.presets.length
    ? project.presets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        hash: `#${preset.id.slice(-7)}`,
        scenario: preset.tableType || preset.scenario || "normal"
      }))
    : fallbackForms.map((name, index) => ({
        id: `fallback-${index}`,
        name,
        hash: `#${Math.random().toString(16).slice(2, 9)}`,
        scenario: "normal"
      }));

  function exportProjects() {
    const blob = new Blob([JSON.stringify(exportProjectsToJson(projects), null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = `${project?.name || "slot-projects"}-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      importProjects(importProjectsFromJson(JSON.parse(text)));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Import failed");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <aside className="operations-panel">
      <header className="operations-head">
        <button>›</button>
        <h2>
          <SlidersHorizontal size={18} />
          Operations Panel
        </h2>
      </header>

      <div className="operations-tabs">
        <button className="active">
          <FileText size={15} />
          Forms
        </button>
        <button>
          <List size={15} />
          Sequence
        </button>
      </div>

      <div className="operation-list">
        {forms.map((form) => (
          <article
            className={[
              "operation-card",
              form.id === activePresetId ? "active" : "",
              form.id === draggingId ? "dragging" : "",
              dropTarget?.id === form.id ? `drop-${dropTarget.position}` : ""
            ]
              .filter(Boolean)
              .join(" ")}
            key={form.id}
            draggable={!form.id.startsWith("fallback-")}
            onDragStart={(event) => {
              setDraggingId(form.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", form.id);
            }}
            onDragOver={(event) => {
              if (!draggingId || draggingId === form.id) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              const rect = event.currentTarget.getBoundingClientRect();
              const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
              setDropTarget({ id: form.id, position });
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDropTarget(null);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId = event.dataTransfer.getData("text/plain") || draggingId;
              if (sourceId && sourceId !== form.id) {
                reorderPreset(sourceId, form.id, dropTarget?.position || "before");
              }
              setDraggingId("");
              setDropTarget(null);
            }}
            onDragEnd={() => {
              setDraggingId("");
              setDropTarget(null);
            }}
            onClick={() => loadPreset(form.id)}
          >
            <div className="drag-grip" title="Drag to reorder">
              <GripVertical size={16} />
            </div>
            <div className="operation-main">
              <strong>
                <FileText size={16} />
                <span>{form.name}</span>
                {form.name === "SuperMegaWin" && <i />}
              </strong>
              <div>
                <span>{form.scenario}</span>
                <small>{form.hash}</small>
              </div>
            </div>
            <div className="operation-actions">
              <button
                className="send"
                title="Load and send"
                onClick={(event) => {
                  event.stopPropagation();
                  loadPreset(form.id);
                  window.setTimeout(() => {
                    document.querySelector<HTMLButtonElement>("[data-action='send-request']")?.click();
                  }, 0);
                }}
              >
                <Send size={17} />
              </button>
              <button
                title="Duplicate"
                onClick={(event) => {
                  event.stopPropagation();
                  loadPreset(form.id);
                  window.setTimeout(() => savePreset(`${form.name} Copy`, "Manual"), 0);
                }}
              >
                <Copy size={15} />
              </button>
              <button
                title="Rename"
                onClick={(event) => {
                  event.stopPropagation();
                  const nextName = window.prompt("Rename form", form.name);
                  if (nextName) renamePreset(form.id, nextName);
                }}
              >
                <Edit3 size={15} />
              </button>
              <button
                className="delete"
                title="Delete"
                onClick={(event) => {
                  event.stopPropagation();
                  deletePreset(form.id);
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
            {form.id === activePresetId && <span className="operation-active-line" />}
          </article>
        ))}
      </div>

      <footer className="operations-footer">
        <button className="export" onClick={exportProjects}>⇩ Export</button>
        <button onClick={() => inputRef.current?.click()}>↥ Import</button>
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="application/json"
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
      </footer>
    </aside>
  );
}
