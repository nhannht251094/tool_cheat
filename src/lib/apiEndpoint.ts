import type { Environment } from "../types/studio";

export const ENVIRONMENTS: Environment[] = ["DEV", "STAGING"];
export const DEFAULT_ENVIRONMENT: Environment = "STAGING";

export function normalizeEnvironment(value: unknown): Environment {
  return String(value).trim().toUpperCase() === "DEV" ? "DEV" : DEFAULT_ENVIRONMENT;
}

export function endpointForEnvironment(serviceId: unknown, environment: Environment) {
  const id = encodeURIComponent(String(serviceId).trim());
  return `https://cheat.${environment.toLowerCase()}.enostd.gay/${id}/inputed`;
}

export function environmentFromEndpoint(endpoint: string): Environment {
  return endpoint.includes("cheat.dev.") ? "DEV" : DEFAULT_ENVIRONMENT;
}
