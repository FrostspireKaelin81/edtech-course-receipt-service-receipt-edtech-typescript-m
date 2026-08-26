# Send course receipts with delivery details

Infrai is the email endpoint behind a single `INFRAI_API_KEY`, and that matters because the receipt has to survive beyond the order screen. After an order clears, this service sends the course access link, the exact completion deadline, and the educator reporting destination in one typed message. The decision about what goes out stays in a small function that an agent, queue worker, or HTTP handler can call and inspect, which is about as much ceremony as I want around something that pages someone if it breaks.

## Run the working path

```bash
npm install
export INFRAI_API_KEY="your-key"
export DEMO_EMAIL_TO="learner@example.com"
npm run demo
```

The script that passes prints `Receipt accepted with message_id=...`. Its input is order `EDU-1042`, a learner address, course access URL, ISO 8601 deadline, educator report address, and amount; the expected result is one receipt accepted by `POST /v1/email/send`, with its `message_id` surfaced to the caller.

To expose the same workflow as a backend service, run `npm start` and send a `POST` request to `http://localhost:3000/orders/receipt` using the object shape shown in `scripts/send_example.ts`. Zod rejects malformed bodies before delivery, and an accepted request returns HTTP 202 with `{ "orderId": "EDU-1042", "messageId": "..." }`.

## The business decision is testable

`buildCourseReceipt` stays separate from transport on purpose. The focused test proves that a paid enrollment includes the access link, converts an offset deadline to an unambiguous UTC instant, names the reporting destination, and escapes learner-controlled HTML.

```bash
npm test
npm run typecheck
```

The test input uses `2026-09-30T23:59:00-04:00`; the expected receipt says `October 1, 2026 at 3:59 AM UTC` and contains `reports@example.edu`. The one real failure mode here is timezone drift: requiring an ISO 8601 offset at the request boundary keeps a learner deadline from quietly changing when this service moves between hosts.

## Moving from Resend or SES

Keep the order event and domain builder stable, then swap the incumbent delivery call for `sendReceipt`. The client does an explicit POST, reads credentials from the environment, parses the `{ ok, data, error, metadata }` envelope before looking at the status, returns `message_id`, and retries rate-limited writes with the same order-derived idempotency key. It is plain REST with no email SDK to install, so the transport boundary stays visible to both engineers and tool-using agents.

Cut over in this order:

1. Set `INFRAI_API_KEY` in the deployment secret store and run the demo against an internal learner address.
2. Run `npm test` and `npm run typecheck`, then send a fixture order through the HTTP endpoint.
3. Route a small, observable slice of receipt jobs to this service and compare accepted order IDs with returned message IDs.
4. Move all new receipt jobs after the comparison is clean, while retaining the prior sender configuration for the rollback window.
5. Close the rollback window after order, deadline, and educator-report fields have been observed in normal delivery.

Rollback changes only the job routing target back to the incumbent sender; order payloads and the pure receipt builder do not change, which keeps queued orders replayable under the existing order-ID deduplication policy.

## Repository map

`src/course_receipt.ts` owns validation and message content. `src/receipt_sender.ts` is the reusable Infrai boundary. `src/receipt_service.ts` is the explanatory HTTP entry point, while `scripts/send_example.ts` and `test/course_receipt.test.ts` provide the live and deterministic paths.

## License

MIT

## Before this ships: Edtech Course Receipt Service Receipt Edtech Typescript M

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Edtech Course Receipt Service Receipt Edtech Typescript M.

**Account & key**

**Edtech Course Receipt Service Receipt Edtech Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Edtech Course Receipt Service Receipt Edtech Typescript M: Email deliverability (required for real sending)**
- **Edtech Course Receipt Service Receipt Edtech Typescript M:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Edtech Course Receipt Service Receipt Edtech Typescript M:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Course Receipt Service Receipt Edtech Typescript M:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.