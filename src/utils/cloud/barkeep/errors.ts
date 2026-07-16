//! Error contracts shared by the Barkeep client modules.

/** Stable category for a Barkeep client failure. */
export type BarkeepClientErrorCode =
  | "http"
  | "cors"
  | "csrf"
  | "network"
  | "validation"
  | "invalid-response";

/** Error raised for a failed Barkeep operation. */
export class BarkeepClientError extends Error {
  /** HTTP status code, or null for browser/network failures. */
  readonly status: number | null;

  /** Machine-readable failure category. */
  readonly code: BarkeepClientErrorCode;

  constructor(
    message: string,
    status: number | null = null,
    code: BarkeepClientErrorCode = status === null ? "validation" : "http",
  ) {
    super(message);
    this.name = "BarkeepClientError";
    this.status = status;
    this.code = code;
  }
}
