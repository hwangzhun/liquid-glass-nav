import { json, requireAuthenticated, type PagesContext } from "../_types";
import { findSiteIcons, UnsafeSiteIconUrlError } from "../../shared/siteIcons";

export async function onRequestPost(context: PagesContext) {
  const unauthorized = await requireAuthenticated(context.request, context.env);
  if (unauthorized) return unauthorized;
  try {
    const input = (await context.request.json()) as { url?: unknown };
    const url = typeof input.url === "string" ? input.url.trim() : "";
    if (!url) throw new UnsafeSiteIconUrlError("请填写网站地址。");
    return json({ icons: await findSiteIcons(url) });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "网站图标识别失败。",
      },
      { status: error instanceof UnsafeSiteIconUrlError ? 400 : 502 }
    );
  }
}
