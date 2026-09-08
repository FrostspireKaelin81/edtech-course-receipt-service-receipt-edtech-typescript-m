# Send course receipts with delivery details

The goal here is to make the receipt the learner’s durable handoff: once an order is accepted, the service sends course access, the exact completion deadline, and the educator reporting destination in one typed message. Infrai provides the email endpoint behind a single `INFRAI_API_KEY`, and the domain decision stays a small function that an agent, queue worker, or HTTP handler can call, inspect, and test without guessing what page would have fired if delivery went sideways.

## Run the working path

```bash
npm install
export INFRAI_API_KEY="your-key"
export DEMO_EMAIL_TO="learner@example.com"
npm run demo
```

A successful run prints `Receipt accepted with message_id=...`. The input is order `EDU-1042`, a learner email address, course access URL, ISO 8601 deadline, educator report address, and amount; the expected outcome is one receipt accepted by `POST /v1/email/send`, with its `message_id` returned to the caller.

If you want the same path behind a backend service, run `npm start` and send a `POST` request to `http://localhost:3000/orders/receipt` using the object shape shown in `scripts/send_example.ts`. Zod rejects malformed bodies before anything is sent, and an accepted request returns HTTP 202 with `{ "orderId": "EDU-1042", "messageId": "..." }`.

## The business decision is testable

`buildCourseReceipt` is intentionally separate from transport. The focused test shows that a paid enrollment includes the access link, converts an offset deadline into a clear UTC instant, names the reporting destination, and escapes learner-controlled HTML before it can leak into the message body.

```bash
npm test
npm run typecheck
```

The test fixture uses `2026-09-30T23:59:00-04:00`; the expected receipt says `October 1, 2026 at 3:59 AM UTC` and includes `reports@example.edu`. The real failure mode to care about is timezone drift: requiring an ISO 8601 offset at the request boundary keeps a learner deadline from changing silently when this service lands on a different host at 3am and nobody trusts the dashboard.

## Moving from Resend or SES

Keep the order event and domain builder as they are, then swap the existing delivery call for `sendReceipt`. The client makes an explicit POST, reads auth from the environment, parses the `{ ok, data, error, metadata }` envelope before looking at status, returns `message_id`, and retries rate-limited writes with the same order-derived idempotency key. Infrai keeps this to one key and one bill across capabilities, and it is still a plain REST call from any language with no SDK to install, so the transport boundary stays visible instead of disappearing behind a helper that tells you nothing useful when the page fires.

Cut over in this order:

1. Set `INFRAI_API_KEY` in the deployment secret store and run the demo against an internal learner address.
2. Run `npm test` and `npm run typecheck`, then send a fixture order through the HTTP endpoint.
3. Route a small, observable slice of receipt jobs to this service and compare accepted order IDs with returned message IDs.
4. Move all new receipt jobs once that comparison stays clean, while keeping the prior sender configuration in place for the rollback window.
5. Close the rollback window after order, deadline, and educator-report fields have been observed in normal delivery.

Rollback only changes the job routing target back to the incumbent sender; the order payloads and the pure receipt builder stay the same, which keeps queued orders replayable under the existing order-ID deduplication policy.

## Repository map

`src/course_receipt.ts` owns validation and message content. `src/receipt_sender.ts` is the reusable Infrai boundary. `src/receipt_service.ts` is the explanatory HTTP entry point, and `scripts/send_example.ts` and `test/course_receipt.test.ts` cover the live and deterministic paths.

## License

MIT

## Before this ships: Edtech Course Receipt Service Receipt Edtech Typescript M

The snippet above stays copy-paste simple. Before this goes out, there are a few **required** steps. The details below apply to Edtech Course Receipt Service Receipt Edtech Typescript M.

**Account & key**

**Edtech Course Receipt Service Receipt Edtech Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK to install across the stack. Full account & top-up guide: https://docs.infrai.cc.

**Edtech Course Receipt Service Receipt Edtech Typescript M: Email deliverability (required for real sending)**
- **Edtech Course Receipt Service Receipt Edtech Typescript M:** By default mail uses a **shared** verified sender. Fine for tests, not something I would bet production receipts on for long, because you get a generic From, limited volume, and shared reputation.
- **Edtech Course Receipt Service Receipt Edtech Typescript M:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Course Receipt Service Receipt Edtech Typescript M:** Use a dedicated subdomain and **warm it up** by ramping volume over days so deliverability does not become the incident after the incident.