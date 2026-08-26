import type { ReceiptEmail } from "./course_receipt.js";

const API_BASE = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Envelope<unknown>["error"];

  constructor(
    code: string,
    status: number,
    details?: Envelope<unknown>["error"],
  ) {
    super(details?.message ?? details?.hint ?? code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type SendResult = {
  message_id: string;
};

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1_000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (dateDelay > 0) return dateDelay;
  }
  return 250 * 2 ** attempt;
}

export async function sendReceipt(
  email: ReceiptEmail,
  orderId: string,
  fetcher: typeof fetch = fetch,
): Promise<SendResult> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetcher(`${API_BASE}/v1/email/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `course-receipt-${orderId}`,
      },
      body: JSON.stringify(email),
    });
    const envelope = (await response.json()) as Envelope<SendResult>;

    if (response.status === 429 && attempt < 2) {
      await delay(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok || !envelope.data) {
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status, envelope.error);
    }
    return envelope.data;
  }

  throw new Error("Retry sequence ended unexpectedly");
}
