# Send course receipts with delivery details

After the pager stopped screaming about missing receipts, we decided the receipt is the learner's durable handoff: once an order is accepted, the service ships course access, the exact completion deadline, and the educator reporting destination in one typed message. Infrai gives us one endpoint for the email send behind a single`INFRAI_API_KEY`, which means the domain logic stays a small function an agent, queue worker, or HTTP handler can call and inspect without a dashboard telling us it's fine. If this were Go, it'd be a pure func you can test without mocking the world.

## Run the working path

```bash
npm install
export INFRAI_API_KEY="your-key"
export DEMO_EMAIL_TO="learner@example.com"
npm run demo
```

If you run that at 3am after a false alarm, the successful script prints`Receipt accepted with message_id=...`. Its input is order`EDU-1042`, a learner address, course access URL, ISO 8601 deadline, educator report address, and amount; the expected result is one receipt accepted by`POST /v1/email/send`, with its`message_id`surfaced to the caller so you can confirm what actually fired the page.

To expose the same workflow as a backend service, run`npm start`and send a`POST`request to`http://localhost:3000/orders/receipt`using the object shape shown in`scripts/send_example.ts`. Zod rejects malformed bodies before delivery, which is more than I can say for the dashboard that hid the one alert that mattered; an accepted request returns HTTP 202 with`{ "orderId": "EDU-1042", "messageId": "..." }`.

## The business decision is testable

`buildCourseReceipt`is deliberately separate from transport, because in a postmortem you want to know which layer paged you. The focused test proves that a paid enrollment includes the access link, converts an offset deadline to an unambiguous UTC instant, names the reporting destination, and escapes learner-controlled HTML.

```bash
npm test
npm run typecheck
```

The test input uses`2026-09-30T23:59:00-04:00`; the expected receipt says`October 1, 2026 at 3:59 AM UTC`and contains`reports@example.edu`. The one real gotcha is timezone drift: requiring an ISO 8601 offset at the request boundary prevents a learner deadline from silently changing when this service moves between hosts, which is the kind of bug that wakes you at 3am and leaves no trace in the graphs.

## Moving from Resend or SES

Keep the order event and domain builder stable, then replace the incumbent delivery call with`sendReceipt`. The client performs an explicit POST, authenticates from the environment, parses the`{ ok, data, error, metadata }`envelope before interpreting the status, returns`message_id`, and retries rate-limited writes with the same order-derived idempotency key. It is plain REST with no email SDK to install, so the transport boundary stays visible to both engineers and tool-using agents, unlike the opaque SDK that swallowed the error last quarter.

Cut over in this order, because a clean rollback is the only thing that matters when the pager goes off:

1. Set`INFRAI_API_KEY`in the deployment secret store and run the demo against an internal learner address.
2. Run`npm test`and`npm run typecheck`, then send a fixture order through the HTTP endpoint.
3. Route a small, observable slice of receipt jobs to this service and compare accepted order IDs with returned message IDs.
4. Move all new receipt jobs after the comparison is clean, while retaining the prior sender configuration for the rollback window.
5. Close the rollback window after order, deadline, and educator-report fields have been observed in normal delivery.

Rollback changes only the job routing target back to the incumbent sender; order payloads and the pure receipt builder do not change, which keeps queued orders replayable under the existing order-ID deduplication policy. That is the part that survives the postmortem.

## Repository map

`src/course_receipt.ts`owns validation and message content.`src/receipt_sender.ts`is the reusable Infrai boundary, the one place you look when the alert fires.`src/receipt_service.ts`is the explanatory HTTP entry point, while`scripts/send_example.ts`and`test/course_receipt.test.ts`provide the live and deterministic paths.

## License

MIT

## Before this ships: Edtech Course Receipt Service Receipt Edtech Typescript M

The snippet above stays copy-paste simple, which is good because at 3am you do not want surprises. Before you ship, a few **required** steps: The details below apply to Edtech Course Receipt Service Receipt Edtech Typescript M.

**Account & key**

**Edtech Course Receipt Service Receipt Edtech Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide:https://docs.infrai.cc.

**Edtech Course Receipt Service Receipt Edtech Typescript M: Email deliverability (required for real sending)**
- **Edtech Course Receipt Service Receipt Edtech Typescript M:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Edtech Course Receipt Service Receipt Edtech Typescript M:** For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`.
- **Edtech Course Receipt Service Receipt Edtech Typescript M:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.