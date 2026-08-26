import assert from "node:assert/strict";
import test from "node:test";
import { buildCourseReceipt, orderSchema } from "../src/course_receipt.js";

test("a paid course receipt carries delivery, deadline, and reporting decisions", () => {
  const order = orderSchema.parse({
    orderId: "EDU-42",
    learner: { name: "Ada <Admin>", email: "ada@example.com" },
    course: {
      title: "Tool-Using Agents",
      accessUrl: "https://learn.example.com/tool-agents",
      deadline: "2026-09-30T23:59:00-04:00",
    },
    educator: { name: "Professor Lin", reportEmail: "reports@example.edu" },
    amountCents: 12900,
    currency: "usd",
  });

  const receipt = buildCourseReceipt(order);

  assert.equal(receipt.to, "ada@example.com");
  assert.match(receipt.subject, /EDU-42: Tool-Using Agents/);
  assert.match(receipt.html, /October 1, 2026 at 3:59 AM UTC/);
  assert.match(receipt.html, /reports@example\.edu/);
  assert.match(receipt.html, /Ada &lt;Admin&gt;/);
});
