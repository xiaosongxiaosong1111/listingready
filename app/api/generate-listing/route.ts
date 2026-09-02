import { NextResponse } from "next/server";

export const runtime = "edge";

type ProductFacts = {
  productName?: string;
  material?: string;
  dimensions?: string;
  color?: string;
  structure?: string;
  features?: string;
};

type ListingResult = {
  title: string;
  bullets: string[];
  description: string;
  searchTerms: string;
  checks: Array<{ label: string; detail: string; tone: "pass" | "warn" }>;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 2_000) : "";
}

function isConfirmed(value: string) {
  return value.length > 0 && !/(待确认|待测量|unknown|不确定|无法判断|n\/a)/i.test(value);
}

function parseModelJson(content: string): ListingResult | null {
  const candidate = content.match(/\{[\s\S]*\}/)?.[0] ?? content;
  try {
    const value = JSON.parse(candidate) as Partial<ListingResult>;
    if (
      typeof value.title !== "string" ||
      !Array.isArray(value.bullets) ||
      typeof value.description !== "string" ||
      typeof value.searchTerms !== "string" ||
      !Array.isArray(value.checks)
    ) {
      return null;
    }

    return {
      title: value.title.slice(0, 200),
      bullets: value.bullets.filter((item): item is string => typeof item === "string").slice(0, 5),
      description: value.description.slice(0, 2_000),
      searchTerms: value.searchTerms.slice(0, 500),
      checks: value.checks
        .filter((item): item is ListingResult["checks"][number] =>
          typeof item?.label === "string" &&
          typeof item?.detail === "string" &&
          (item.tone === "pass" || item.tone === "warn"),
        )
        .slice(0, 6),
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.TOKEN_PLAN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "服务端尚未配置 Token Plan API Key。" }, { status: 503 });
  }

  let body: ProductFacts;
  try {
    body = (await request.json()) as ProductFacts;
  } catch {
    return NextResponse.json({ error: "请求内容无效。" }, { status: 400 });
  }

  const facts = Object.fromEntries(
    Object.entries(body).map(([key, value]) => [key, cleanText(value)]),
  ) as Required<ProductFacts>;

  if (!facts.productName || !facts.features) {
    return NextResponse.json({ error: "请至少填写商品名称和核心卖点。" }, { status: 400 });
  }

  const unconfirmed = Object.entries(facts)
    .filter(([key, value]) => key !== "productName" && !isConfirmed(value))
    .map(([key]) => key);

  const prompt = `You are ListingReady, an Amazon US listing assistant for cross-border sellers. Generate a reviewable English draft from the seller-provided product facts below.\n\nRules:\n- Use ONLY the facts supplied. Never invent material, dimensions, pack count, weight, load capacity, certifications, performance claims, or locking/stacking mechanisms.\n- If a field is unconfirmed, omit the claim from the listing and flag it in checks.\n- Avoid superlatives, rankings, guarantees, medical claims, and unsupported compliance claims.\n- Produce a concise Amazon US English title, exactly five bullet points when evidence allows, a description, and search terms.\n- Return JSON only.\n\nProduct facts:\n${JSON.stringify(facts, null, 2)}\n\nUnconfirmed fields: ${unconfirmed.join(", ") || "none"}\n\nRequired JSON shape:\n{"title":"string","bullets":["string"],"description":"string","searchTerms":"string","checks":[{"label":"string","detail":"string","tone":"pass"|"warn"}]}`;

  const baseUrl = (process.env.TOKEN_PLAN_BASE_URL ?? "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  const model = process.env.TOKEN_PLAN_MODEL ?? "qwen3.6-flash";

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You return valid JSON only, with no Markdown fences." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `模型服务请求失败（${response.status}）。请稍后重试。` }, { status: 502 });
    }

    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const result = parseModelJson(payload.choices?.[0]?.message?.content ?? "");
    if (!result || result.bullets.length === 0) {
      return NextResponse.json({ error: "模型未返回可用的结构化 Listing，请重试。" }, { status: 502 });
    }

    return NextResponse.json({ result, model });
  } catch {
    return NextResponse.json({ error: "无法连接模型服务，请检查网络或稍后重试。" }, { status: 502 });
  }
}
