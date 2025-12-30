/**
 * Inngest Client
 * Durable function execution for background tasks
 */

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "dashboard",
  name: "Dashboard",
});
