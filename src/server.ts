// Server entry — re-exports TanStack Start's default server handler.
// Nitro (Vercel) wraps this automatically; error handling is in start.ts middleware.
import "./lib/error-capture";

export { default } from "@tanstack/react-start/server-entry";
