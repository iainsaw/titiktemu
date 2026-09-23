import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Allowed origins for CSRF — must include the custom domain proxy
const CSRF_ALLOWED_ORIGINS = [
  "https://titiktemu.mapid.io",
  "https://titiktemu.dimyati-dev.workers.dev",
];

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  // Accept same-origin and same-site (for proxy domain) and cross-site
  // since mapid.io proxies to workers.dev
  secFetchSite: (value) =>
    value === "same-origin" || value === "same-site" || value === "cross-site" || value === "none",
  // Validate Origin header against our whitelist
  origin: (origin) => CSRF_ALLOWED_ORIGINS.includes(origin),
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
