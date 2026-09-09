// The host handles /mcp itself. Expose the token-authenticated Taskando
// transport through the application's API router, with the same auth checks.
export { POST, GET, DELETE } from "../../../mcp/route";
