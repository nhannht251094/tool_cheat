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
import { parseTableFormat } from "../../lib/matrix";
import { buildSlotFormPayload, tableFormatFromMatrix } from "../../lib/slotPayload";
import { notify } from "../../lib/uiEvents";
import { useStudioStore } from "../../store/useStudioStore";
import { ENVIRONMENTS } from "../../lib/apiEndpoint";

export function GameFormWorkspace() {
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [isClearingSession, setIsClearingSession] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "result" | "fields" | "other">("form");
  const {
    projects,
    activeProjectId,
    rows,
    cols,
    matrix,
    rawMatrix,
    selectedCell,
    apiRequest,
    lastResponse,
    requestLogs,
    formValues,
    userIdHistory,
    setCell,
    setSelectedCell,
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
    updateApiRequest,
    replayLog
  } = useStudioStore();

  const project = projects.find((item) => item.projectId === activeProjectId);
  const payload = buildSlotFormPayload(matrix, rows, cols, formValues);
  const tableFormatValue = String(formValues.tableFormat || tableFormatFromMatrix(rows, cols));
  const visibleReels = parseTableFormat(tableFormatValue);
  const reelHeights = visibleReels.length ? visibleReels : parseTableFormat(tableFormatFromMatrix(rows, cols));
  const totalCells = reelHeights.reduce((sum, height) => sum + height, 0);
  const uniqueSymbols = new Set(matrix.flat().filter(Boolean)).size;
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
    notify("Form saved.", "success");
    window.setTimeout(() => setSaveState("idle"), 1400);
  }

  async function clearSession() {
    if (isClearingSession) return;

    setIsClearingSession(true);
    try {
      const endpoint = new URL(apiRequest.endpoint);
      const clearEndpoint = new URL(
        `/${encodeURIComponent(payload.serviceId)}/clearsession`,
        endpoint.origin
      );
      const currency = String(formValues.currency || "USD");
      clearEndpoint.searchParams.set("userId", payload.userId);
      clearEndpoint.searchParams.set("currency", currency);

      const headers: Record<string, string> = Object.fromEntries(
        apiRequest.headers
          .filter((header) => header.enabled && header.key)
          .map((header) => [header.key, header.value])
      );
      if (apiRequest.token) headers.Authorization = `Bearer ${apiRequest.token}`;

      const body = new URLSearchParams({ userId: payload.userId, currency });
      const response = await fetch(clearEndpoint, {
        method: "POST",
        headers,
        body,
        cache: "no-store"
      });

      notify(
        response.ok ? "Session cleared." : `Clear session failed (HTTP ${response.status}).`,
        response.ok ? "success" : "error"
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Clear session failed.", "error");
    } finally {
      setIsClearingSession(false);
    }
  }

  function clearMatrixWithConfirm() {
    if (!window.confirm("Clear the current matrix? This cannot be undone.")) return;
    clearMatrix();
    notify("Matrix cleared.", "success");
  }

  return (
    <section className="tester-card">
      <header className="tester-card-head">
        <div className="title-inline">
          <FileText size={20} />
          <div>
            <h1>{project?.name ?? "9703"}</h1>
            <span>Matrix Configuration Tool</span>
            <small>{totalCells} Cells / {reelHeights.length} Reels / {uniqueSymbols} Symbols</small>
          </div>
        </div>
        <strong>Game #{payload.serviceId}</strong>
      </header>

      <nav className="tester-tabs">
        <button data-tab="form" className={activeTab === "form" ? "active" : ""} onClick={() => setActiveTab("form")}>
          <ListChecks size={17} />
          Form
        </button>
        <button data-tab="result" className={activeTab === "result" ? "active" : ""} onClick={() => setActiveTab("result")}>
          <Eye size={17} />
          Result
        </button>
        <button data-tab="fields" className={activeTab === "fields" ? "active" : ""} onClick={() => setActiveTab("fields")}>
          <SlidersHorizontal size={17} />
          Field Settings
        </button>
        <button data-tab="other" className={activeTab === "other" ? "active" : ""} onClick={() => setActiveTab("other")}>
          <Settings size={17} />
          Other Settings
        </button>
      </nav>

      <div className="form-pane">
        {activeTab === "form" && (
        <section className="matrix-form-section priority-matrix-section">
          <div className="matrix-workbench-head">
            <div className="matrix-copy">
              <h2>Matrix Workbench</h2>
              <p>Slot reel editor for request payload generation.</p>
              <div className="matrix-stat-row">
                <span>{totalCells} Cells</span>
                <span>{reelHeights.length} Reels</span>
                <span>{uniqueSymbols} Symbols</span>
              </div>
            </div>
            <div className="environment-segmented" aria-label="Environment">
              {ENVIRONMENTS.map((environment) => (
                <button
                  key={environment}
                  type="button"
                  className={apiRequest.environment === environment ? "active" : ""}
                  onClick={() => updateApiRequest({ environment })}
                >
                  {environment}
                </button>
              ))}
            </div>
          </div>

          <section className="workbench-section">
            <div className="workbench-section-head">
              <h3>Configuration</h3>
              <span>Identity and reel format</span>
            </div>
            <div className="matrix-control-strip">
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
                  <button type="button" onClick={() => {
                    setUserIdForActiveProject(payload.userId);
                    notify("User ID applied to active project.", "success");
                  }}>
                    Apply All
                  </button>
                  <button type="button" disabled={isClearingSession} onClick={clearSession}>
                    {isClearingSession ? "Clearing..." : "Clear Session"}
                  </button>
                  <button type="button" className="save-inputed-button" onClick={saveInputedForm}>
                    {saveState === "saved" ? <Check size={15} /> : <Save size={15} />}
                    {saveState === "saved" ? "Saved" : "Save"}
                  </button>
                </div>
              </label>
              <label className="table-format-field">
                Table Format
                <input
                  value={tableFormatValue}
                  onChange={(event) => setTableFormatAndApply(event.target.value)}
                />
                <small>Controls visible reel cells. Example: 3,5,3,3,4</small>
              </label>
            </div>
          </section>

          <section className="workbench-section">
            <div className="workbench-section-head">
              <h3>Matrix Data</h3>
              <span>Raw payload source</span>
            </div>
            <label className="matrix-textarea">
              Matrix Data
              <textarea
                spellCheck={false}
                value={rawMatrix}
                onChange={(event) => setRawMatrixAndApply(event.target.value)}
              />
            </label>
          </section>

          <section className="workbench-section">
            <div className="workbench-section-head">
              <h3>Reel Editor</h3>
              <span>Focusable slot-reel grid</span>
            </div>
            <div className="matrix-row-layout">
              <div className="compact-matrix-grid reel-grid">
                {visibleReels.map((reelHeight, colIndex) => (
                  <div
                    className={selectedCell.col === colIndex ? "reel-column is-focused" : "reel-column"}
                    key={`${colIndex}-${reelHeight}`}
                  >
                    <div className="reel-column-head">
                      <strong>R{colIndex + 1}</strong>
                      <span>{reelHeight}</span>
                    </div>
                    {Array.from({ length: reelHeight }, (_, rowIndex) => (
                      <input
                        key={`${rowIndex}-${colIndex}`}
                        className={selectedCell.row === rowIndex && selectedCell.col === colIndex ? "is-active-cell" : ""}
                        data-matrix-cell={`${rowIndex}-${colIndex}`}
                        aria-label={`Reel ${colIndex + 1} row ${rowIndex + 1}`}
                        spellCheck={false}
                        value={matrix[rowIndex]?.[colIndex] || "C3"}
                        onChange={(event) => setCell(rowIndex, colIndex, event.target.value || "C3")}
                        onFocus={(event) => {
                          setSelectedCell(rowIndex, colIndex);
                          event.currentTarget.select();
                        }}
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
                <div className="tool-group">
                  <span>Quick Actions</span>
                  <div className="matrix-preset-buttons">
                    <button onClick={() => fillFull("C3")}>
                      <Zap size={15} />
                      Fill Full
                    </button>
                    <button onClick={() => runGenerator("random")}>
                      <Shuffle size={14} />
                      Random
                    </button>
                    <button onClick={() => runGenerator("nearWin")}>
                      <Zap size={14} />
                      Nearwin
                    </button>
                    <button onClick={() => runGenerator("freespin")}>
                      <Sparkles size={14} />
                      Freegame
                    </button>
                  </div>
                </div>
                <div className="tool-group settings-group">
                  <span>Global Settings</span>
                  <label className="auto-send-line">
                    <input
                      type="checkbox"
                      checked={apiRequest.autoSend}
                      onChange={(event) => updateApiRequest({ autoSend: event.target.checked })}
                    />
                    <span />
                    <strong>Auto Send</strong>
                    <small>Automatically send request after applying matrix.</small>
                  </label>
                </div>
                <div className="tool-group danger-zone">
                  <span>Danger Zone</span>
                  <div className="matrix-tool-buttons">
                    <button className="danger" onClick={clearMatrixWithConfirm}>
                      <Trash2 size={15} />
                      Clear Matrix
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </section>
          </section>
        )}

        {activeTab === "result" && (
          <section className="result-tab-panel">
            <div className="secondary-form-head">
              <div>
                <h3>Result</h3>
                <span>Latest request response and recent request history.</span>
              </div>
            </div>
            <div className="result-summary">
              <span className={lastResponse?.ok ? "is-ok" : lastResponse ? "is-error" : "is-idle"}>
                {lastResponse ? (lastResponse.ok ? "Request passed" : "Request failed") : "No response yet"}
              </span>
              <strong>{lastResponse ? `HTTP ${lastResponse.status}` : apiRequest.method}</strong>
              <small>{lastResponse ? `${lastResponse.timeMs} ms` : `${requestLogs.length} logs`}</small>
            </div>
            <pre className="result-body">
              {lastResponse ? JSON.stringify(lastResponse.body, null, 2) : "Send a request to inspect response data here."}
            </pre>
            <div className="request-log-list">
              {requestLogs.slice(0, 8).map((log) => (
                <button key={log.id} type="button" onClick={() => {
                  replayLog(log.id);
                  notify("Request log replayed into the workspace.", "success");
                  setActiveTab("form");
                }}>
                  <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                  <strong>{log.method}</strong>
                  <small>{log.response ? `HTTP ${log.response.status}` : "No response"}</small>
                </button>
              ))}
              {!requestLogs.length && <p>No request history yet.</p>}
            </div>
          </section>
        )}

        {activeTab === "fields" && (
        <section className="secondary-form-section">
          <div className="secondary-form-head">
            <div>
              <h3>Form Data</h3>
              <span>Property editor for custom request fields.</span>
            </div>
            <button type="button" data-action="add-field" onClick={() => {
              addField("text");
              notify("Field added.", "success");
            }}>
              <Plus size={14} />
              Add Field
            </button>
          </div>

          {customFields.length > 0 && (
            <>
              <div className="field-property-table">
                <div className="field-property-head">
                  <span>Field Name</span>
                  <span>Key</span>
                  <span>Type</span>
                  <span>Actions</span>
                </div>
                {customFields.map((field) => (
                  <div className="field-settings-row field-property-row" key={field.id}>
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
                    <button type="button" onClick={() => {
                      if (window.confirm(`Delete field "${field.label}"?`)) {
                        deleteField(field.id);
                        notify("Field deleted.", "success");
                      }
                    }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="field-overrides">
                <div className="field-overrides-head">
                  <h4>Field Overrides</h4>
                  <span>Values used in the generated request payload.</span>
                </div>
                <div className="field-overrides-grid">
                  {customFields.map((field) => (
                    <label key={field.id}>
                      <span>{field.label}</span>
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
              </div>
            </>
          )}
        </section>
        )}

        {activeTab === "other" && (
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
        )}
      </div>
    </section>
  );
}
