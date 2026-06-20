import { useMutation } from "@tanstack/react-query";
import { Activity, Clock, Play } from "lucide-react";
import { useEffect } from "react";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { endpointForEnvironment, ENVIRONMENTS } from "../../lib/apiEndpoint";
import { buildSlotFormPayload, toUrlEncoded } from "../../lib/slotPayload";
import { notify } from "../../lib/uiEvents";
import { useStudioStore } from "../../store/useStudioStore";
import type { ApiResponse } from "../../types/studio";

export function ApiPanel() {
  const {
    matrix,
    rows,
    cols,
    projects,
    activeProjectId,
    apiRequest,
    formValues,
    lastResponse,
    requestLogs,
    updateApiRequest,
    addRequestLog
  } = useStudioStore();

  const activeProject = projects.find((project) => project.projectId === activeProjectId);
  const serviceId = activeProject?.serviceId || formValues.serviceId;
  const endpoint = endpointForEnvironment(serviceId, apiRequest.environment);
  const payload = buildSlotFormPayload(matrix, rows, cols, formValues);
  const endpointError = endpoint.trim() ? "" : "Endpoint is required before sending.";

  useEffect(() => {
    if (endpoint && endpoint !== apiRequest.endpoint) updateApiRequest({ endpoint });
  }, [apiRequest.endpoint, endpoint, updateApiRequest]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (endpointError) throw new Error(endpointError);
      const start = performance.now();
      try {
        const headers: Record<string, string> = Object.fromEntries(
          apiRequest.headers
            .filter((header) => header.enabled && header.key)
            .map((header) => [header.key, header.value])
        );
        if (apiRequest.token) headers.Authorization = `Bearer ${apiRequest.token}`;

        const response = await fetch(endpoint, {
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
    onSuccess: (response) => {
      addRequestLog(response, payload);
      notify(response.ok ? "Request completed." : "Request failed. Check Result tab.", response.ok ? "success" : "error");
    },
    onError: (error) => notify(error instanceof Error ? error.message : "Request failed", "error")
  });
  const displayedResponse = mutation.data ?? lastResponse;
  const responseBody =
    displayedResponse?.body === undefined
      ? "No response yet. Send a request to inspect the latest result."
      : JSON.stringify(displayedResponse.body, null, 2);

  return (
    <Panel
      className="api-panel"
      eyebrow="API Request"
      title="Send Spin Result"
      action={
        <Button
          variant="primary"
          icon={<Play size={15} />}
          disabled={mutation.isPending || Boolean(endpointError)}
          data-action="send-request"
          onClick={() => mutation.mutate()}
          title={endpointError || "Send request"}
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
            {ENVIRONMENTS.map((environment) => (
              <option key={environment}>{environment}</option>
            ))}
          </select>
        </label>
        <label className="span-2">
          REST Endpoint
          <input
            value={endpoint}
            readOnly
            aria-readonly="true"
            aria-invalid={Boolean(endpointError)}
            title="Automatically managed from the active project ID"
          />
          {endpointError && <small className="field-error">{endpointError}</small>}
        </label>
        <label className="span-2">
          Bearer Token / optional
          <input
            value={apiRequest.token}
            onChange={(event) => updateApiRequest({ token: event.target.value })}
          />
        </label>
      </div>
      <div className="api-response-console">
        <div className="api-response-status">
          <span className={mutation.isPending ? "is-loading" : displayedResponse?.ok ? "is-ok" : displayedResponse ? "is-error" : "is-idle"}>
            <Activity size={14} />
            {mutation.isPending
              ? "Sending request"
              : displayedResponse
                ? displayedResponse.ok
                  ? "Request passed"
                  : "Request failed"
                : "Ready to send"}
          </span>
          <span>
            <Clock size={14} />
            {displayedResponse ? `${displayedResponse.timeMs} ms` : `${requestLogs.length} logs`}
          </span>
          <strong>{displayedResponse ? `HTTP ${displayedResponse.status}` : apiRequest.method}</strong>
        </div>
        <pre>{responseBody}</pre>
      </div>
    </Panel>
  );
}
