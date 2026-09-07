import { generateListing } from "../../../lib/generate.ts";
import { errorResponse, jsonResponse, readJson } from "../../../lib/http.ts";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const input = await readJson(request);
    const result = await generateListing(input, {
      apiKey: process.env.TOKEN_PLAN_API_KEY,
      baseUrl: process.env.TOKEN_PLAN_BASE_URL,
      model: process.env.TOKEN_PLAN_MODEL,
    });
    return jsonResponse(result);
  } catch (error) { return errorResponse(error); }
}
