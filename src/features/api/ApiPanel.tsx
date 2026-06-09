import Editor from "@monaco-editor/react";
import { useMutation } from "@tanstack/react-query";
import { Clock, Play, RotateCcw, Wifi } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { buildSlotFormPayload, toUrlEncoded } from "../../lib/slotPayload";
import { useStudioStore } from "../../store/useStudioStore";
import type { ApiResponse } from "../../types/studio";

export function ApiPanel() {
  const {
    matrix,
    rows,
    cols,
    apiRequest,
    formValues,
    lastResponse,
    requestLogs,
    updateApiRequest,
    addRequestLog,
    replayLog
  } = useStudioStore();

  const payload = buildSlotFormPayload(matrix, rows, cols, formValues);
  const urlEncodedPayload = toUrlEncoded(payload).toString();

  const mutation = useMutation({
    mutationFn: async () => {
      const start = performance.now();
      try {
        const headers: Record<string, string> = Object.fromEntries(
          apiRequest.headers
            .filter((header) => header.enabled && header.key)
            .map((header) => [header.key, header.value])
        );
        if (apiRequest.token) headers.Authorization = `Bearer ${apiRequest.token}`;

        const response = await fetch(apiRequest.endpoint, {
          method: apiRequest.method,
          headers,
          body: apiRequest.method === "GET" ? undefined : toUrlEncoded(payload)
        });
        const text = await response.text();
        let body: unknown = text;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = { raw: text };
        }
        return {
          id: `res-${Date.now()}`,
          status: response.status,
          timeMs: Math.round(performance.now() - start),
          ok: response.ok,
          body,
          createdAt: Date.now()
        } satisfies ApiResponse;
      } catch (error) {
        return {
          id: `res-${Date.now()}`,
          status: 0,
          timeMs: Math.round(performance.now() - start),
          ok: false,
          body: {
            error: error instanceof Error ? error.message : "Unknown request error",
            hint: "Request is sent as application/x-www-form-urlencoded form data. Browser CORS can still block localhost clients."
          },
          createdAt: Date.now()
        } satisfies ApiResponse;
      }
    },
    onSuccess: (response) => addRequestLog(response, payload)
  });

  function updateHeader(index: number, key: "key" | "value" | "enabled", value: string | boolean) {
    updateApiRequest({
      headers: apiRequest.headers.map((header, headerIndex) =>
        headerIndex === index ? { ...header, [key]: value } : header
      )
    });
  }

  return (
    <Panel
      className="api-panel"
      eyebrow="API Request"
      title="Send Spin Result"
      action={
        <Button
          variant="primary"
          icon={<Play size={15} />}
          disabled={mutation.isPending}
          data-action="send-request"
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Sending" : "Send"}
        </Button>
      }
    >
      <div className="api-grid">
        <label>
          Method
          <select
            value={apiRequest.method}
            onChange={(event) =>
              updateApiRequest({ method: event.target.value as typeof apiRequest.method })
            }
          >
            <option>POST</option>
            <option>GET</option>
            <option>PUT</option>
          </select>
        </label>
        <label>
          Environment
          <select
            value={apiRequest.environment}
            onChange={(event) =>
              updateApiRequest({
                environment: event.target.value as typeof apiRequest.environment
              })
            }
          >
            <option>DEV</option>
            <option>STAGING</option>
            <option>PROD</option>
          </select>
        </label>
        <label className="span-2">
          REST Endpoint
          <input
            value={apiRequest.endpoint}
            onChange={(event) => updateApiRequest({ endpoint: event.target.value })}
          />
        </label>
        <label className="span-2">
          Bearer Token / optional
          <input
            value={apiRequest.token}
            onChange={(event) => updateApiRequest({ token: event.target.value })}
          />
        </label>
      </div>

      <div className="devtools-general">
        <details open>
          <summary>General</summary>
          <dl>
            <dt>Request URL</dt>
            <dd>{apiRequest.endpoint}</dd>
            <dt>Request Method</dt>
            <dd>{apiRequest.method}</dd>
            <dt>Status Code</dt>
            <dd>
              <span className={lastResponse?.ok ? "status-dot-ok" : "status-dot-idle"} />
              {lastResponse ? `${lastResponse.status || "ERR"} ${lastResponse.ok ? "OK" : "Failed"}` : "Ready"}
            </dd>
            <dt>Payload Type</dt>
            <dd>Form Data / URL-encoded</dd>
          </dl>
        </details>
      </div>

      <div className="api-toggles">
        <label>
          <input
            type="checkbox"
            checked={apiRequest.autoSend}
            onChange={(event) => updateApiRequest({ autoSend: event.target.checked })}
          />
          Auto send
        </label>
        <label>
          <input
            type="checkbox"
            checked={apiRequest.websocket}
            onChange={(event) => updateApiRequest({ websocket: event.target.checked })}
          />
          <Wifi size={14} />
          Websocket realtime
        </label>
      </div>

      <div className="headers-editor">
        {apiRequest.headers.map((header, index) => (
          <div className="header-row" key={header.id}>
            <input
              type="checkbox"
              checked={header.enabled}
              onChange={(event) => updateHeader(index, "enabled", event.target.checked)}
            />
            <input
              value={header.key}
              onChange={(event) => updateHeader(index, "key", event.target.value)}
            />
            <input
              value={header.value}
              onChange={(event) => updateHeader(index, "value", event.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="request-response-grid">
        <div className="editor-card form-data-card">
          <strong>Form Data</strong>
          <div className="form-data-preview">
            {Object.entries(payload).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </div>
        </div>
        <div className="editor-card">
          <strong>View URL-encoded</strong>
          <Editor
            height="260px"
            defaultLanguage="text"
            theme="vs-dark"
            value={urlEncodedPayload}
            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
          />
        </div>
        <div className="editor-card">
          <div className="response-head">
            <strong>Response Viewer</strong>
            {lastResponse && (
              <span className={lastResponse.ok ? "response-ok" : "response-error"}>
                {lastResponse.status || "ERR"} / {lastResponse.timeMs}ms
              </span>
            )}
          </div>
          <Editor
            height="260px"
            defaultLanguage="json"
            theme="vs-dark"
            value={JSON.stringify(lastResponse?.body ?? { waiting: "Send a request" }, null, 2)}
            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
          />
        </div>
      </div>

      <div className="history-strip">
        {requestLogs.slice(0, 5).map((log) => (
          <button key={log.id} onClick={() => replayLog(log.id)}>
            <RotateCcw size={13} />
            <span>{log.method}</span>
            <strong>{log.projectName}</strong>
            <small>
              <Clock size={12} />
              {new Date(log.createdAt).toLocaleTimeString()}
            </small>
          </button>
        ))}
      </div>
    </Panel>
  );
}
