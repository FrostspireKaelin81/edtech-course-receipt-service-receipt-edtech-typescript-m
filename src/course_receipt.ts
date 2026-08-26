import { z } from "zod";

export const orderSchema = z.object({
  orderId: z.string().min(1),
  learner: z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
  course: z.object({
    title: z.string().min(1),
    accessUrl: z.string().url(),
    deadline: z.string().datetime({ offset: true }),
  }),
  educator: z.object({
    name: z.string().min(1),
    reportEmail: z.string().email(),
  }),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
});

export type CourseOrder = z.infer<typeof orderSchema>;

export type ReceiptEmail = {
  to: string;
  subject: string;
  html: string;
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

export function buildCourseReceipt(order: CourseOrder): ReceiptEmail {
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: order.currency,
  }).format(order.amountCents / 100);
  const deadline = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(order.course.deadline));

  return {
    to: order.learner.email,
    subject: `Receipt ${order.orderId}: ${order.course.title}`,
    html: [
      `<h1>Course access confirmed</h1>`,
      `<p>Hello ${escapeHtml(order.learner.name)}, your payment of <strong>${escapeHtml(amount)}</strong> is recorded.</p>`,
      `<p><a href="${escapeHtml(order.course.accessUrl)}">Open ${escapeHtml(order.course.title)}</a></p>`,
      `<p>Complete the course by ${escapeHtml(deadline)} UTC.</p>`,
      `<p>${escapeHtml(order.educator.name)} will receive progress reporting at ${escapeHtml(order.educator.reportEmail)}.</p>`,
      `<p>Order reference: ${escapeHtml(order.orderId)}</p>`,
    ].join(""),
  };
}
