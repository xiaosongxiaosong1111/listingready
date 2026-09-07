import { createExport } from "../../../lib/export.ts";
import { errorResponse, jsonResponse, readJson } from "../../../lib/http.ts";

export const runtime = "edge";
export async function POST(request: Request) {
  try { return jsonResponse(createExport(await readJson(request))); }
  catch (error) { return errorResponse(error); }
}
