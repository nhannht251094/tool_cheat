import {
  Check,
  Eye,
  FileText,
  ListChecks,
  Plus,
  Save,
  Settings,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Zap
} from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { normalizeSymbol, parseTableFormat } from "../../lib/matrix";
import { buildSlotFormPayload, tableFormatFromMatrix } from "../../lib/slotPayload";
import { useStudioStore } from "../../store/useStudioStore";

export function GameFormWorkspace() {
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const {
    projects,
    activeProjectId,
    rows,
    cols,
    matrix,
    rawMatrix,
    apiRequest,
    formValues,
    userIdHistory,
    setCell,
    setRawMatrixAndApply,
    setTableFormatAndApply,
    runGenerator,
    clearMatrix,
    fillFull,
    saveActivePreset,
    rememberUserId,
    updateFormValue,
    setUserIdForActiveProject,
    updateField,
    deleteField,
    addField,
    updateApiRequest
  } = useStudioStore();

  const project = projects.find((item) => item.projectId === activeProjectId);
  const payload = buildSlotFormPayload(matrix, rows, cols, formValues);
  const tableFormatValue = String(formValues.tableFormat || tableFormatFromMatrix(rows, cols));
  const visibleReels = parseTableFormat(tableFormatValue);
  const reelHeights = visibleReels.length ? visibleReels : parseTableFormat(tableFormatFromMatrix(rows, cols));
  const userIds = Array.from(
    new Set(
      [
        ...(userIdHistory ?? []),
        ...(project?.presets ?? []).map((preset) => String(preset.formValues?.userId || ""))
      ]
        .filter(Boolean)
    )
  );
  const customFields =
    project?.fieldConfigs.filter(
      (field) =>
        !field.hidden &&
        !["serviceId", "userId", "matrixData", "tableFormat", "freegameTableFormat"].includes(
          field.key
        )
    ) ?? [];

  function normalizeFieldKey(value: string) {
    return value.trim().replace(/\s+/g, "_").replace(/[^\w]/g, "");
  }

  function reelRawValue(colIndex: number, reelHeight: number) {
    return Array.from({ length: reelHeight }, (_, rowIndex) => matrix[rowIndex]?.[colIndex] || "C3").join(
      ","
    );
  }

  function updateReelRaw(colIndex: number, value: string) {
    const nextReelTokens = value
      .split(/[\s,;|]+/)
      .map(normalizeSymbol)
      .filter(Boolean);

    const nextRaw = reelHeights.flatMap((reelHeight, reelIndex) =>
      Array.from({ length: reelHeight }, (_, rowIndex) =>
        reelIndex === colIndex
          ? nextReelTokens[rowIndex] || "C3"
          : matrix[rowIndex]?.[reelIndex] || "C3"
      )
    );

    setRawMatrixAndApply(nextRaw.join(","));
  }

  function focusMatrixCell(rowIndex: number, colIndex: number) {
    const nextCol = Math.max(0, Math.min(reelHeights.length - 1, colIndex));
    const nextRow = Math.max(0, Math.min((reelHeights[nextCol] || 1) - 1, rowIndex));
    window.requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>(
        `[data-matrix-cell="${nextRow}-${nextCol}"]`
      );
      input?.focus();
      input?.select();
    });
  }

  function handleMatrixKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      focusMatrixCell(rowIndex + 1, colIndex);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusMatrixCell(rowIndex - 1, colIndex);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusMatrixCell(rowIndex + 1, colIndex);
    }
    if (event.key === "ArrowLeft" && event.currentTarget.selectionStart === 0) {
      event.preventDefault();
      focusMatrixCell(rowIndex, colIndex - 1);
    }
    if (
      event.key === "ArrowRight" &&
      event.currentTarget.selectionStart === event.currentTarget.value.length
    ) {
      event.preventDefault();
      focusMatrixCell(rowIndex, colIndex + 1);
    }
  }

  function saveInputedForm() {
    saveActivePreset();
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1400);
  }

  return (
    <section className="tester-card">
      <header className="tester-card-head">
        <div className="title-inline">
          <FileText size={20} />
          <h1>{project?.name ?? "9703"}</h1>
        </div>
        <strong>ID: {payload.serviceId}</strong>
      </header>

      <nav className="tester-tabs">
        <button className="active">
          <ListChecks size={17} />
          Form
        </button>
        <button>
          <Eye size={17} />
          Result
        </button>
        <button>
          <SlidersHorizontal size={17} />
          Field Settings
        </button>
        <button>
          <Settings size={17} />
          Other Settings
        </button>
      </nav>

      <div className="form-pane">
        <div className="environment-row">
          <strong>Environment:</strong>
          <span>DEV</span>
          <label className="mini-switch">
            <input
              type="checkbox"
              checked={apiRequest.environment === "STAGING"}
              onChange={(event) =>
                updateApiRequest({ environment: event.target.checked ? "STAGING" : "DEV" })
              }
            />
            <i />
          </label>
          <em>{apiRequest.environment}</em>
        </div>

        <label className="wide-field required top-user-field">
          User ID
          <div className="input-action-row">
            <div className="user-id-input-group">
              <input
                value={payload.userId}
                list="user-id-options"
                onChange={(event) => updateFormValue("userId", event.target.value)}
                onBlur={(event) => rememberUserId(event.target.value)}
              />
              <datalist id="user-id-options">
                {userIds.map((userId) => (
                  <option key={userId} value={userId} />
                ))}
              </datalist>
            </div>
            <button type="button" onClick={() => setUserIdForActiveProject(payload.userId)}>
              Apply All
            </button>
            <button>Clear Session</button>
            <button type="button" className="save-inputed-button" onClick={saveInputedForm}>
              {saveState === "saved" ? <Check size={15} /> : <Save size={15} />}
              {saveState === "saved" ? "Saved" : "Save"}
            </button>
          </div>
        </label>

        <section className="matrix-form-section priority-matrix-section">
          <div className="matrix-copy">
            <h2>Matrix</h2>
            <p>Fill in symbols for each reel.</p>
          </div>

          <div className="table-format-panel">
            <label className="table-format-field">
              Table Format
              <input
                value={tableFormatValue}
                onChange={(event) => setTableFormatAndApply(event.target.value)}
              />
              <small>Controls visible reel cells. Example: 3,5,3,3,4</small>
            </label>
          </div>

          <label className="matrix-textarea">
            Matrix Data
            <textarea
              spellCheck={false}
              value={rawMatrix}
              onChange={(event) => setRawMatrixAndApply(event.target.value)}
            />
          </label>

          <div className="reel-raw-editor">
            <div className="reel-raw-head">
              <strong>Reel Data</strong>
              <span>Edit one reel at a time, same order as Matrix Data.</span>
            </div>
            <div className="reel-raw-list">
              {reelHeights.map((reelHeight, colIndex) => (
                <label key={`raw-${colIndex}-${reelHeight}`}>
                  <span>R{colIndex + 1}</span>
                  <input
                    spellCheck={false}
                    value={reelRawValue(colIndex, reelHeight)}
                    onChange={(event) => updateReelRaw(colIndex, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="matrix-row-layout">
            <div className="compact-matrix-grid reel-grid">
              {visibleReels.map((reelHeight, colIndex) => (
                <div className="reel-column" key={`${colIndex}-${reelHeight}`}>
                  {Array.from({ length: reelHeight }, (_, rowIndex) => (
                    <input
                      key={`${rowIndex}-${colIndex}`}
                      data-matrix-cell={`${rowIndex}-${colIndex}`}
                      aria-label={`Reel ${colIndex + 1} row ${rowIndex + 1}`}
                      spellCheck={false}
                      value={matrix[rowIndex]?.[colIndex] || "C3"}
                      onChange={(event) => setCell(rowIndex, colIndex, event.target.value || "C3")}
                      onFocus={(event) => event.currentTarget.select()}
                      onClick={(event) => event.currentTarget.select()}
                      onKeyDown={(event) => handleMatrixKeyDown(event, rowIndex, colIndex)}
                    />
                  ))}
                </div>
              ))}
            </div>

            <aside className="matrix-tools-card">
              <h3>
                <Shuffle size={17} />
                Matrix Tools
              </h3>
              <div className="matrix-tool-buttons">
                <button className="danger" onClick={clearMatrix}>
                  <Trash2 size={15} />
                  Clear
                </button>
                <button onClick={() => fillFull("C3")}>
                  <Zap size={15} />
                  Fill Full
                </button>
              </div>
              <label className="auto-send-line">
                <input
                  type="checkbox"
                  checked={apiRequest.autoSend}
                  onChange={(event) => updateApiRequest({ autoSend: event.target.checked })}
                />
                <span />
                Auto Send (global)
              </label>
              <div className="matrix-preset-buttons">
                <button onClick={() => runGenerator("random")}>
                  <Shuffle size={14} />
                  Random
                </button>
                <button onClick={() => runGenerator("freespin")}>
                  <Sparkles size={14} />
                  Freegame
                </button>
                <button onClick={() => runGenerator("nearWin")}>
                  <Zap size={14} />
                  Nearwin
                </button>
              </div>
            </aside>
          </div>
        </section>

        <section className="secondary-form-section">
          <div className="secondary-form-head">
            <h3>Form Data</h3>
            <button type="button" onClick={() => addField("text")}>
              <Plus size={14} />
              Add Field
            </button>
          </div>

          {customFields.length > 0 && (
            <>
              <div className="field-settings-list">
                {customFields.map((field) => (
                  <div className="field-settings-row" key={field.id}>
                    <input
                      aria-label="Field label"
                      value={field.label}
                      onChange={(event) => updateField(field.id, { label: event.target.value })}
                    />
                    <input
                      aria-label="Field key"
                      value={field.key}
                      onChange={(event) => {
                        const key = normalizeFieldKey(event.target.value);
                        if (key) updateField(field.id, { key });
                      }}
                    />
                    <select
                      value={field.type}
                      onChange={(event) =>
                        updateField(field.id, {
                          type: event.target.value as typeof field.type
                        })
                      }
                    >
                      <option value="text">text</option>
                      <option value="number">number</option>
                      <option value="textarea">textarea</option>
                      <option value="checkbox">checkbox</option>
                      <option value="json">json</option>
                    </select>
                    <button type="button" onClick={() => deleteField(field.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="two-field-grid compact-custom-grid">
              {customFields.map((field) => (
                <label key={field.id}>
                  {field.label} <span>Custom</span>
                  {field.type === "textarea" || field.type === "json" ? (
                    <textarea
                      value={String(formValues[field.key] ?? "")}
                      onChange={(event) => updateFormValue(field.key, event.target.value)}
                    />
                  ) : field.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      checked={Boolean(formValues[field.key])}
                      onChange={(event) => updateFormValue(field.key, event.target.checked)}
                    />
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={String(formValues[field.key] ?? "")}
                      onChange={(event) => updateFormValue(field.key, event.target.value)}
                    />
                  )}
                  {field.validation && <small>{field.validation}</small>}
                </label>
              ))}
              </div>
            </>
          )}
        </section>

        <section className="sequential-fill">
          <h3>Sequential Fill <span>(1 character only)</span></h3>
          <input value="A" readOnly />
          <div className="settings-switches">
            <label>
              <input type="checkbox" defaultChecked />
              <span />
              Aa Auto Uppercase
            </label>
            <label>
              <input type="checkbox" defaultChecked />
              <span />
              Sequential append
            </label>
          </div>
        </section>
      </div>
    </section>
  );
}
