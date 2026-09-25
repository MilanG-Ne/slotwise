import type { Session } from "./types";
let csrf = "";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrf,
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 419)
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      response.status,
      response.status === 419
        ? "Your session expired. Sign in again."
        : body.message || "Something went wrong. Please try again.",
      body.errors,
    );
  }
  return body as T;
}
export function rememberSession(session: Session) {
  csrf = session.csrf_token;
  return session;
}
export const getSession = () => api<Session>("/session").then(rememberSession);
export const send = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
export const errorMessage = (error: unknown) =>
  error instanceof ApiError && Object.keys(error.fields).length
    ? Object.values(error.fields).flat().join(" ")
    : error instanceof Error
      ? error.message
      : "Please try again.";
