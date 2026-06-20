import type { Environment } from "../types/studio";

export const ENVIRONMENTS: Environment[] = ["DEV", "STAGING"];

export function normalizeEnvironment(value: unknown): Environment {
  return String(value).toUpperCase() === "STAGING" ? "STAGING" : "DEV";
}

export function endpointForEnvironment(serviceId: unknown, environment: Environment) {
  const id = encodeURIComponent(String(serviceId).trim());
  return `https://cheat.${environment.toLowerCase()}.enostd.gay/${id}/inputed`;
}

export function environmentFromEndpoint(endpoint: string): Environment {
  return endpoint.includes("cheat.staging.") ? "STAGING" : "DEV";
}
