import { useMutation } from "@tanstack/react-query";
import { Play } from "lucide-react";
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
    updateApiRequest,
    addRequestLog
  } = useStudioStore();

  const payload = buildSlotFormPayload(matrix, rows, cols, formValues);

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
    </Panel>
  );
}
