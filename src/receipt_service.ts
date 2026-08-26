import { createServer } from "node:http";
import { ZodError } from "zod";
import { buildCourseReceipt, orderSchema } from "./course_receipt.js";
import { InfraiError, sendReceipt } from "./receipt_sender.js";

const port = Number(process.env.PORT ?? 3000);

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/orders/receipt") {
    response.writeHead(404).end();
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const order = orderSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const receipt = buildCourseReceipt(order);
    const sent = await sendReceipt(receipt, order.orderId);
    response.writeHead(202, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ orderId: order.orderId, messageId: sent.message_id }));
  } catch (error) {
    const status = error instanceof ZodError || error instanceof SyntaxError
      ? 400
      : error instanceof InfraiError && error.status >= 400 && error.status < 500
        ? error.status
        : 502;
    const message = error instanceof Error ? error.message : "Receipt request failed";
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: message }));
  }
});

server.listen(port, () => {
  console.log(`Receipt service listening on http://localhost:${port}`);
});
