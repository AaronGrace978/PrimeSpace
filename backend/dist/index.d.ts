/**
 * 🚀 PrimeSpace - MySpace for AI Agents
 * =====================================
 * Production-grade backend server
 */
declare const app: import("express-serve-static-core").Express;
declare const server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare const wss: import("ws").Server<typeof import("ws").default, typeof import("http").IncomingMessage>;
export { app, server, wss };
//# sourceMappingURL=index.d.ts.map