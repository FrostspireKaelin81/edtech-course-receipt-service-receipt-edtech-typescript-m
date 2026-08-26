import { buildCourseReceipt, orderSchema } from "../src/course_receipt.js";
import { sendReceipt } from "../src/receipt_sender.js";

const to = process.env.DEMO_EMAIL_TO;
if (!to) throw new Error("DEMO_EMAIL_TO is required");

const order = orderSchema.parse({
  orderId: "EDU-1042",
  learner: { name: "Ada", email: to },
  course: {
    title: "Agent Tool Orchestration",
    accessUrl: "https://learn.example.com/courses/agent-tools",
    deadline: "2026-09-30T23:59:00Z",
  },
  educator: { name: "Dr. Lin", reportEmail: "faculty@example.com" },
  amountCents: 12900,
  currency: "USD",
});

const result = await sendReceipt(buildCourseReceipt(order), order.orderId);
console.log(`Receipt accepted with message_id=${result.message_id}`);
