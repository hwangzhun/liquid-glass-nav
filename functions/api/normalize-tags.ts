import { normalizeTagsWithConfig } from "../../shared/siteAnalysis";
import { json, requireAuthenticated, type PagesContext } from "../_types";

export async function onRequestPost(context: PagesContext) {
  const unauthorized = await requireAuthenticated(context.request, context.env);
  if (unauthorized) return unauthorized;
  try {
    return json({
      mappings: await normalizeTagsWithConfig(await context.request.json(), {
        apiKey: context.env.AI_API_KEY || context.env.OPENAI_API_KEY,
        baseUrl: context.env.AI_BASE_URL || context.env.OPENAI_BASE_URL,
        model: context.env.AI_MODEL || context.env.OPENAI_MODEL,
      }),
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "标签整理失败。" }, { status: 400 });
  }
}
