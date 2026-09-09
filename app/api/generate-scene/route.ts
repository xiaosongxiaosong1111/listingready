import { generateScene } from "../../../lib/generate-scene.ts";
import { errorResponse, jsonResponse, readJson } from "../../../lib/http.ts";
export const runtime = "edge";
export async function POST(request: Request) {
  try {
    const input = await readJson(request, 1_700_000);
    return jsonResponse(await generateScene(input, { apiKey: process.env.TOKEN_PLAN_API_KEY, baseUrl: process.env.TOKEN_PLAN_BASE_URL, model: process.env.TOKEN_PLAN_IMAGE_MODEL }));
  } catch (error) { return errorResponse(error); }
}
