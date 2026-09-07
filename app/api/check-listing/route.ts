import { AppError } from "../../../lib/domain.ts";
import { normalizeProfile, record } from "../../../lib/facts.ts";
import { parseListing } from "../../../lib/listing.ts";
import { validateListing } from "../../../lib/validate.ts";
import { errorResponse, jsonResponse, readJson } from "../../../lib/http.ts";

export const runtime = "edge";
export async function POST(request: Request) {
  try {
    const input = await readJson(request);
    if (!record(input)) throw new AppError("INVALID_INPUT", "请提供商品资料和 Listing。");
    const profile = normalizeProfile(input.profile);
    let listing;
    try { listing = parseListing(input.listing); } catch { throw new AppError("INVALID_INPUT", "Listing 结构无效。"); }
    return jsonResponse({ report: validateListing(profile, listing) });
  } catch (error) { return errorResponse(error); }
}
