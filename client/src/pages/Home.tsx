/* 潮汐玻璃提醒：这里维持“固定目录脊柱 + 开放内容海域”的结构；透明材质必须服务于快速检索，薄荷色只承担选中与反馈信号。 */
import {
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Download,
  Folder,
  Grid2X2,
  Grid3X3,
  GripVertical,
  ImagePlus,
  Keyboard,
  LayoutList,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  CSSProperties,
  DragEvent as ReactDragEvent,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import packageJson from "../../../package.json";
import { toast } from "sonner";
import { FlowBackgroundCanvas } from "../components/FlowBackgroundCanvas";

type CategoryId = string;
type SortMode = "curated" | "az";
type ViewMode = "large" | "medium" | "small" | "mini";
type FlowBackgroundMode =
  | "flow-emerald"
  | "flow-iridescent-cloud"
  | "flow-lagoon"
  | "flow-oil-film"
  | "flow-opal"
  | "flow-pearl-light"
  | "flow-tropical-night";
type FlowAnimationSpeed = "slow" | "normal" | "fast";
type BackgroundMode =
  | "mist"
  | "blue"
  | "midnight"
  | "custom"
  | FlowBackgroundMode;
type AnalysisSource = "ai" | "local";

type SiteIconCandidate = {
  url: string;
  kind: "favicon" | "apple-touch" | "manifest";
  label: string;
};

type CloudPreferences = {
  skin?: "dark" | "light";
  viewMode?: ViewMode;
  sortMode?: SortMode;
  showDescriptions?: boolean;
  siteName?: string;
  sidebarCollapsed?: boolean;
  backgroundMode?: BackgroundMode;
  backgroundAnimationSpeed?: FlowAnimationSpeed;
  customBackground?: string;
  backgroundImage?: string;
  backgroundImageBlur?: number;
  backgroundImageBrightness?: number;
  backgroundImageContrast?: number;
  backgroundImageAdaptive?: boolean;
};

type CloudState = {
  categories: Category[];
  favorites: string[];
  preferences: CloudPreferences;
};

type CloudStateResponse = {
  state: CloudState | null;
};

type Category = {
  id: CategoryId;
  label: string;
  iconKey: CategoryIconKey;
  color: string;
  system?: boolean;
};

type Site = {
  id: string;
  name: string;
  url: string;
  description: string;
  category: CategoryId;
  categoryLabel: string;
  icon: string;
  iconUrl?: string;
  iconScale?: number;
  iconBackground?: string;
  iconTone: string;
  tags: string[];
  featured?: boolean;
  accent?: string;
  sortOrder?: number;
};

type ImportedBookmark = {
  name: string;
  url: string;
  description?: string;
  iconUrl?: string;
  icon?: string;
  tags?: string[];
  favorite?: boolean;
};

type ImportedBookmarkGroup = {
  label: string;
  bookmarks: ImportedBookmark[];
};

type BookmarkExport = {
  format: "liquid-glass-nav";
  version: 1;
  exportedAt: string;
  categories: Category[];
  sites: Site[];
  favorites: string[];
};

const initialSites: Site[] = [];

const categoryIconMap = {
  grid: Grid2X2,
  sparkles: Sparkles,
  sliders: SlidersHorizontal,
  list: LayoutList,
  compass: Compass,
  bookmark: Bookmark,
  folder: Folder,
  briefcase: BriefcaseBusiness,
  palette: Palette,
} as const;

type CategoryIconKey = keyof typeof categoryIconMap;

const categoryIconOptions: { key: CategoryIconKey; label: string }[] = [
  { key: "folder", label: "文件夹" },
  { key: "briefcase", label: "工作" },
  { key: "sparkles", label: "星光" },
  { key: "palette", label: "创意" },
  { key: "sliders", label: "工具" },
  { key: "list", label: "列表" },
  { key: "compass", label: "指南针" },
  { key: "bookmark", label: "收藏" },
];

const defaultCategoryMeta: Category[] = [
  {
    id: "all",
    label: "全部入口",
    iconKey: "grid",
    color: "mint",
    system: true,
  },
  {
    id: "favorites",
    label: "我的收藏",
    iconKey: "bookmark",
    color: "rose",
    system: true,
  },
];

const flowBackgroundPresets: Array<{
  id: FlowBackgroundMode;
  name: string;
  description: string;
  colors: readonly string[];
  preview: string;
}> = [
  {
    id: "flow-emerald",
    name: "翡翠",
    description: "翠绿流光",
    colors: ["#f0fbef", "#8fe3b0", "#22c79a", "#0b5f51"],
    preview: "linear-gradient(135deg, #f0fbef 12.5%, #8fe3b0 37.5%, #22c79a 62.5%, #0b5f51 87.5%)",
  },
  {
    id: "flow-iridescent-cloud",
    name: "幻彩云",
    description: "蓝粉云霞",
    colors: ["#eaf4fc", "#1e50a2", "#f09199", "#895b8a"],
    preview: "linear-gradient(135deg, #eaf4fc 12.5%, #1e50a2 37.5%, #f09199 62.5%, #895b8a 87.5%)",
  },
  {
    id: "flow-lagoon",
    name: "泻湖",
    description: "青蓝水色",
    colors: ["#eafbf7", "#5ce3e6", "#0f9cc2", "#274a78"],
    preview: "linear-gradient(135deg, #eafbf7 12.5%, #5ce3e6 37.5%, #0f9cc2 62.5%, #274a78 87.5%)",
  },
  {
    id: "flow-oil-film",
    name: "油膜",
    description: "虹彩暗涌",
    colors: ["#181b3a", "#007bbb", "#00a3af", "#824880", "#f8e58c"],
    preview: "linear-gradient(135deg, #181b3a 10%, #007bbb 30%, #00a3af 50%, #824880 70%, #f8e58c 90%)",
  },
  {
    id: "flow-opal",
    name: "欧泊",
    description: "柔和彩光",
    colors: ["#f6f9ff", "#9be0e8", "#c4b5f7", "#f8b8d9"],
    preview: "linear-gradient(135deg, #f6f9ff 12.5%, #9be0e8 37.5%, #c4b5f7 62.5%, #f8b8d9 87.5%)",
  },
  {
    id: "flow-pearl-light",
    name: "珍珠光",
    description: "温润珠光",
    colors: ["#eaf4fc", "#d6bbc6", "#a2d7dd", "#f8e58c", "#b28fce"],
    preview: "linear-gradient(135deg, #eaf4fc 10%, #d6bbc6 30%, #a2d7dd 50%, #f8e58c 70%, #b28fce 90%)",
  },
  {
    id: "flow-tropical-night",
    name: "热带夜",
    description: "深色霓光",
    colors: ["#0d0d0d", "#460e44", "#824880", "#00a3af", "#68be8d"],
    preview: "linear-gradient(135deg, #0d0d0d 10%, #460e44 30%, #824880 50%, #00a3af 70%, #68be8d 90%)",
  },
];

const flowAnimationSpeedOptions: Array<{
  id: FlowAnimationSpeed;
  label: string;
  description: string;
  canvasSpeed: number;
  cssDuration: number;
}> = [
  { id: "slow", label: "舒缓", description: "慢速流动", canvasSpeed: 16, cssDuration: 24 },
  { id: "normal", label: "标准", description: "自然节奏", canvasSpeed: 26, cssDuration: 16 },
  { id: "fast", label: "活跃", description: "快速变幻", canvasSpeed: 42, cssDuration: 9 },
];

const backgroundModes: BackgroundMode[] = [
  "mist",
  "blue",
  "midnight",
  "custom",
  ...flowBackgroundPresets.map(preset => preset.id),
];

const iconBackgroundPresets = [
  { name: "冰蓝", value: "#dceeff" },
  { name: "潮汐蓝", value: "#b9d9ff" },
  { name: "天青", value: "#bdefff" },
  { name: "薄荷", value: "#bcefe5" },
  { name: "海沫", value: "#ccf4dd" },
  { name: "鼠尾草", value: "#dce8d5" },
  { name: "暖沙", value: "#f4e4c1" },
  { name: "珊瑚", value: "#ffd8cc" },
  { name: "雾粉", value: "#f7d9e4" },
  { name: "淡紫", value: "#e5ddff" },
  { name: "云灰", value: "#dfe6ee" },
  { name: "霜白", value: "#f7f9fc" },
] as const;

const categoryLabelMap: Record<string, string> = {
  design: "设计工作室",
  dev: "开发工具",
  productivity: "效率工具",
  inspiration: "灵感收藏",
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeSingleTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tag = value.find(item => typeof item === "string" && item.trim());
  return typeof tag === "string" ? [tag.trim().slice(0, 24)] : [];
}

function normalizeSites(value: Site[]) {
  return value.map(site => ({
    ...site,
    tags: normalizeSingleTags(site.tags),
    iconBackground:
      typeof site.iconBackground === "string" &&
      /^#[0-9a-f]{6}$/i.test(site.iconBackground)
        ? site.iconBackground.toLowerCase()
        : "#ffffff",
  }));
}

function normalizeViewMode(value: unknown): ViewMode {
  if (
    value === "large" ||
    value === "medium" ||
    value === "small" ||
    value === "mini"
  )
    return value;
  if (value === "comfortable") return "large";
  if (value === "dense") return "medium";
  if (value === "icon") return "small";
  return "large";
}

function normalizeFlowAnimationSpeed(value: unknown): FlowAnimationSpeed {
  return value === "slow" || value === "fast" ? value : "normal";
}

function supportsDesktopFlowCanvas() {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;
  return (
    navigator.maxTouchPoints === 0 &&
    window.matchMedia(
      "(min-width: 1024px) and (hover: hover) and (pointer: fine)"
    ).matches
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeBookmarkUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return ["http:", "https:"].includes(parsed.protocol)
      ? parsed.toString()
      : "";
  } catch {
    return "";
  }
}

function decodeJsonString(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function parseLooseWetabBookmarks(text: string): ImportedBookmarkGroup[] {
  const headers = Array.from(
    text.matchAll(
      /"id"\s*:\s*"category-[^"]+"[\s\S]*?"name"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]*?"children"\s*:\s*\[/g
    )
  );
  const objectPattern =
    /\{[^{}]*"name"\s*:\s*"(?:\\.|[^"\\])*"[^{}]*"url"\s*:\s*"(?:\\.|[^"\\])*"[^{}]*\}/g;
  const parseSegment = (segment: string) =>
    Array.from(segment.matchAll(objectPattern)).flatMap(match => {
      try {
        const item = JSON.parse(match[0]) as Record<string, unknown>;
        if (typeof item.name !== "string" || typeof item.url !== "string")
          return [];
        return [
          {
            name: item.name.trim(),
            url: item.url,
            iconUrl:
              typeof item.bgImage === "string" ? item.bgImage : undefined,
            icon: typeof item.bgText === "string" ? item.bgText : undefined,
          } satisfies ImportedBookmark,
        ];
      } catch {
        return [];
      }
    });

  const groups: ImportedBookmarkGroup[] = [];
  const firstHeaderIndex = headers[0]?.index ?? text.length;
  const leading = parseSegment(text.slice(0, firstHeaderIndex));
  if (leading.length) groups.push({ label: "未分类", bookmarks: leading });
  headers.forEach((header, index) => {
    const start = (header.index ?? 0) + header[0].length;
    const end = headers[index + 1]?.index ?? text.length;
    const bookmarks = parseSegment(text.slice(start, end));
    if (bookmarks.length)
      groups.push({
        label: decodeJsonString(header[1]).trim() || "未分类",
        bookmarks,
      });
  });
  return groups;
}

function parseBookmarkFile(text: string): ImportedBookmarkGroup[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    return parseLooseWetabBookmarks(text);
  }

  if (
    isRecord(parsed) &&
    parsed.format === "liquid-glass-nav" &&
    Array.isArray(parsed.sites)
  ) {
    const categoryLabels = new Map<string, string>();
    if (Array.isArray(parsed.categories)) {
      parsed.categories.forEach(category => {
        if (
          isRecord(category) &&
          typeof category.id === "string" &&
          typeof category.label === "string"
        )
          categoryLabels.set(category.id, category.label);
      });
    }
    const favoriteIds = new Set(
      Array.isArray(parsed.favorites)
        ? parsed.favorites.filter((id): id is string => typeof id === "string")
        : []
    );
    const groups = new Map<string, ImportedBookmark[]>();
    parsed.sites.forEach(value => {
      if (
        !isRecord(value) ||
        typeof value.name !== "string" ||
        typeof value.url !== "string"
      )
        return;
      const categoryId =
        typeof value.category === "string" ? value.category : "";
      const label =
        categoryLabels.get(categoryId) ||
        (typeof value.categoryLabel === "string"
          ? value.categoryLabel
          : "未分类");
      const bookmarks = groups.get(label) || [];
      bookmarks.push({
        name: value.name,
        url: value.url,
        description:
          typeof value.description === "string" ? value.description : undefined,
        iconUrl: typeof value.iconUrl === "string" ? value.iconUrl : undefined,
        icon: typeof value.icon === "string" ? value.icon : undefined,
        tags: Array.isArray(value.tags)
          ? value.tags.filter((tag): tag is string => typeof tag === "string")
          : undefined,
        favorite: typeof value.id === "string" && favoriteIds.has(value.id),
      });
      groups.set(label, bookmarks);
    });
    return Array.from(groups, ([label, bookmarks]) => ({ label, bookmarks }));
  }

  const groups: ImportedBookmarkGroup[] = [];
  const visit = (value: unknown, inheritedLabel = "未分类") => {
    if (Array.isArray(value))
      return value.forEach(item => visit(item, inheritedLabel));
    if (!isRecord(value)) return;
    if (typeof value.url === "string") {
      const name = typeof value.name === "string" ? value.name : "";
      let group = groups.find(item => item.label === inheritedLabel);
      if (!group) {
        group = { label: inheritedLabel, bookmarks: [] };
        groups.push(group);
      }
      group.bookmarks.push({
        name,
        url: value.url,
        iconUrl: typeof value.bgImage === "string" ? value.bgImage : undefined,
        icon: typeof value.bgText === "string" ? value.bgText : undefined,
      });
      return;
    }
    if (Array.isArray(value.children)) {
      const label =
        typeof value.name === "string" && value.name.trim()
          ? value.name.trim()
          : inheritedLabel;
      value.children.forEach(item => visit(item, label));
      return;
    }
    Object.values(value).forEach(item => visit(item, inheritedLabel));
  };
  visit(parsed);
  return groups;
}

function getInitialCategories(): Category[] {
  const stored = readLocal<Category[]>("tidal-categories", []);
  if (Array.isArray(stored) && stored.length >= 3) {
    const valid = stored
      .filter(
        (category, index) =>
          category &&
          typeof category.id === "string" &&
          typeof category.label === "string" &&
          category.id !== "" &&
          stored.findIndex(item => item.id === category.id) === index
      )
      .map(category => ({
        ...category,
        iconKey:
          category.iconKey in categoryIconMap ? category.iconKey : "folder",
        system: category.id === "all" || category.id === "favorites",
      }));
    if (
      valid.some(category => category.id === "all") &&
      valid.some(category => category.id === "favorites")
    )
      return valid;
  }

  const legacyNames = readLocal<Record<string, string>>(
    "tidal-category-names",
    {}
  );
  const legacyOrder = readLocal<string[]>(
    "tidal-category-order",
    defaultCategoryMeta.map(category => category.id)
  );
  const byId = new Map(
    defaultCategoryMeta.map(category => [category.id, category])
  );
  const ordered = legacyOrder.flatMap(id => {
    const category = byId.get(id);
    return category
      ? [{ ...category, label: legacyNames[id]?.trim() || category.label }]
      : [];
  });
  defaultCategoryMeta.forEach(category => {
    if (!ordered.some(item => item.id === category.id))
      ordered.push({
        ...category,
        label: legacyNames[category.id]?.trim() || category.label,
      });
  });
  return ordered;
}

function LogoMark() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <img src="/logo.svg" alt="" />
    </div>
  );
}

function CategoryIcon({ category }: { category: Category }) {
  const Icon = categoryIconMap[category.iconKey] || Folder;
  return (
    <span className={`category-icon icon-${category.color}`}>
      <Icon size={16} strokeWidth={1.7} />
    </span>
  );
}

function CategoryIconPicker({
  value,
  onChange,
}: {
  value: CategoryIconKey;
  onChange: (value: CategoryIconKey) => void;
}) {
  return (
    <div
      className="category-icon-picker"
      role="group"
      aria-label="选择分类图标"
    >
      {categoryIconOptions.map(option => {
        const Icon = categoryIconMap[option.key];
        return (
          <button
            key={option.key}
            type="button"
            className={
              value === option.key ? "category-icon-option-active" : ""
            }
            onClick={() => onChange(option.key)}
            aria-label={option.label}
            aria-pressed={value === option.key}
            title={option.label}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}

function BackgroundSlider({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="background-filter-control">
      <span>
        <strong>{label}</strong>
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function faviconUrl(siteUrl: string) {
  try {
    return `${new URL(siteUrl).origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function SiteIcon({ site }: { site: Site }) {
  const [iconFailed, setIconFailed] = useState(false);
  const source = site.iconUrl || faviconUrl(site.url);
  const iconScale = Math.min(100, Math.max(30, site.iconScale ?? 100));
  return (
    <span
      className={`site-icon site-icon-${site.iconTone}`}
      data-custom-background={site.iconBackground ? "true" : undefined}
      style={
        {
          "--site-icon-scale": `${iconScale}%`,
          "--site-icon-background": site.iconBackground || undefined,
        } as CSSProperties
      }
    >
      {source && !iconFailed ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          className={iconScale === 100 ? "site-icon-image-fill" : ""}
          onError={() => setIconFailed(true)}
        />
      ) : (
        site.icon
      )}
    </span>
  );
}

function IconCustomization({
  scale,
  background,
  onScaleChange,
  onBackgroundChange,
}: {
  scale: number;
  background: string;
  onScaleChange: (value: number) => void;
  onBackgroundChange: (value: string) => void;
}) {
  const randomizeBackground = () => {
    const candidates = iconBackgroundPresets.filter(
      preset => preset.value.toLowerCase() !== background.toLowerCase()
    );
    const next =
      candidates[Math.floor(Math.random() * candidates.length)] ||
      iconBackgroundPresets[0];
    onBackgroundChange(next.value);
  };

  return (
    <div className="icon-customization">
      <label className="icon-scale-control">
        <span>
          图标大小 <output>{scale}%</output>
        </span>
        <input
          type="range"
          min={30}
          max={100}
          step={5}
          value={scale}
          onChange={event => onScaleChange(Number(event.target.value))}
        />
      </label>
      <label className="icon-background-control">
        <span>自定义底色</span>
        <span className="icon-color-picker">
          <input
            type="color"
            value={background}
            onChange={event => onBackgroundChange(event.target.value)}
            aria-label="选择 Icon 底色"
          />
          <i style={{ background }} />
        </span>
      </label>
      <div className="icon-preset-control">
        <div className="icon-preset-header">
          <span>Icon 底色 · 12 色预设</span>
          <button type="button" onClick={randomizeBackground}>
            <Shuffle size={13} />
            随机换色
          </button>
        </div>
        <div className="icon-preset-swatches">
          {iconBackgroundPresets.map(preset => {
            const active =
              preset.value.toLowerCase() === background.toLowerCase();
            return (
              <button
                key={preset.value}
                type="button"
                className={active ? "icon-preset-active" : ""}
                style={{ "--preset-color": preset.value } as CSSProperties}
                onClick={() => onBackgroundChange(preset.value)}
                aria-label={`使用${preset.name}底色`}
                aria-pressed={active}
                title={preset.name}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function iconCanLoad(url: string) {
  return new Promise<boolean>(resolve => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.src = "";
      resolve(false);
    }, 4_000);
    const finish = (loaded: boolean) => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve(loaded);
    };
    image.referrerPolicy = "no-referrer";
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = url;
  });
}

function SiteIconSettings({
  name,
  url,
  iconUrl,
  scale,
  background,
  autoDiscover = false,
  onChange,
}: {
  name: string;
  url: string;
  iconUrl: string;
  scale: number;
  background: string;
  autoDiscover?: boolean;
  onChange: (value: {
    iconUrl?: string;
    iconScale?: number;
    iconBackground?: string;
  }) => void;
}) {
  const requestIdRef = useRef(0);
  const iconUrlRef = useRef(iconUrl);
  const [activeTab, setActiveTab] = useState<"auto" | "upload">(
    iconUrl.startsWith("data:") ? "upload" : "auto"
  );
  const [candidates, setCandidates] = useState<SiteIconCandidate[]>([]);
  const [failedCandidates, setFailedCandidates] = useState<Set<string>>(
    new Set()
  );
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);

  iconUrlRef.current = iconUrl;

  const loadCandidates = async (selectFirst = false) => {
    if (!url.trim()) {
      setFetchError("请先填写网站地址。");
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoadingCandidates(true);
    setFetchError("");
    setFailedCandidates(new Set());
    try {
      const response = await fetch("/api/site-icons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as {
        icons?: SiteIconCandidate[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "网站图标识别失败。");
      if (requestId !== requestIdRef.current) return;
      const icons = Array.isArray(payload.icons)
        ? payload.icons.slice(0, 8)
        : [];
      setCandidates(icons);
      if (selectFirst && !iconUrlRef.current && icons[0]) {
        const results = await Promise.all(
          icons.map(candidate => iconCanLoad(candidate.url))
        );
        if (requestId !== requestIdRef.current) return;
        setFailedCandidates(
          new Set(
            icons
              .filter((_, index) => !results[index])
              .map(candidate => candidate.url)
          )
        );
        const firstAvailable = icons.find((_, index) => results[index]);
        if (!iconUrlRef.current && firstAvailable) {
          iconUrlRef.current = firstAvailable.url;
          onChange({ iconUrl: firstAvailable.url });
        }
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setCandidates([]);
      setFetchError(
        error instanceof Error ? error.message : "网站图标识别失败。"
      );
    } finally {
      if (requestId === requestIdRef.current) setLoadingCandidates(false);
    }
  };

  useEffect(() => {
    requestIdRef.current += 1;
    setCandidates([]);
    setFailedCandidates(new Set());
    setFetchError("");
  }, [url]);

  useEffect(() => {
    setPreviewFailed(false);
    if (iconUrl.startsWith("data:")) setActiveTab("upload");
  }, [iconUrl]);

  useEffect(() => {
    if (url.trim()) void loadCandidates(autoDiscover && !iconUrlRef.current);
    // The settings page intentionally discovers once whenever it is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDiscover, url]);

  const uploadIcon = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件。");
      return;
    }
    if (file.size > 256 * 1024) {
      toast.error("图标图片不能超过 256KB。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      requestIdRef.current += 1;
      iconUrlRef.current = reader.result;
      onChange({ iconUrl: reader.result });
      toast.success("本地图标已加入当前表单。");
    };
    reader.readAsDataURL(file);
  };

  const visibleCandidates = candidates.filter(
    candidate => !failedCandidates.has(candidate.url)
  );
  const displayIcon = iconUrl && !previewFailed ? iconUrl : "";
  const previewLabel = name.trim().slice(0, 2) || "图";

  return (
    <div className="site-icon-settings-page">
      <div className="site-icon-settings-current">
        <span
          className="site-icon-settings-preview"
          style={
            {
              "--site-icon-scale": `${scale}%`,
              "--site-icon-background": background,
            } as CSSProperties
          }
        >
          {displayIcon ? (
            <img
              src={displayIcon}
              alt="图标预览"
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <span>{previewLabel}</span>
          )}
        </span>
        <div>
          <strong>{name.trim() || "未命名网站"}</strong>
          <p>当前图标预览</p>
        </div>
      </div>
      <div className="site-icon-settings-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "auto"}
          className={activeTab === "auto" ? "active" : ""}
          onClick={() => setActiveTab("auto")}
        >
          自动图标
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "upload"}
          className={activeTab === "upload" ? "active" : ""}
          onClick={() => setActiveTab("upload")}
        >
          本地上传
        </button>
      </div>

      <div className="site-icon-settings-content">
        {activeTab === "auto" ? (
          <div className="site-icon-auto-panel">
            <div className="site-icon-panel-heading">
              <div>
                <strong>网站发现的图标</strong>
                <p>选择一个候选图标，预览会立即更新。</p>
              </div>
              <button
                type="button"
                onClick={() => void loadCandidates(false)}
                disabled={loadingCandidates}
              >
                <RefreshCw
                  size={14}
                  className={loadingCandidates ? "is-spinning" : ""}
                />
                重试
              </button>
            </div>
            {loadingCandidates ? (
              <div className="site-icon-candidate-loading">
                <RefreshCw size={18} className="is-spinning" />
                正在查找图标…
              </div>
            ) : visibleCandidates.length ? (
              <div className="site-icon-candidate-grid">
                {visibleCandidates.map(candidate => (
                  <button
                    key={candidate.url}
                    type="button"
                    className={iconUrl === candidate.url ? "selected" : ""}
                    onClick={() => {
                      iconUrlRef.current = candidate.url;
                      onChange({ iconUrl: candidate.url });
                    }}
                    aria-pressed={iconUrl === candidate.url}
                    title={candidate.label}
                  >
                    <img
                      src={candidate.url}
                      alt=""
                      onError={() =>
                        setFailedCandidates(current =>
                          new Set(current).add(candidate.url)
                        )
                      }
                    />
                    <span>{candidate.label}</span>
                    {iconUrl === candidate.url && <Check size={13} />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="site-icon-empty-state">
                <span>{previewLabel}</span>
                <div>
                  <strong>暂时没有可用候选</strong>
                  <p>{fetchError || "可以重试，或改用本地上传。"}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <label className="site-icon-upload-panel">
            <input
              type="file"
              accept="image/*"
              onChange={event => uploadIcon(event.target.files?.[0])}
            />
            <span className="site-icon-upload-mark">
              <Upload size={20} />
            </span>
            <strong>选择本地图标</strong>
            <p>支持常见图片格式，文件不超过 256KB。</p>
          </label>
        )}

        <div className="site-icon-appearance-section">
          <div className="site-icon-panel-heading">
            <div>
              <strong>图标外观</strong>
              <p>调整图片留白和玻璃卡片底色。</p>
            </div>
          </div>
          <IconCustomization
            scale={scale}
            background={background}
            onScaleChange={iconScale => onChange({ iconScale })}
            onBackgroundChange={iconBackground => onChange({ iconBackground })}
          />
        </div>

        <details className="site-icon-advanced">
          <summary>高级 · 自定义图标 URL</summary>
          <label>
            图标地址
            <input
              value={iconUrl.startsWith("data:") ? "" : iconUrl}
              onChange={event => {
                iconUrlRef.current = event.target.value;
                onChange({ iconUrl: event.target.value });
              }}
              placeholder={faviconUrl(url) || "https://example.com/icon.png"}
            />
          </label>
        </details>
      </div>
    </div>
  );
}

function OpenSiteIconSettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="site-icon-settings-navigation"
      onClick={onClick}
    >
      <span className="site-icon-settings-navigation-mark">
        <Settings2 size={18} />
      </span>
      <span>
        <strong>设置网站图标</strong>
        <small>自动获取、上传图片和调整图标外观</small>
      </span>
      <ChevronRight size={17} />
    </button>
  );
}

export default function Home({
  isAuthenticated,
  onLogin,
  onLogout,
}: {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileNavTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileNavCloseRef = useRef<HTMLButtonElement>(null);
  const mobileNavWasOpenRef = useRef(false);
  const bookmarkImportRef = useRef<HTMLInputElement>(null);
  const categoryNavRef = useRef<HTMLElement>(null);
  const draggingSiteIdRef = useRef<string | null>(null);
  const siteDragMovedRef = useRef(false);
  const lastDragTargetRef = useRef<string | null>(null);
  const siteLayoutPositionsRef = useRef<Map<string, DOMRect>>(new Map());
  const siteLayoutAnimationsRef = useRef<Map<string, Animation>>(new Map());
  const shouldAnimateSiteLayoutRef = useRef(false);
  const draggingCategoryIdRef = useRef<string | null>(null);
  const lastCategoryDragTargetRef = useRef<string | null>(null);
  const settingsCloseTimerRef = useRef<number | null>(null);
  const addCloseTimerRef = useRef<number | null>(null);
  const editCloseTimerRef = useRef<number | null>(null);
  const mobileNavCloseTimerRef = useRef<number | null>(null);
  const editHintExitTimerRef = useRef<number | null>(null);
  const categoryTransitionTimersRef = useRef<number[]>([]);
  const [storageMode, setStorageMode] = useState<
    "connecting" | "cloud" | "local"
  >("connecting");
  const [cloudStateReady, setCloudStateReady] = useState(false);
  const [lastSyncedLabel, setLastSyncedLabel] = useState("");
  const [savingSite, setSavingSite] = useState(false);
  const [importingBookmarks, setImportingBookmarks] = useState(false);
  const [sites, setSites] = useState<Site[]>(() =>
    normalizeSites(readLocal("tidal-sites", initialSites))
  );
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [displayedCategory, setDisplayedCategory] = useState<CategoryId>("all");
  const [categoryTransitionPhase, setCategoryTransitionPhase] = useState<
    "idle" | "exiting" | "entering" | "settled"
  >("idle");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() =>
    readLocal("tidal-favorites", [])
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsClosing, setSettingsClosing] = useState(false);
  const [settingsPreviewRect, setSettingsPreviewRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addClosing, setAddClosing] = useState(false);
  const [newIconSettingsOpen, setNewIconSettingsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(
    () => new Set()
  );
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [editHintExiting, setEditHintExiting] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editClosing, setEditClosing] = useState(false);
  const [editIconSettingsOpen, setEditIconSettingsOpen] = useState(false);
  const [draggingSiteId, setDraggingSiteId] = useState<string | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileNavClosing, setMobileNavClosing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    readLocal("tidal-sidebar-collapsed", false)
  );
  const [skin, setSkin] = useState<"dark" | "light">(() =>
    readLocal("tidal-skin", "dark")
  );
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(() => {
    const stored = readLocal<string>("tidal-background", "mist");
    return backgroundModes.includes(stored as BackgroundMode)
      ? (stored as BackgroundMode)
      : "mist";
  });
  const [backgroundAnimationSpeed, setBackgroundAnimationSpeed] =
    useState<FlowAnimationSpeed>(() =>
      normalizeFlowAnimationSpeed(
        readLocal("tidal-background-animation-speed", "normal")
      )
    );
  const [desktopFlowCanvas, setDesktopFlowCanvas] = useState(
    supportsDesktopFlowCanvas
  );
  const [customBackground, setCustomBackground] = useState(() =>
    readLocal("tidal-custom-background", "#f5f5f7")
  );
  const [backgroundImage, setBackgroundImage] = useState(() =>
    readLocal("tidal-background-image", "")
  );
  const [backgroundImageBlur, setBackgroundImageBlur] = useState(() =>
    readLocal("tidal-background-image-blur", 8)
  );
  const [backgroundImageBrightness, setBackgroundImageBrightness] = useState(
    () => readLocal("tidal-background-image-brightness", 100)
  );
  const [backgroundImageContrast, setBackgroundImageContrast] = useState(() =>
    readLocal("tidal-background-image-contrast", 100)
  );
  const [backgroundImageAdaptive, setBackgroundImageAdaptive] = useState(() =>
    readLocal("tidal-background-image-adaptive", true)
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    normalizeViewMode(readLocal("tidal-view", "large"))
  );
  const [sortMode, setSortMode] = useState<SortMode>(() =>
    readLocal("tidal-sort", "curated")
  );
  const [showDescriptions, setShowDescriptions] = useState(() =>
    readLocal("tidal-descriptions", true)
  );
  const [siteName, setSiteName] = useState(() =>
    readLocal("tidal-name", "我的导航")
  );
  const [categories, setCategories] =
    useState<Category[]>(getInitialCategories);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] =
    useState<CategoryIconKey>("folder");
  const [editingCategoryId, setEditingCategoryId] = useState<CategoryId | null>(
    null
  );
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] =
    useState<CategoryId | null>(null);
  const [draggingCategoryId, setDraggingCategoryId] =
    useState<CategoryId | null>(null);
  const [newSite, setNewSite] = useState({
    name: "",
    url: "",
    description: "",
    category: "" as Site["category"],
    tags: [] as string[],
    iconUrl: "",
    iconScale: 100,
    iconBackground: "#ffffff",
  });
  const [analyzingSite, setAnalyzingSite] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource | null>(
    null
  );

  function changeSkin(nextSkin: "dark" | "light") {
    if (nextSkin === skin) return;

    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => {
        finished: Promise<void>;
      };
    };
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!transitionDocument.startViewTransition || prefersReducedMotion) {
      setSkin(nextSkin);
      return;
    }

    document.documentElement.dataset.themeTransition = nextSkin;
    const transition = transitionDocument.startViewTransition(() => {
      flushSync(() => setSkin(nextSkin));
    });
    void transition.finished.finally(() => {
      delete document.documentElement.dataset.themeTransition;
    });
  }

  useEffect(() => {
    window.localStorage.setItem("tidal-sites", JSON.stringify(sites));
  }, [sites]);

  useEffect(() => {
    let cancelled = false;
    setCloudStateReady(false);
    const syncCloud = async () => {
      try {
        const [sitesResponse, stateResponse] = await Promise.all([
          fetch("/api/sites"),
          fetch("/api/state"),
        ]);
        if (!sitesResponse.ok || !stateResponse.ok)
          throw new Error("D1 unavailable");
        const sitesPayload = (await sitesResponse.json()) as { sites?: Site[] };
        const statePayload = (await stateResponse.json()) as CloudStateResponse;
        const remoteSites = Array.isArray(sitesPayload.sites)
          ? sitesPayload.sites
          : [];
        let resolvedSites = remoteSites;
        if (cancelled) return;

        if (remoteSites.length) {
          setSites(normalizeSites(remoteSites));
        } else {
          const localSites = readLocal<Site[]>("tidal-sites", initialSites);
          resolvedSites = isAuthenticated ? localSites : [];
          if (!isAuthenticated) setSites([]);
          if (localSites.length && isAuthenticated) {
            const seedResponse = await fetch("/api/sites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sites: localSites }),
            });
            if (!seedResponse.ok) throw new Error("D1 seed failed");
          }
        }

        const remoteState = statePayload.state;
        if (remoteState) {
          if (
            Array.isArray(remoteState.categories) &&
            remoteState.categories.length >= 2
          )
            setCategories(remoteState.categories);
          if (Array.isArray(remoteState.favorites))
            setFavorites(remoteState.favorites);
          const preferences = remoteState.preferences || {};
          if (preferences.skin === "dark" || preferences.skin === "light")
            setSkin(preferences.skin);
          if (preferences.viewMode)
            setViewMode(normalizeViewMode(preferences.viewMode));
          if (
            preferences.sortMode === "curated" ||
            preferences.sortMode === "az"
          )
            setSortMode(preferences.sortMode);
          if (typeof preferences.showDescriptions === "boolean")
            setShowDescriptions(preferences.showDescriptions);
          if (typeof preferences.siteName === "string")
            setSiteName(preferences.siteName);
          if (typeof preferences.sidebarCollapsed === "boolean")
            setSidebarCollapsed(preferences.sidebarCollapsed);
          if (
            backgroundModes.includes(
              String(preferences.backgroundMode) as BackgroundMode
            )
          )
            setBackgroundMode(preferences.backgroundMode as BackgroundMode);
          setBackgroundAnimationSpeed(
            normalizeFlowAnimationSpeed(preferences.backgroundAnimationSpeed)
          );
          if (typeof preferences.customBackground === "string")
            setCustomBackground(preferences.customBackground);
          if (typeof preferences.backgroundImage === "string")
            setBackgroundImage(preferences.backgroundImage);
          if (typeof preferences.backgroundImageBlur === "number")
            setBackgroundImageBlur(preferences.backgroundImageBlur);
          if (typeof preferences.backgroundImageBrightness === "number")
            setBackgroundImageBrightness(preferences.backgroundImageBrightness);
          if (typeof preferences.backgroundImageContrast === "number")
            setBackgroundImageContrast(preferences.backgroundImageContrast);
          if (typeof preferences.backgroundImageAdaptive === "boolean")
            setBackgroundImageAdaptive(preferences.backgroundImageAdaptive);
        } else {
          const seedCategories = isAuthenticated
            ? [...categories]
            : defaultCategoryMeta.map(category => ({ ...category }));
          for (const site of resolvedSites) {
            if (
              !site.category ||
              seedCategories.some(category => category.id === site.category)
            )
              continue;
            seedCategories.push({
              id: site.category,
              label: site.categoryLabel || "未分类",
              iconKey: "folder",
              color: "mint",
            });
          }
          setCategories(seedCategories);
          if (isAuthenticated) {
            const seedStateResponse = await fetch("/api/state", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                categories: seedCategories,
                favorites,
                preferences: {
                  skin,
                  viewMode,
                  sortMode,
                  showDescriptions,
                  siteName,
                  sidebarCollapsed,
                  backgroundMode,
                  backgroundAnimationSpeed,
                  customBackground,
                  backgroundImage,
                  backgroundImageBlur,
                  backgroundImageBrightness,
                  backgroundImageContrast,
                  backgroundImageAdaptive,
                },
              }),
            });
            if (!seedStateResponse.ok) throw new Error("D1 state seed failed");
          }
        }

        if (!cancelled) {
          setCloudStateReady(isAuthenticated);
          setStorageMode("cloud");
          setLastSyncedLabel(
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      } catch {
        if (!cancelled) {
          setCloudStateReady(false);
          setStorageMode("local");
        }
      }
    };
    void syncCloud();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    window.localStorage.setItem("tidal-favorites", JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    const siteIds = new Set(sites.map(site => site.id));
    setFavorites(current => {
      const valid = current.filter(
        (id, index) => siteIds.has(id) && current.indexOf(id) === index
      );
      return valid.length === current.length ? current : valid;
    });
  }, [sites]);
  useEffect(() => {
    window.localStorage.setItem("tidal-skin", JSON.stringify(skin));
  }, [skin]);
  useEffect(() => {
    window.localStorage.setItem("tidal-view", JSON.stringify(viewMode));
  }, [viewMode]);
  useEffect(() => {
    window.localStorage.setItem("tidal-sort", JSON.stringify(sortMode));
  }, [sortMode]);
  useEffect(() => {
    window.localStorage.setItem(
      "tidal-descriptions",
      JSON.stringify(showDescriptions)
    );
  }, [showDescriptions]);
  useEffect(() => {
    window.localStorage.setItem("tidal-name", JSON.stringify(siteName));
  }, [siteName]);
  useEffect(() => {
    window.localStorage.setItem(
      "tidal-sidebar-collapsed",
      JSON.stringify(sidebarCollapsed)
    );
  }, [sidebarCollapsed]);
  useEffect(() => {
    window.localStorage.setItem(
      "tidal-background",
      JSON.stringify(backgroundMode)
    );
  }, [backgroundMode]);
  useEffect(() => {
    window.localStorage.setItem(
      "tidal-background-animation-speed",
      JSON.stringify(backgroundAnimationSpeed)
    );
  }, [backgroundAnimationSpeed]);
  useEffect(() => {
    const desktopFlowQuery = window.matchMedia(
      "(min-width: 1024px) and (hover: hover) and (pointer: fine)"
    );
    const updateFlowRenderer = () =>
      setDesktopFlowCanvas(
        desktopFlowQuery.matches && navigator.maxTouchPoints === 0
      );
    updateFlowRenderer();
    desktopFlowQuery.addEventListener("change", updateFlowRenderer);
    return () =>
      desktopFlowQuery.removeEventListener("change", updateFlowRenderer);
  }, []);
  useEffect(() => {
    window.localStorage.setItem(
      "tidal-custom-background",
      JSON.stringify(customBackground)
    );
  }, [customBackground]);
  useEffect(() => {
    window.localStorage.setItem(
      "tidal-background-image-blur",
      JSON.stringify(backgroundImageBlur)
    );
  }, [backgroundImageBlur]);
  useEffect(() => {
    window.localStorage.setItem(
      "tidal-background-image-brightness",
      JSON.stringify(backgroundImageBrightness)
    );
  }, [backgroundImageBrightness]);
  useEffect(() => {
    window.localStorage.setItem(
      "tidal-background-image-contrast",
      JSON.stringify(backgroundImageContrast)
    );
  }, [backgroundImageContrast]);
  useEffect(() => {
    window.localStorage.setItem(
      "tidal-background-image-adaptive",
      JSON.stringify(backgroundImageAdaptive)
    );
  }, [backgroundImageAdaptive]);
  useEffect(() => {
    window.localStorage.setItem("tidal-categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (!cloudStateReady || !isAuthenticated) return;
    const timer = window.setTimeout(() => {
      const syncState = async () => {
        try {
          const response = await fetch("/api/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categories,
              favorites,
              preferences: {
                skin,
                viewMode,
                sortMode,
                showDescriptions,
                siteName,
                sidebarCollapsed,
                backgroundMode,
                backgroundAnimationSpeed,
                customBackground,
                backgroundImage,
                backgroundImageBlur,
                backgroundImageBrightness,
                backgroundImageContrast,
                backgroundImageAdaptive,
              },
            }),
          });
          if (!response.ok) throw new Error("D1 state save failed");
          setStorageMode("cloud");
          setLastSyncedLabel(
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        } catch {
          setStorageMode("local");
        }
      };
      void syncState();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    cloudStateReady,
    isAuthenticated,
    categories,
    favorites,
    skin,
    viewMode,
    sortMode,
    showDescriptions,
    siteName,
    sidebarCollapsed,
    backgroundMode,
    backgroundAnimationSpeed,
    customBackground,
    backgroundImage,
    backgroundImageBlur,
    backgroundImageBrightness,
    backgroundImageContrast,
    backgroundImageAdaptive,
  ]);

  useEffect(() => {
    if (isAuthenticated) return;
    setEditMode(false);
    setSettingsOpen(false);
    setAddOpen(false);
    setEditingSite(null);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!addOpen) setNewIconSettingsOpen(false);
  }, [addOpen]);

  useEffect(() => {
    if (!editingSite) setEditIconSettingsOpen(false);
  }, [editingSite]);

  const openSettings = () => {
    if (!isAuthenticated) {
      onLogin();
      return;
    }
    if (settingsCloseTimerRef.current !== null) {
      window.clearTimeout(settingsCloseTimerRef.current);
      settingsCloseTimerRef.current = null;
    }
    setSettingsClosing(false);
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    if (settingsCloseTimerRef.current !== null) return;
    setSettingsClosing(true);
    settingsCloseTimerRef.current = window.setTimeout(() => {
      setSettingsOpen(false);
      setSettingsClosing(false);
      settingsCloseTimerRef.current = null;
    }, 320);
  };

  const closeAddModal = () => {
    if (!addOpen || addCloseTimerRef.current !== null) return;
    setAddClosing(true);
    addCloseTimerRef.current = window.setTimeout(() => {
      setAddOpen(false);
      setAddClosing(false);
      setAnalysisSource(null);
      addCloseTimerRef.current = null;
    }, 260);
  };

  const closeEditModal = () => {
    if (!editingSite || editCloseTimerRef.current !== null) return;
    setEditClosing(true);
    editCloseTimerRef.current = window.setTimeout(() => {
      setEditingSite(null);
      setEditClosing(false);
      editCloseTimerRef.current = null;
    }, 260);
  };

  const openMobileNav = () => {
    if (mobileNavCloseTimerRef.current !== null) {
      window.clearTimeout(mobileNavCloseTimerRef.current);
      mobileNavCloseTimerRef.current = null;
    }
    setMobileNavClosing(false);
    setMobileNavOpen(true);
  };

  const closeMobileNav = () => {
    if (!mobileNavOpen || mobileNavCloseTimerRef.current !== null) return;
    setMobileNavClosing(true);
    setMobileNavOpen(false);
    mobileNavCloseTimerRef.current = window.setTimeout(() => {
      setMobileNavClosing(false);
      mobileNavCloseTimerRef.current = null;
    }, 300);
  };

  useEffect(
    () => () => {
      if (settingsCloseTimerRef.current !== null) {
        window.clearTimeout(settingsCloseTimerRef.current);
      }
      if (addCloseTimerRef.current !== null)
        window.clearTimeout(addCloseTimerRef.current);
      if (editCloseTimerRef.current !== null)
        window.clearTimeout(editCloseTimerRef.current);
      if (mobileNavCloseTimerRef.current !== null)
        window.clearTimeout(mobileNavCloseTimerRef.current);
      if (editHintExitTimerRef.current !== null) {
        window.clearTimeout(editHintExitTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (activeCategory === displayedCategory) return;

    categoryTransitionTimersRef.current.forEach(timer =>
      window.clearTimeout(timer)
    );
    categoryTransitionTimersRef.current = [];
    setCategoryTransitionPhase("exiting");

    const exitTimer = window.setTimeout(() => {
      setDisplayedCategory(activeCategory);
      setCategoryTransitionPhase("entering");
      const enterTimer = window.setTimeout(() => {
        setCategoryTransitionPhase("settled");
        categoryTransitionTimersRef.current = [];
      }, 650);
      categoryTransitionTimersRef.current = [enterTimer];
    }, 180);
    categoryTransitionTimersRef.current = [exitTimer];

    return () => {
      categoryTransitionTimersRef.current.forEach(timer =>
        window.clearTimeout(timer)
      );
      categoryTransitionTimersRef.current = [];
    };
  }, [activeCategory]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        if (editIconSettingsOpen) {
          event.preventDefault();
          setEditIconSettingsOpen(false);
          return;
        }
        if (newIconSettingsOpen) {
          event.preventDefault();
          setNewIconSettingsOpen(false);
          return;
        }
        if (settingsOpen) closeSettings();
        closeAddModal();
        closeEditModal();
        closeMobileNav();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editIconSettingsOpen, newIconSettingsOpen, settingsOpen]);

  useEffect(() => {
    const overlayOpen =
      mobileNavOpen ||
      mobileNavClosing ||
      settingsOpen ||
      addOpen ||
      Boolean(editingSite);
    document.documentElement.classList.toggle("overlay-open", overlayOpen);
    return () => document.documentElement.classList.remove("overlay-open");
  }, [
    addOpen,
    editingSite,
    mobileNavClosing,
    mobileNavOpen,
    settingsOpen,
  ]);

  useEffect(() => {
    if (mobileNavOpen) {
      const animationFrame = window.requestAnimationFrame(() =>
        mobileNavCloseRef.current?.focus()
      );
      mobileNavWasOpenRef.current = true;
      return () => window.cancelAnimationFrame(animationFrame);
    }
    if (mobileNavWasOpenRef.current) mobileNavTriggerRef.current?.focus();
    mobileNavWasOpenRef.current = false;
  }, [mobileNavOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 781px)");
    const closeMobileNavOnDesktop = () => {
      if (desktopQuery.matches) setMobileNavOpen(false);
    };
    desktopQuery.addEventListener("change", closeMobileNavOnDesktop);
    return () =>
      desktopQuery.removeEventListener("change", closeMobileNavOnDesktop);
  }, []);

  useEffect(() => {
    const documentRoot = document.documentElement;
    const themeColorMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    const statusBarMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    );

    documentRoot.dataset.appSkin = skin;
    documentRoot.style.colorScheme = skin;
    themeColorMeta?.setAttribute(
      "content",
      skin === "dark" ? "#050506" : "#eef5ff"
    );
    statusBarMeta?.setAttribute(
      "content",
      skin === "dark" ? "black-translucent" : "default"
    );
  }, [skin]);
  const categoryMeta = useMemo(() => {
    const allCategory = categories.find(category => category.id === "all");

    return allCategory
      ? [allCategory, ...categories.filter(category => category.id !== "all")]
      : categories;
  }, [categories]);

  useLayoutEffect(() => {
    const nav = categoryNavRef.current;
    if (!nav) return;

    const updateScrollCue = () => {
      const canScrollFurther =
        nav.scrollHeight - nav.clientHeight - nav.scrollTop > 1;
      nav.classList.toggle("category-nav-can-scroll", canScrollFurther);
    };
    const resizeObserver = new ResizeObserver(updateScrollCue);
    resizeObserver.observe(nav);
    const animationFrame = window.requestAnimationFrame(updateScrollCue);
    nav.addEventListener("scroll", updateScrollCue, { passive: true });
    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(animationFrame);
      nav.removeEventListener("scroll", updateScrollCue);
    };
  }, [categoryMeta.length, sidebarCollapsed]);
  const categoryNames = useMemo(
    () =>
      Object.fromEntries(
        categories.map(category => [category.id, category.label])
      ) as Record<string, string>,
    [categories]
  );
  const contentCategories = useMemo(
    () => categories.filter(category => !category.system),
    [categories]
  );
  const defaultContentCategoryId = contentCategories[0]?.id || "";
  const existingTagSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return sites
      .flatMap(site =>
        normalizeSingleTags(site.tags).filter(tag => {
          const key = tag.toLocaleLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
      )
      .slice(0, 200);
  }, [sites]);

  const openAddSite = () => {
    if (!isAuthenticated) {
      onLogin();
      return;
    }
    if (!contentCategories.length) {
      openSettings();
      setAddingCategory(true);
      setEditingCategoryId(null);
      setPendingDeleteCategoryId(null);
      toast.message("请先创建一个分类，再添加入口。");
      return;
    }
    setNewSite(current =>
      contentCategories.some(category => category.id === current.category)
        ? current
        : { ...current, category: defaultContentCategoryId }
    );
    setAddOpen(true);
  };

  const filteredSites = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const next = sites.filter(site => {
      const inCategory =
        displayedCategory === "all" ||
        (displayedCategory === "favorites"
          ? favorites.includes(site.id)
          : site.category === displayedCategory);
      const inQuery =
        !normalized ||
        [
          site.name,
          site.description,
          categoryNames[site.category] || site.categoryLabel,
          ...site.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return inCategory && inQuery;
    });
    if (sortMode === "az")
      return [...next].sort((a, b) => a.name.localeCompare(b.name));
    return next;
  }, [displayedCategory, categoryNames, favorites, query, sites, sortMode]);
  const visibleSiteIds = useMemo(
    () => filteredSites.map(site => site.id),
    [filteredSites]
  );
  const selectedVisibleCount = visibleSiteIds.filter(id =>
    selectedSiteIds.has(id)
  ).length;
  const allVisibleSelected =
    visibleSiteIds.length > 0 && selectedVisibleCount === visibleSiteIds.length;

  useEffect(() => {
    if (!editMode) {
      setSelectedSiteIds(current => (current.size ? new Set() : current));
      return;
    }
    const visible = new Set(visibleSiteIds);
    setSelectedSiteIds(current => {
      const next = new Set(Array.from(current).filter(id => visible.has(id)));
      if (
        next.size === current.size &&
        Array.from(next).every(id => current.has(id))
      )
        return current;
      return next;
    });
  }, [editMode, visibleSiteIds]);

  useEffect(() => {
    if (
      bulkCategoryId &&
      contentCategories.some(category => category.id === bulkCategoryId)
    )
      return;
    setBulkCategoryId(defaultContentCategoryId);
  }, [bulkCategoryId, contentCategories, defaultContentCategoryId]);
  const settingsPreviewSite = filteredSites[0];

  useLayoutEffect(() => {
    if (!settingsOpen || !settingsPreviewSite) return;
    const element = Array.from(
      document.querySelectorAll<HTMLElement>("[data-site-id]")
    ).find(candidate => candidate.dataset.siteId === settingsPreviewSite.id);
    if (!element) return;

    const updatePreviewRect = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      setSettingsPreviewRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    };
    const resizeObserver = new ResizeObserver(updatePreviewRect);
    const scrollRoot = document.querySelector<HTMLElement>(".main-content");
    resizeObserver.observe(element);
    scrollRoot?.addEventListener("scroll", updatePreviewRect, {
      passive: true,
    });
    window.addEventListener("resize", updatePreviewRect);
    const animationFrame = window.requestAnimationFrame(updatePreviewRect);
    return () => {
      resizeObserver.disconnect();
      scrollRoot?.removeEventListener("scroll", updatePreviewRect);
      window.removeEventListener("resize", updatePreviewRect);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [settingsOpen, settingsPreviewSite?.id, viewMode]);

  const categoryCounts = useMemo(() => {
    return sites.reduce<Record<string, number>>((acc, site) => {
      acc[site.category] = (acc[site.category] || 0) + 1;
      return acc;
    }, {});
  }, [sites]);

  useLayoutEffect(() => {
    if (!shouldAnimateSiteLayoutRef.current) return;
    shouldAnimateSiteLayoutRef.current = false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nextAnimations = new Map<string, Animation>();
    document
      .querySelectorAll<HTMLElement>("[data-site-id]")
      .forEach(element => {
        const siteId = element.dataset.siteId;
        const previous = siteId
          ? siteLayoutPositionsRef.current.get(siteId)
          : undefined;
        if (!siteId || !previous) return;
        const current = element.getBoundingClientRect();
        const deltaX = previous.left - current.left;
        const deltaY = previous.top - current.top;
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

        const animation = element.animate(
          [
            {
              transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(.985)`,
            },
            {
              transform: `translate3d(${-deltaX * 0.025}px, ${-deltaY * 0.025}px, 0) scale(1.006)`,
              offset: 0.78,
            },
            { transform: "translate3d(0, 0, 0) scale(1)" },
          ],
          {
            duration: 430,
            easing: "cubic-bezier(.22, 1, .36, 1)",
          }
        );
        animation.onfinish = () =>
          siteLayoutAnimationsRef.current.delete(siteId);
        nextAnimations.set(siteId, animation);
      });
    siteLayoutAnimationsRef.current = nextAnimations;
  }, [sites]);

  const toggleFavorite = (
    event: ReactMouseEvent<HTMLButtonElement>,
    site: Site
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      onLogin();
      return;
    }
    const isFavorite = favorites.includes(site.id);
    setFavorites(current =>
      current.includes(site.id)
        ? current.filter(item => item !== site.id)
        : [...current, site.id]
    );
    toast.success(
      isFavorite ? `已取消收藏“${site.name}”。` : `已收藏“${site.name}”。`
    );
  };

  const withSortOrder = (nextSites: Site[]) =>
    nextSites.map((site, index) => ({ ...site, sortOrder: index }));

  const postSiteUpdates = async (nextSites: Site[]) => {
    for (let index = 0; index < nextSites.length; index += 50) {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: nextSites.slice(index, index + 50) }),
      });
      const isJson =
        response.headers.get("content-type")?.includes("application/json") ===
        true;
      const payload = isJson
        ? ((await response.json().catch(() => ({}))) as {
            success?: boolean;
            error?: string;
          })
        : {};
      if (!response.ok || payload.success !== true)
        throw new Error(payload.error || "云端保存失败。");
    }
    return true;
  };

  const persistSites = async (nextSites: Site[]) =>
    postSiteUpdates(withSortOrder(nextSites));

  const reloadCloudSites = async () => {
    const response = await fetch("/api/sites");
    if (!response.ok) throw new Error("无法重新读取云端入口。");
    const payload = (await response.json()) as { sites?: Site[] };
    const remoteSites = normalizeSites(
      Array.isArray(payload.sites) ? payload.sites : []
    );
    setSites(remoteSites);
    return remoteSites;
  };

  const exportBookmarks = () => {
    const payload: BookmarkExport = {
      format: "liquid-glass-nav",
      version: 1,
      exportedAt: new Date().toISOString(),
      categories,
      sites: withSortOrder(sites),
      favorites,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `tidal-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
    toast.success(`已导出 ${sites.length} 个书签。`);
  };

  const importBookmarks = async (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("导入文件不能超过 8MB。");
      return;
    }
    setImportingBookmarks(true);
    try {
      const groups = parseBookmarkFile(await file.text());
      if (!groups.some(group => group.bookmarks.length))
        throw new Error("没有识别到可导入的书签。");

      const nextCategories = [...categories];
      const categoryByLabel = new Map(
        nextCategories
          .filter(category => !category.system)
          .map(category => [
            category.label.trim().toLocaleLowerCase(),
            category,
          ])
      );
      const knownUrls = new Set(
        sites
          .map(site => normalizeBookmarkUrl(site.url).toLocaleLowerCase())
          .filter(Boolean)
      );
      const importedSites: Site[] = [];
      const importedFavoriteIds: string[] = [];
      let skipped = 0;
      let sequence = 0;

      groups.forEach(group => {
        const label = (group.label.trim() || "未分类").slice(0, 18);
        const labelKey = label.toLocaleLowerCase();
        let category = categoryByLabel.get(labelKey);
        if (!category) {
          category = {
            id: `category-import-${Date.now()}-${sequence++}`,
            label,
            iconKey: "folder",
            color: "blue",
          };
          const favoritesIndex = nextCategories.findIndex(
            item => item.id === "favorites"
          );
          nextCategories.splice(
            favoritesIndex >= 0 ? favoritesIndex : nextCategories.length,
            0,
            category
          );
          categoryByLabel.set(labelKey, category);
        }

        group.bookmarks.forEach(bookmark => {
          const url = normalizeBookmarkUrl(bookmark.url);
          const urlKey = url.toLocaleLowerCase();
          if (!url || knownUrls.has(urlKey)) {
            skipped += 1;
            return;
          }
          knownUrls.add(urlKey);
          let fallbackName = "未命名书签";
          try {
            fallbackName = new URL(url).hostname;
          } catch {
            /* URL was already validated */
          }
          const name = bookmark.name.trim() || fallbackName;
          const id = `imported-${Date.now()}-${sequence++}`;
          importedSites.push({
            id,
            name: name.slice(0, 80),
            url,
            description:
              bookmark.description?.trim().slice(0, 240) ||
              "从书签文件导入的入口。",
            category: category.id,
            categoryLabel: category.label,
            icon: (bookmark.icon?.trim() || name.slice(0, 2) || "书").slice(
              0,
              8
            ),
            iconUrl: bookmark.iconUrl?.trim() || faviconUrl(url),
            iconTone: "mint",
            tags: normalizeSingleTags(bookmark.tags).length
              ? normalizeSingleTags(bookmark.tags)
              : [category.label],
          });
          if (bookmark.favorite) importedFavoriteIds.push(id);
        });
      });

      if (!importedSites.length) {
        toast.message(
          skipped
            ? `没有新增书签，已跳过 ${skipped} 个重复或无效地址。`
            : "没有可导入的新书签。"
        );
        return;
      }

      const nextSites = withSortOrder([...sites, ...importedSites]);
      setCategories(nextCategories);
      setSites(nextSites);
      setFavorites(current =>
        Array.from(new Set([...current, ...importedFavoriteIds]))
      );
      setActiveCategory("all");

      let cloudSaved = false;
      try {
        await persistSites(nextSites);
        cloudSaved = true;
      } catch {
        // localStorage effects keep the full import available when cloud sync is unavailable.
      }
      setStorageMode(cloudSaved ? "cloud" : "local");
      toast.success(
        `已导入 ${importedSites.length} 个书签、${nextCategories.length - categories.length} 个分类${skipped ? `，跳过 ${skipped} 个重复或无效地址` : ""}。`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导入书签失败。");
    } finally {
      setImportingBookmarks(false);
    }
  };

  const deleteSite = async (site: Site) => {
    if (
      !editMode ||
      !window.confirm(`确认删除“${site.name}”？此操作无法撤销。`)
    )
      return;
    const nextSites = withSortOrder(sites.filter(item => item.id !== site.id));
    setSavingSite(true);
    try {
      const response = await fetch("/api/sites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: site.id }),
      });
      const isJson =
        response.headers.get("content-type")?.includes("application/json") ===
        true;
      const payload = isJson
        ? ((await response.json().catch(() => ({}))) as {
            success?: boolean;
            error?: string;
          })
        : {};
      const cloudSaved = response.ok && payload.success === true;
      if (!cloudSaved && !import.meta.env.DEV)
        throw new Error(payload.error || "D1 删除失败。");
      setSites(nextSites);
      setFavorites(current => current.filter(id => id !== site.id));
      setSelectedSiteIds(current => {
        if (!current.has(site.id)) return current;
        const next = new Set(current);
        next.delete(site.id);
        return next;
      });
      setEditingSite(current => (current?.id === site.id ? null : current));
      setStorageMode(cloudSaved ? "cloud" : "local");
      toast.success(
        cloudSaved
          ? `已删除“${site.name}”并同步。`
          : `已从当前设备删除“${site.name}”。`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除入口失败。");
    } finally {
      setSavingSite(false);
    }
  };

  const toggleSiteSelection = (siteId: string) => {
    if (!editMode) return;
    setSelectedSiteIds(current => {
      const next = new Set(current);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (!editMode || !visibleSiteIds.length) return;
    setSelectedSiteIds(current => {
      const next = new Set(current);
      if (allVisibleSelected) visibleSiteIds.forEach(id => next.delete(id));
      else visibleSiteIds.forEach(id => next.add(id));
      return next;
    });
  };

  const applyBulkUpdate = async (
    transform: (site: Site) => Site,
    successMessage: string
  ) => {
    if (!editMode || !selectedSiteIds.size) return;
    const selected = new Set(selectedSiteIds);
    const nextSites = sites.map(site =>
      selected.has(site.id) ? transform(site) : site
    );
    const changedSites = nextSites.filter(site => selected.has(site.id));
    setSavingSite(true);
    let cloudSaved = false;
    try {
      try {
        await postSiteUpdates(changedSites);
        cloudSaved = true;
      } catch (error) {
        if (!import.meta.env.DEV) {
          await reloadCloudSites().catch(() => undefined);
          throw error;
        }
      }
      setSites(nextSites);
      setSelectedSiteIds(new Set());
      setStorageMode(cloudSaved ? "cloud" : "local");
      toast.success(
        cloudSaved
          ? `${successMessage}并同步。`
          : `${successMessage}到当前设备。`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批量保存失败。");
    } finally {
      setSavingSite(false);
    }
  };

  const applyBulkCategory = () => {
    const category = contentCategories.find(item => item.id === bulkCategoryId);
    if (!category) {
      toast.error("请选择一个已有分类。");
      return;
    }
    void applyBulkUpdate(
      site => ({
        ...site,
        category: category.id,
        categoryLabel: category.label,
      }),
      `已将 ${selectedSiteIds.size} 个入口移至“${category.label}”`
    );
  };

  const applyBulkTag = () => {
    const nextTag = bulkTag.trim().slice(0, 24);
    const canonicalTag =
      existingTagSuggestions.find(
        tag => tag.toLocaleLowerCase() === nextTag.toLocaleLowerCase()
      ) || nextTag;
    void applyBulkUpdate(
      site => ({ ...site, tags: canonicalTag ? [canonicalTag] : [] }),
      canonicalTag
        ? `已为 ${selectedSiteIds.size} 个入口设置标签“${canonicalTag}”`
        : `已清除 ${selectedSiteIds.size} 个入口的标签`
    );
  };

  const deleteSelectedSites = async () => {
    const ids = Array.from(selectedSiteIds);
    if (
      !editMode ||
      !ids.length ||
      !window.confirm(`确认删除选中的 ${ids.length} 个入口？此操作无法撤销。`)
    )
      return;
    setSavingSite(true);
    let cloudSaved = false;
    try {
      try {
        for (let index = 0; index < ids.length; index += 500) {
          const response = await fetch("/api/sites", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: ids.slice(index, index + 500) }),
          });
          const payload = (await response.json().catch(() => ({}))) as {
            success?: boolean;
            error?: string;
          };
          if (!response.ok || payload.success !== true)
            throw new Error(payload.error || "D1 批量删除失败。");
        }
        cloudSaved = true;
      } catch (error) {
        if (!import.meta.env.DEV) {
          await reloadCloudSites().catch(() => undefined);
          throw error;
        }
      }
      const removed = new Set(ids);
      setSites(current =>
        withSortOrder(current.filter(site => !removed.has(site.id)))
      );
      setFavorites(current => current.filter(id => !removed.has(id)));
      setSelectedSiteIds(new Set());
      setStorageMode(cloudSaved ? "cloud" : "local");
      toast.success(
        cloudSaved
          ? `已删除 ${ids.length} 个入口并同步。`
          : `已从当前设备删除 ${ids.length} 个入口。`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批量删除失败。");
    } finally {
      setSavingSite(false);
    }
  };

  const moveSite = (sourceId: string, targetId: string) => {
    if (!editMode || sourceId === targetId) return;
    if (
      !sites.some(site => site.id === sourceId) ||
      !sites.some(site => site.id === targetId)
    )
      return;
    const previousPositions = new Map<string, DOMRect>();
    document
      .querySelectorAll<HTMLElement>("[data-site-id]")
      .forEach(element => {
        const siteId = element.dataset.siteId;
        if (siteId)
          previousPositions.set(siteId, element.getBoundingClientRect());
      });
    siteLayoutAnimationsRef.current.forEach(animation => animation.cancel());
    siteLayoutAnimationsRef.current.clear();
    siteLayoutPositionsRef.current = previousPositions;
    shouldAnimateSiteLayoutRef.current = true;
    setSites(current => {
      const sourceIndex = current.findIndex(site => site.id === sourceId);
      const targetIndex = current.findIndex(site => site.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex)
        return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return withSortOrder(next);
    });
    setOrderDirty(true);
  };

  const moveSiteByOffset = (siteId: string, offset: number) => {
    if (!editMode) return;
    const currentIndex = sites.findIndex(site => site.id === siteId);
    const target = sites[currentIndex + offset];
    if (target) moveSite(siteId, target.id);
  };

  const beginSiteDrag = (
    event: React.PointerEvent<HTMLElement>,
    siteId: string
  ) => {
    if (!editMode) return;
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingSiteIdRef.current = siteId;
    siteDragMovedRef.current = false;
    lastDragTargetRef.current = null;
    setDraggingSiteId(siteId);
  };

  const continueSiteDrag = (event: React.PointerEvent<HTMLElement>) => {
    const sourceId = draggingSiteIdRef.current;
    if (!sourceId) return;
    const targetElement = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-site-id]");
    const targetId = targetElement?.dataset.siteId;
    if (!targetId || targetId === sourceId) {
      lastDragTargetRef.current = null;
      return;
    }
    if (lastDragTargetRef.current === targetId) return;
    lastDragTargetRef.current = targetId;
    siteDragMovedRef.current = true;
    moveSite(sourceId, targetId);
  };

  const endSiteDrag = () => {
    draggingSiteIdRef.current = null;
    siteDragMovedRef.current = false;
    lastDragTargetRef.current = null;
    setDraggingSiteId(null);
  };

  const startEditMode = () => {
    if (!isAuthenticated) {
      onLogin();
      return;
    }
    if (editHintExitTimerRef.current !== null) {
      window.clearTimeout(editHintExitTimerRef.current);
      editHintExitTimerRef.current = null;
    }
    setEditHintExiting(false);
    setActiveCategory("all");
    setQuery("");
    setSortMode("curated");
    setSettingsOpen(false);
    setSelectedSiteIds(new Set());
    setBulkTag("");
    setEditMode(true);
    toast.message("编辑模式已开启：可多选入口，轻点卡片编辑，拖动调整顺序。");
  };

  const finishEditMode = async () => {
    const orderedSites = withSortOrder(sites);
    setSites(orderedSites);
    setEditMode(false);
    setSelectedSiteIds(new Set());
    setBulkTag("");
    setEditHintExiting(true);
    editHintExitTimerRef.current = window.setTimeout(() => {
      setEditHintExiting(false);
      editHintExitTimerRef.current = null;
    }, 280);
    setEditingSite(null);
    endSiteDrag();
    if (!orderDirty) return;
    try {
      await persistSites(orderedSites);
      setStorageMode("cloud");
      toast.success("入口顺序已保存。");
    } catch {
      setStorageMode("local");
      toast.success("入口顺序已保存到当前设备。");
    } finally {
      setOrderDirty(false);
    }
  };

  const openSiteEditor = (site: Site) => {
    if (!editMode) return;
    setEditingSite({ ...site, tags: [...site.tags] });
  };

  const finishSiteDrag = (site: Site) => {
    const shouldOpenEditor =
      editMode &&
      draggingSiteIdRef.current === site.id &&
      !siteDragMovedRef.current;
    endSiteDrag();
    if (shouldOpenEditor) openSiteEditor(site);
  };

  const selectCategory = (id: CategoryId) => {
    setActiveCategory(id);
    setMobileNavOpen(false);
  };

  const renameCategory = (id: CategoryId, label: string) => {
    setCategories(current =>
      current.map(category =>
        category.id === id ? { ...category, label } : category
      )
    );
  };

  const setCategoryIcon = (id: CategoryId, iconKey: CategoryIconKey) => {
    setCategories(current =>
      current.map(category =>
        category.id === id ? { ...category, iconKey } : category
      )
    );
  };

  const moveCategory = (sourceId: CategoryId, targetId: CategoryId) => {
    if (sourceId === targetId) return;
    setCategories(current => {
      const from = current.findIndex(category => category.id === sourceId);
      const to = current.findIndex(category => category.id === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const beginCategoryDrag = (
    event: React.PointerEvent<HTMLButtonElement>,
    categoryId: CategoryId
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingCategoryIdRef.current = categoryId;
    lastCategoryDragTargetRef.current = null;
    setDraggingCategoryId(categoryId);
  };

  const continueCategoryDrag = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    const sourceId = draggingCategoryIdRef.current;
    if (!sourceId) return;
    const targetElement = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-category-id]");
    const targetId = targetElement?.dataset.categoryId;
    if (
      !targetId ||
      targetId === sourceId ||
      lastCategoryDragTargetRef.current === targetId
    )
      return;
    lastCategoryDragTargetRef.current = targetId;
    moveCategory(sourceId, targetId);
  };

  const endCategoryDrag = () => {
    draggingCategoryIdRef.current = null;
    lastCategoryDragTargetRef.current = null;
    setDraggingCategoryId(null);
  };

  const beginNativeCategoryDrag = (
    event: ReactDragEvent<HTMLButtonElement>,
    categoryId: CategoryId
  ) => {
    draggingCategoryIdRef.current = categoryId;
    setDraggingCategoryId(categoryId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", categoryId);
  };

  const dropNativeCategory = (
    event: ReactDragEvent<HTMLDivElement>,
    targetId: CategoryId
  ) => {
    event.preventDefault();
    const sourceId =
      draggingCategoryIdRef.current || event.dataTransfer.getData("text/plain");
    if (sourceId) moveCategory(sourceId, targetId);
    endCategoryDrag();
  };

  const addCategory = () => {
    const label = newCategoryName.trim();
    if (!label) {
      toast.error("请先填写分类名称。");
      return;
    }
    const category: Category = {
      id: `category-${Date.now()}`,
      label,
      iconKey: newCategoryIcon,
      color: "blue",
    };
    setCategories(current => {
      const favoritesIndex = current.findIndex(item => item.id === "favorites");
      const next = [...current];
      next.splice(
        favoritesIndex >= 0 ? favoritesIndex : next.length,
        0,
        category
      );
      return next;
    });
    setNewCategoryName("");
    setNewCategoryIcon("folder");
    setAddingCategory(false);
    setEditingCategoryId(category.id);
    toast.success(`已新增“${label}”。`);
  };

  const deleteCategory = (id: CategoryId) => {
    const category = categories.find(item => item.id === id);
    if (!category || category.system) return;
    const fallback = contentCategories.find(item => item.id !== id);
    if (!fallback) {
      toast.error("至少需要保留一个普通分类。");
      return;
    }
    const affectedCount = categoryCounts[id] || 0;
    const nextSites = sites.map(site =>
      site.category === id
        ? { ...site, category: fallback.id, categoryLabel: fallback.label }
        : site
    );
    setCategories(current => current.filter(item => item.id !== id));
    setSites(nextSites);
    setNewSite(current =>
      current.category === id ? { ...current, category: fallback.id } : current
    );
    if (activeCategory === id) setActiveCategory(fallback.id);
    setEditingCategoryId(null);
    setPendingDeleteCategoryId(null);
    if (affectedCount) {
      void persistSites(nextSites).catch(() => setStorageMode("local"));
      toast.success(
        `已删除“${category.label}”，${affectedCount} 个入口已移至“${fallback.label}”。`
      );
    } else {
      toast.success(`已删除“${category.label}”。`);
    }
  };

  const submitNewSite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!analysisSource) {
      toast.error("请先让 AI 分析网站，再确认保存。");
      return;
    }
    if (!contentCategories.some(category => category.id === newSite.category)) {
      toast.error("请先创建并选择一个分类。");
      return;
    }
    if (!newSite.name.trim() || !newSite.url.trim()) {
      toast.error("先填入网站名称和地址。");
      return;
    }
    const parsedUrl = newSite.url.startsWith("http")
      ? newSite.url
      : `https://${newSite.url}`;
    const site: Site = {
      id: `${newSite.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: newSite.name.trim(),
      url: parsedUrl,
      description: newSite.description.trim() || "一个值得放在手边的入口。",
      category: newSite.category,
      categoryLabel:
        categoryNames[newSite.category]?.trim() ||
        categoryLabelMap[newSite.category] ||
        "未分类",
      icon: newSite.name.trim().slice(0, 2),
      iconUrl: newSite.iconUrl.trim() || faviconUrl(parsedUrl),
      iconScale: newSite.iconScale,
      iconBackground: newSite.iconBackground,
      iconTone: "mint",
      tags: normalizeSingleTags(newSite.tags).length
        ? normalizeSingleTags(newSite.tags)
        : [
            categoryNames[newSite.category]?.trim() ||
              categoryLabelMap[newSite.category] ||
              "未分类",
          ],
    };
    const nextSites = withSortOrder([
      site,
      ...sites.filter(item => item.id !== site.id),
    ]);
    setSavingSite(true);
    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: nextSites }),
      });
      const isJson =
        response.headers.get("content-type")?.includes("application/json") ===
        true;
      const payload = isJson
        ? ((await response.json().catch(() => ({}))) as {
            success?: boolean;
            error?: string;
          })
        : {};
      const cloudSaved = response.ok && payload.success === true;
      if (!cloudSaved && !import.meta.env.DEV) {
        throw new Error(payload.error || "D1 保存失败。");
      }
      setSites(nextSites);
      setNewSite({
        name: "",
        url: "",
        description: "",
        category: defaultContentCategoryId,
        tags: [],
        iconUrl: "",
        iconScale: 100,
        iconBackground: "#ffffff",
      });
      setAnalysisSource(null);
      setAddOpen(false);
      setActiveCategory("all");
      setStorageMode(cloudSaved ? "cloud" : "local");
      toast.success(
        cloudSaved
          ? "入口已保存到 Cloudflare D1。"
          : "本地开发模式：入口已保存到浏览器缓存。"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存入口失败。");
    } finally {
      setSavingSite(false);
    }
  };

  const analyzeNewSite = async () => {
    if (!newSite.url.trim()) {
      toast.error("请先填写网站地址。");
      return;
    }
    setAnalyzingSite(true);
    setAnalysisSource(null);
    try {
      const response = await fetch("/api/analyze-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSite.name,
          url: newSite.url,
          categories: contentCategories.map(category => ({
            id: category.id,
            label: category.label,
          })),
          existingTags: existingTagSuggestions,
          fallbackCategoryId: newSite.category || defaultContentCategoryId,
        }),
      });
      const result = (await response.json()) as {
        name?: string;
        description?: string;
        category?: Site["category"];
        tags?: string[];
        source?: AnalysisSource;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "网站分析失败。");
      setNewSite(current => ({
        ...current,
        name: result.name || current.name,
        description: result.description || "",
        category:
          result.category &&
          contentCategories.some(category => category.id === result.category)
            ? result.category
            : defaultContentCategoryId,
        tags: normalizeSingleTags(result.tags),
        iconUrl: current.iconUrl,
      }));
      setAnalysisSource(result.source || "ai");
      toast.success(
        result.source === "local"
          ? "本地智能分析完成，请确认结果。"
          : "AI 分析完成，请确认结果。"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "网站分析失败。");
    } finally {
      setAnalyzingSite(false);
    }
  };

  const analyzeEditedSite = async () => {
    if (!editingSite?.url.trim()) {
      toast.error("请先填写网站地址。");
      return;
    }
    setAnalyzingSite(true);
    try {
      const response = await fetch("/api/analyze-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingSite.name,
          url: editingSite.url,
          categories: contentCategories.map(category => ({
            id: category.id,
            label: category.label,
          })),
          existingTags: existingTagSuggestions,
          fallbackCategoryId: editingSite.category,
        }),
      });
      const result = (await response.json()) as {
        name?: string;
        description?: string;
        category?: Site["category"];
        tags?: string[];
        source?: AnalysisSource;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "网站分析失败。");
      setEditingSite(current => {
        if (!current) return current;
        return {
          ...current,
          name: result.name || current.name,
          description: result.description || current.description,
          category:
            result.category &&
            contentCategories.some(category => category.id === result.category)
              ? result.category
              : current.category,
          tags: Array.isArray(result.tags)
            ? normalizeSingleTags(result.tags)
            : normalizeSingleTags(current.tags),
          iconUrl: current.iconUrl || faviconUrl(current.url),
        };
      });
      toast.success(
        result.source === "local"
          ? "本地智能识别完成，请确认修改。"
          : "AI 识别完成，请确认修改。"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "网站分析失败。");
    } finally {
      setAnalyzingSite(false);
    }
  };

  const uploadBackgroundImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件。");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("背景图片不能超过 3MB。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      try {
        window.localStorage.setItem(
          "tidal-background-image",
          JSON.stringify(reader.result)
        );
        setBackgroundImage(reader.result);
        toast.success("背景图片已应用到当前设备。");
      } catch {
        toast.error("图片占用空间过大，请选择尺寸更小的图片。");
      }
    };
    reader.readAsDataURL(file);
  };

  const clearBackgroundImage = () => {
    window.localStorage.removeItem("tidal-background-image");
    setBackgroundImage("");
    toast.success("背景图片已清除。");
  };

  const submitEditedSite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editMode || !editingSite) return;
    if (!editingSite.name.trim() || !editingSite.url.trim()) {
      toast.error("网站名称和地址不能为空。");
      return;
    }
    const parsedUrl = editingSite.url.startsWith("http")
      ? editingSite.url
      : `https://${editingSite.url}`;
    const updatedSite: Site = {
      ...editingSite,
      name: editingSite.name.trim(),
      url: parsedUrl,
      description: editingSite.description.trim() || "一个值得放在手边的入口。",
      categoryLabel:
        categoryNames[editingSite.category]?.trim() ||
        categoryLabelMap[editingSite.category] ||
        "未分类",
      icon: editingSite.name.trim().slice(0, 2),
      iconUrl: editingSite.iconUrl?.trim() || faviconUrl(parsedUrl),
      tags: normalizeSingleTags(editingSite.tags),
    };
    setSavingSite(true);
    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: updatedSite }),
      });
      const isJson =
        response.headers.get("content-type")?.includes("application/json") ===
        true;
      const payload = isJson
        ? ((await response.json().catch(() => ({}))) as {
            success?: boolean;
            error?: string;
          })
        : {};
      const cloudSaved = response.ok && payload.success === true;
      if (!cloudSaved && !import.meta.env.DEV)
        throw new Error(payload.error || "D1 保存失败。");
      setSites(current =>
        current.map(site => (site.id === updatedSite.id ? updatedSite : site))
      );
      setEditingSite(null);
      setStorageMode(cloudSaved ? "cloud" : "local");
      toast.success(
        cloudSaved ? "入口修改已同步。" : "入口修改已保存到当前设备。"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "保存入口修改失败。"
      );
    } finally {
      setSavingSite(false);
    }
  };

  const activeLabel =
    categoryMeta.find(category => category.id === displayedCategory)?.label ||
    "全部入口";
  const today = new Date();
  const todayLabel = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")} 星期${["日", "一", "二", "三", "四", "五", "六"][today.getDay()]}`;

  const effectiveImageBrightness = backgroundImageAdaptive
    ? Math.max(
        30,
        Math.round(backgroundImageBrightness * (skin === "dark" ? 0.72 : 1.04))
      )
    : backgroundImageBrightness;
  const effectiveImageContrast = backgroundImageAdaptive
    ? Math.round(backgroundImageContrast * (skin === "dark" ? 1.08 : 0.94))
    : backgroundImageContrast;
  const activeFlowBackground = flowBackgroundPresets.find(
    preset => preset.id === backgroundMode
  );
  const activeFlowAnimationSpeed =
    flowAnimationSpeedOptions.find(
      option => option.id === backgroundAnimationSpeed
    ) || flowAnimationSpeedOptions[1];

  return (
    <div
      className={`app-shell skin-${skin} background-${backgroundMode} ${activeFlowBackground && !desktopFlowCanvas && !backgroundImage ? "flow-background-css" : ""} ${backgroundImage ? "has-background-image" : ""} ${backgroundImageAdaptive ? "background-image-adaptive" : ""} ${editMode ? "app-editing" : ""}`}
      style={
        {
          "--custom-background": customBackground,
          "--flow-animation-duration": `${activeFlowAnimationSpeed.cssDuration}s`,
        } as CSSProperties
      }
    >
      {activeFlowBackground && desktopFlowCanvas && !backgroundImage && (
        <FlowBackgroundCanvas
          colors={activeFlowBackground.colors}
          speed={activeFlowAnimationSpeed.canvasSpeed}
        />
      )}
      {backgroundImage && (
        <>
          <div
            className="workspace-background-image"
            style={
              {
                backgroundImage: `url(${backgroundImage})`,
                "--background-image-blur": `${backgroundImageBlur}px`,
                "--background-image-brightness": `${effectiveImageBrightness}%`,
                "--background-image-contrast": `${effectiveImageContrast}%`,
              } as CSSProperties
            }
            aria-hidden="true"
          />
          <div className="workspace-background-overlay" aria-hidden="true" />
        </>
      )}
      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />
      <div className="ambient-orb orb-three" />
      <datalist id="site-tag-suggestions">
        {existingTagSuggestions.map(tag => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      <button
        ref={mobileNavTriggerRef}
        type="button"
        className="mobile-nav-trigger glass-button"
        onClick={() => setMobileNavOpen(true)}
        aria-label="打开分类导航"
        aria-controls="mobile-category-sidebar"
        aria-expanded={mobileNavOpen}
      >
        <Menu size={18} />
        <span>目录</span>
      </button>

      <aside
        id="mobile-category-sidebar"
        className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
        aria-label="分类导航"
      >
        <div className="sidebar-topline" />
        <div className="brand-lockup">
          <LogoMark />
          <div>
            <div className="brand-wordmark">
              tidal<span>/</span>index
            </div>
            <p>你的私人书签</p>
          </div>
          <button
            className="sidebar-collapse-button"
            onClick={() => setSidebarCollapsed(current => !current)}
            aria-label={sidebarCollapsed ? "展开侧边栏" : "收缩侧边栏"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "展开侧边栏" : "收缩侧边栏"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
          <button
            ref={mobileNavCloseRef}
            type="button"
            className="mobile-close glass-button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="关闭分类导航"
          >
            <X size={17} />
          </button>
        </div>

        <div className="sidebar-section-label">收进你的工作台</div>
        <nav
          ref={categoryNavRef}
          className="category-nav"
          aria-label="网站分类"
        >
          {categoryMeta.map(category => {
            const isActive = category.id === activeCategory;
            const count =
              category.id === "all"
                ? sites.length
                : category.id === "favorites"
                  ? favorites.length
                  : categoryCounts[category.id] || 0;
            return (
              <button
                key={category.id}
                className={`category-link ${isActive ? "category-link-active" : ""}`}
                onClick={() => selectCategory(category.id)}
                aria-current={isActive ? "page" : undefined}
                title={sidebarCollapsed ? category.label : undefined}
              >
                <CategoryIcon category={category} />
                <span>{category.label}</span>
                <small>{count}</small>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sync-status">
            <span className="status-pulse" />{" "}
            {!isAuthenticated
              ? `公开只读 · ${sites.length} 个入口`
              : storageMode === "cloud"
                ? sites.length
                  ? `D1 已同步 · ${sites.length} 个入口`
                  : "D1 已连接 · 暂无入口"
                : storageMode === "connecting"
                  ? "正在连接 D1"
                  : "本地缓存模式"}
          </div>
          <p>
            {lastSyncedLabel
              ? `最近同步于 ${lastSyncedLabel}`
              : "等待首次云端同步"}
          </p>
        </div>
      </aside>

      {mobileNavOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="关闭导航"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>工作台</span>
            <ChevronRight size={14} />
            <strong>{activeLabel}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="topbar-button"
              onClick={() => changeSkin(skin === "dark" ? "light" : "dark")}
              aria-label="切换主题"
            >
              {skin === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              <span>{skin === "dark" ? "日间" : "夜间"}</span>
            </button>
            {isAuthenticated && (
              <>
                <button
                  className={`topbar-button edit-mode-button ${editMode ? "edit-mode-button-active" : ""}`}
                  onClick={editMode ? finishEditMode : startEditMode}
                  aria-pressed={editMode}
                >
                  {editMode ? <Check size={16} /> : <Pencil size={15} />}
                  <span>{editMode ? "完成" : "编辑"}</span>
                </button>
                <button
                  className="topbar-button topbar-settings"
                  onClick={openSettings}
                >
                  <Settings2 size={16} />
                  <span>设置</span>
                </button>
              </>
            )}
            {isAuthenticated ? (
              <button
                className="profile-chip profile-logout"
                onClick={onLogout}
                aria-label="退出登录"
                title="退出登录"
              >
                <span>Admin</span>
                <LogOut size={13} />
              </button>
            ) : (
              <button
                className="profile-chip profile-logout"
                onClick={onLogin}
                aria-label="登录管理"
                title="登录管理"
              >
                <span>登录</span>
                <LogIn size={13} />
              </button>
            )}
          </div>
        </header>

        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-line" /> PERSONAL INDEX / 01
            </div>
            <h1>
              让每天要用的网站，<em>随手可得。</em>
            </h1>
            <p>把分散的网站汇聚成一个有呼吸感的个人导航页。</p>
            <div className="hero-meta">
              <span>
                <span className="live-dot" /> {sites.length} 个入口已就绪
              </span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-visual-note">
              <span>THE QUIET WEB</span>
              <strong>{todayLabel}</strong>
            </div>
          </div>
        </section>

        <section className="search-panel glass-panel">
          <div className="search-icon-wrap">
            <Search size={20} strokeWidth={1.8} />
          </div>
          <input
            ref={searchRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索网站、分类或标签…"
            aria-label="搜索网站"
          />
          <div className="search-shortcut">
            <Keyboard size={13} />
            <span>/</span>
          </div>
          {query && (
            <button
              className="clear-search"
              onClick={() => setQuery("")}
              aria-label="清除搜索"
            >
              <X size={15} />
            </button>
          )}
        </section>

        <div className="workspace-lower-section">
          <section className="overview-row">
            <div className="overview-intro">
              <p className="section-kicker">CURATED SPACE</p>
              <div className="overview-title-row">
                <h2>{activeLabel}</h2>
                <span className="result-count">
                  {filteredSites.length.toString().padStart(2, "0")} sites
                </span>
              </div>
            </div>
            {isAuthenticated && (
              <button className="add-inline-button" onClick={openAddSite}>
                <Plus size={15} /> 添加入口
              </button>
            )}
          </section>

          <div
            className={`edit-mode-hint-slot ${editMode ? "edit-mode-hint-slot-visible" : ""}`}
            aria-hidden={!editMode}
          >
            {(editMode || editHintExiting) && (
              <div
                className={`edit-mode-hint ${editHintExiting ? "edit-mode-hint-exiting" : ""}`}
                aria-label="入口批量编辑工具栏"
              >
                <div className="edit-mode-summary">
                  <span className="edit-mode-pulse" />
                  <strong>编辑模式</strong>
                  <span>
                    已选 {selectedSiteIds.size} 个；点击卡片编辑，拖动调整顺序。
                  </span>
                </div>
                <div className="edit-mode-actions">
                  <button
                    type="button"
                    className="bulk-select-all"
                    onClick={toggleSelectAllVisible}
                    disabled={!visibleSiteIds.length || savingSite}
                    aria-pressed={
                      allVisibleSelected
                        ? true
                        : selectedVisibleCount > 0
                          ? "mixed"
                          : false
                    }
                  >
                    <Check size={14} />
                    {allVisibleSelected ? "取消全选" : "全选当前结果"}
                  </button>
                  <button
                    type="button"
                    className="edit-mode-finish"
                    onClick={finishEditMode}
                    disabled={editHintExiting || savingSite}
                  >
                    <Check size={14} /> 完成
                  </button>
                </div>
                {selectedSiteIds.size > 0 && (
                  <div className="bulk-edit-controls">
                    <div className="bulk-edit-group">
                      <label htmlFor="bulk-category">移动到分类</label>
                      <select
                        id="bulk-category"
                        value={bulkCategoryId}
                        onChange={event =>
                          setBulkCategoryId(event.target.value)
                        }
                        disabled={savingSite}
                      >
                        {contentCategories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={applyBulkCategory}
                        disabled={savingSite || !bulkCategoryId}
                      >
                        应用
                      </button>
                    </div>
                    <div className="bulk-edit-group bulk-tag-group">
                      <label htmlFor="bulk-tag">替换标签</label>
                      <input
                        id="bulk-tag"
                        list="site-tag-suggestions"
                        value={bulkTag}
                        onChange={event => setBulkTag(event.target.value)}
                        placeholder="留空可清除"
                        maxLength={24}
                        disabled={savingSite}
                      />
                      <button
                        type="button"
                        onClick={applyBulkTag}
                        disabled={savingSite}
                      >
                        {bulkTag.trim() ? "应用" : "清除"}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="bulk-delete-button"
                      onClick={() => void deleteSelectedSites()}
                      disabled={savingSite}
                    >
                      <Trash2 size={14} /> 删除所选
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mobile-category-scroll" aria-label="快速分类">
            {categoryMeta.map(category => (
              <button
                key={category.id}
                className={
                  activeCategory === category.id ? "mobile-category-active" : ""
                }
                onClick={() => selectCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <section
            key={displayedCategory}
            className={`site-grid grid-${viewMode} ${editMode ? "site-grid-editing" : ""} category-transition-${categoryTransitionPhase}`}
            aria-live="polite"
          >
            {filteredSites.map((site, index) => {
              const isFavorite = favorites.includes(site.id);
              const isSelected = selectedSiteIds.has(site.id);
              return (
                <article
                  key={site.id}
                  data-site-id={site.id}
                  style={
                    { "--site-index": Math.min(index, 6) } as CSSProperties
                  }
                  tabIndex={editMode ? 0 : undefined}
                  aria-grabbed={
                    editMode ? draggingSiteId === site.id : undefined
                  }
                  onPointerDown={event => beginSiteDrag(event, site.id)}
                  onPointerMove={continueSiteDrag}
                  onPointerUp={() => finishSiteDrag(site)}
                  onPointerCancel={endSiteDrag}
                  onKeyDown={event => {
                    if (!editMode) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openSiteEditor(site);
                    }
                    if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
                      event.preventDefault();
                      moveSiteByOffset(site.id, -1);
                    }
                    if (["ArrowRight", "ArrowDown"].includes(event.key)) {
                      event.preventDefault();
                      moveSiteByOffset(site.id, 1);
                    }
                  }}
                  className={`site-card glass-panel ${site.featured ? "site-card-featured" : ""} ${index === 1 ? "site-card-tall" : ""} ${editMode ? "site-card-editing" : ""} ${isSelected ? "site-card-selected" : ""} ${draggingSiteId === site.id ? "site-card-dragging" : ""}`}
                  title={viewMode === "mini" ? site.name : undefined}
                >
                  {!editMode && (
                    <a
                      className="site-card-link"
                      href={site.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`打开 ${site.name}`}
                    />
                  )}
                  {editMode && (
                    <button
                      type="button"
                      className="site-select-button"
                      onPointerDown={event => event.stopPropagation()}
                      onClick={event => {
                        event.stopPropagation();
                        toggleSiteSelection(site.id);
                      }}
                      aria-pressed={isSelected}
                      aria-label={`${isSelected ? "取消选择" : "选择"} ${site.name}`}
                      title={isSelected ? "取消选择" : "选择入口"}
                    >
                      {isSelected && <Check size={14} strokeWidth={2.8} />}
                    </button>
                  )}
                  <div className="site-card-topline">
                    <SiteIcon site={site} />
                    {isAuthenticated &&
                      (editMode ? (
                        <div className="site-edit-controls">
                          <button
                            type="button"
                            className="site-delete-button"
                            onClick={() => void deleteSite(site)}
                            disabled={savingSite}
                            aria-label={`删除 ${site.name}`}
                            title="删除入口"
                          >
                            <X size={13} strokeWidth={2.6} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={`favorite-button ${isFavorite ? "favorite-active" : ""}`}
                          onClick={event => toggleFavorite(event, site)}
                          aria-label={
                            isFavorite
                              ? `取消收藏 ${site.name}`
                              : `收藏 ${site.name}`
                          }
                          title={isFavorite ? "取消收藏" : "加入收藏"}
                        >
                          <Bookmark
                            size={16}
                            fill={isFavorite ? "currentColor" : "none"}
                          />
                        </button>
                      ))}
                  </div>
                  <div className="site-card-content">
                    <div className="site-card-heading">
                      <h3>{site.name}</h3>
                    </div>
                    {showDescriptions && <p>{site.description}</p>}
                  </div>
                  <div className="site-card-bottom">
                    <div className="tag-list">
                      {site.tags.slice(0, 1).map(tag => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <span className="category-label">
                      {categoryNames[site.category]?.trim() ||
                        site.categoryLabel}
                    </span>
                  </div>
                </article>
              );
            })}

            {filteredSites.length === 0 && (
              <div className="empty-state glass-panel">
                <div className="empty-art">
                  <Search size={26} />
                </div>
                <div>
                  <p className="section-kicker">NO SIGNAL / 00</p>
                  <h3>
                    {activeCategory === "favorites" && !query
                      ? "还没有收藏任何入口"
                      : !sites.length && !query
                        ? "还没有添加任何入口"
                        : "还没有找到这个入口"}
                  </h3>
                  <p>
                    {activeCategory === "favorites" && !query
                      ? "点击任意卡片右上角的书签，就能在这里快速找到它。"
                      : !sites.length && !query
                        ? "先创建一个分类，再添加你的第一个网站。"
                        : "换个关键词试试，或者把它添加到你的导航里。"}
                  </p>
                </div>
                {activeCategory === "favorites" && !query ? (
                  <button
                    className="primary-button"
                    onClick={() => selectCategory("all")}
                  >
                    <Grid2X2 size={15} /> 浏览全部入口
                  </button>
                ) : isAuthenticated ? (
                  <button className="primary-button" onClick={openAddSite}>
                    <Plus size={15} />{" "}
                    {contentCategories.length ? "添加网站" : "创建分类"}
                  </button>
                ) : (
                  <button className="primary-button" onClick={onLogin}>
                    <LogIn size={15} /> 登录后管理
                  </button>
                )}
              </div>
            )}
          </section>

          <div className="workspace-bottom">
            <section className="bottom-strip glass-panel">
              <div className="bottom-strip-copy">
                <p className="section-kicker">TIDAL NOTE / 04</p>
                <h3>收藏一站，少一次搜索。</h3>
              </div>
              <div className="bottom-strip-help">
                <CircleHelp size={16} />
                <span>快捷键 / 可随时聚焦搜索</span>
              </div>
            </section>
            <footer className="main-footer">
              <span>tidal，你的书签收藏夹。</span>
              <span>V{packageJson.version}</span>
            </footer>
          </div>
        </div>
      </main>

      {settingsOpen && isAuthenticated && (
        <div
          className={`drawer-layer ${settingsClosing ? "drawer-layer-closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="导航设置"
        >
          <button
            className="drawer-backdrop"
            onClick={closeSettings}
            aria-label="关闭设置"
          />
          {settingsPreviewSite && settingsPreviewRect && (
            <div
              className={`settings-site-preview-frame grid-${viewMode}`}
              style={{
                left: settingsPreviewRect.left,
                top: settingsPreviewRect.top,
                width: settingsPreviewRect.width,
                height: settingsPreviewRect.height,
              }}
              aria-hidden="true"
            >
              <article
                className={`site-card glass-panel ${settingsPreviewSite.featured ? "site-card-featured" : ""}`}
              >
                <div className="site-card-topline">
                  <SiteIcon site={settingsPreviewSite} />
                  <span
                    className={`favorite-button ${favorites.includes(settingsPreviewSite.id) ? "favorite-active" : ""}`}
                  >
                    <Bookmark
                      size={16}
                      fill={
                        favorites.includes(settingsPreviewSite.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </span>
                </div>
                <div className="site-card-content">
                  <div className="site-card-heading">
                    <h3>{settingsPreviewSite.name}</h3>
                  </div>
                  {showDescriptions && <p>{settingsPreviewSite.description}</p>}
                </div>
                <div className="site-card-bottom">
                  <div className="tag-list">
                    {settingsPreviewSite.tags.slice(0, 1).map(tag => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <span className="category-label">
                    {categoryNames[settingsPreviewSite.category]?.trim() ||
                      settingsPreviewSite.categoryLabel}
                  </span>
                </div>
              </article>
            </div>
          )}
          <aside className="settings-drawer">
            <div className="drawer-header">
              <div>
                <p className="section-kicker">PERSONALIZE / 02</p>
                <h2>导航设置</h2>
              </div>
              <button
                className="drawer-close"
                onClick={closeSettings}
                aria-label="关闭设置"
              >
                <X size={18} />
              </button>
            </div>
            <div className="drawer-content">
              <section className="setting-section">
                <label className="setting-label">工作台名称</label>
                <input
                  className="setting-input"
                  value={siteName}
                  onChange={event => setSiteName(event.target.value)}
                />
                <p className="setting-hint">
                  将同步到使用同一站点密码登录的设备。
                </p>
              </section>
              <section className="setting-section">
                <label className="setting-label">界面外观</label>
                <div className="segmented-control">
                  <button
                    className={skin === "dark" ? "segment-active" : ""}
                    onClick={() => changeSkin("dark")}
                  >
                    <Moon size={14} /> 深色石墨
                  </button>
                  <button
                    className={skin === "light" ? "segment-active" : ""}
                    onClick={() => changeSkin("light")}
                  >
                    <Sun size={14} /> 雾白模式
                  </button>
                </div>
              </section>
              <section className="setting-section background-setting">
                <div className="setting-row">
                  <div>
                    <label className="setting-label">页面背景</label>
                    <p className="setting-hint">
                      底色和背景图片也会同步到其他设备。
                    </p>
                  </div>
                  <span className="background-status">
                    {backgroundImage
                      ? "图片"
                      : backgroundMode === "custom"
                        ? "自定义"
                        : backgroundMode.startsWith("flow-")
                          ? "动态"
                          : "预设"}
                  </span>
                </div>
                <div className="background-options">
                  <button
                    type="button"
                    className={`background-option background-option-mist ${backgroundMode === "mist" ? "background-option-active" : ""}`}
                    onClick={() => setBackgroundMode("mist")}
                  >
                    <span />
                    <strong>雾白</strong>
                    <small>中性留白</small>
                  </button>
                  <button
                    type="button"
                    className={`background-option background-option-blue ${backgroundMode === "blue" ? "background-option-active" : ""}`}
                    onClick={() => setBackgroundMode("blue")}
                  >
                    <span />
                    <strong>静谧蓝</strong>
                    <small>系统蓝光</small>
                  </button>
                  <button
                    type="button"
                    className={`background-option background-option-midnight ${backgroundMode === "midnight" ? "background-option-active" : ""}`}
                    onClick={() => setBackgroundMode("midnight")}
                  >
                    <span />
                    <strong>午夜</strong>
                    <small>深石墨</small>
                  </button>
                  {flowBackgroundPresets.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`background-option background-option-flow ${backgroundMode === preset.id ? "background-option-active" : ""}`}
                      style={
                        { "--flow-preview": preset.preview } as CSSProperties
                      }
                      onClick={() => setBackgroundMode(preset.id)}
                    >
                      <span />
                      <strong>{preset.name}</strong>
                      <small>{preset.description}</small>
                    </button>
                  ))}
                </div>
                {backgroundMode.startsWith("flow-") && (
                  <div className="flow-speed-setting">
                    <div className="flow-speed-heading">
                      <div>
                        <strong>渐变动画速率</strong>
                        <small>
                          桌面使用流体效果，移动设备使用轻量渐变。
                        </small>
                      </div>
                      <span>{activeFlowAnimationSpeed.label}</span>
                    </div>
                    <div
                      className="flow-speed-options"
                      role="radiogroup"
                      aria-label="渐变动画速率"
                    >
                      {flowAnimationSpeedOptions.map(option => (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={backgroundAnimationSpeed === option.id}
                          className={
                            backgroundAnimationSpeed === option.id
                              ? "flow-speed-option flow-speed-option-active"
                              : "flow-speed-option"
                          }
                          onClick={() => setBackgroundAnimationSpeed(option.id)}
                        >
                          <strong>{option.label}</strong>
                          <small>{option.description}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="custom-background-row">
                  <div>
                    <strong>自定义颜色</strong>
                    <small>作为图片加载前的底色</small>
                  </div>
                  <label className="color-picker" title="选择自定义背景色">
                    <input
                      type="color"
                      value={customBackground}
                      onChange={event => {
                        setCustomBackground(event.target.value);
                        setBackgroundMode("custom");
                      }}
                      aria-label="选择自定义背景色"
                    />
                    <span style={{ background: customBackground }} />
                  </label>
                </div>
                <div className="background-image-editor">
                  <div className="background-image-heading">
                    <div>
                      <strong>背景图片</strong>
                      <small>支持 JPG、PNG、WebP，最大 3MB</small>
                    </div>
                    <div className="background-image-actions">
                      <label className="background-image-upload">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={event => {
                            uploadBackgroundImage(event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                        <ImagePlus size={13} />
                        <span>{backgroundImage ? "更换" : "选择图片"}</span>
                      </label>
                      {backgroundImage && (
                        <button
                          type="button"
                          className="background-image-remove"
                          onClick={clearBackgroundImage}
                          aria-label="清除背景图片"
                        >
                          <Trash2 size={13} /> 清除
                        </button>
                      )}
                    </div>
                  </div>
                  {backgroundImage && (
                    <>
                      <div className={`background-image-preview skin-${skin}`}>
                        <div
                          style={{
                            backgroundImage: `url(${backgroundImage})`,
                            filter: `blur(${Math.min(backgroundImageBlur, 8)}px) brightness(${effectiveImageBrightness}%) contrast(${effectiveImageContrast}%)`,
                          }}
                        />
                        <span>
                          {skin === "dark" ? "暗黑模式预览" : "明亮模式预览"}
                        </span>
                      </div>
                      <div className="background-filter-grid">
                        <BackgroundSlider
                          label="模糊"
                          value={backgroundImageBlur}
                          min={0}
                          max={24}
                          unit="px"
                          onChange={setBackgroundImageBlur}
                        />
                        <BackgroundSlider
                          label="亮度"
                          value={backgroundImageBrightness}
                          min={40}
                          max={140}
                          unit="%"
                          onChange={setBackgroundImageBrightness}
                        />
                        <BackgroundSlider
                          label="对比度"
                          value={backgroundImageContrast}
                          min={60}
                          max={160}
                          unit="%"
                          onChange={setBackgroundImageContrast}
                        />
                      </div>
                      <div className="background-adaptive-row">
                        <div>
                          <strong>自动适配界面模式</strong>
                          <small>暗黑模式压低亮度，明亮模式柔化对比度</small>
                        </div>
                        <button
                          type="button"
                          className={`toggle ${backgroundImageAdaptive ? "toggle-on" : ""}`}
                          onClick={() =>
                            setBackgroundImageAdaptive(current => !current)
                          }
                          aria-pressed={backgroundImageAdaptive}
                          aria-label="自动适配明暗模式"
                        >
                          <span />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>
              <section className="setting-section category-settings">
                <div className="setting-row category-settings-heading">
                  <div>
                    <label className="setting-label">分类管理</label>
                    <p className="setting-hint">
                      新增、编辑或拖动排序；默认分类不会显示在这里。
                    </p>
                  </div>
                  <button
                    type="button"
                    className="category-add-button"
                    onClick={() => {
                      setAddingCategory(current => !current);
                      setEditingCategoryId(null);
                      setPendingDeleteCategoryId(null);
                    }}
                  >
                    <Plus size={13} /> 新增
                  </button>
                </div>
                {addingCategory && (
                  <div className="category-editor category-create-editor">
                    <label>
                      分类名称
                      <input
                        autoFocus
                        value={newCategoryName}
                        onChange={event =>
                          setNewCategoryName(event.target.value)
                        }
                        onKeyDown={event => {
                          if (event.key === "Enter") addCategory();
                        }}
                        placeholder="例如：学习资料"
                        maxLength={18}
                      />
                    </label>
                    <div>
                      <span className="category-editor-label">分类图标</span>
                      <CategoryIconPicker
                        value={newCategoryIcon}
                        onChange={setNewCategoryIcon}
                      />
                    </div>
                    <div className="category-editor-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingCategory(false);
                          setNewCategoryName("");
                        }}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="category-editor-primary"
                        onClick={addCategory}
                      >
                        <Plus size={12} /> 创建分类
                      </button>
                    </div>
                  </div>
                )}
                <div className="category-settings-list">
                  {categoryMeta
                    .filter(category => !category.system)
                    .map(category => {
                      const count =
                        category.id === "all"
                          ? sites.length
                          : category.id === "favorites"
                            ? favorites.length
                            : categoryCounts[category.id] || 0;
                      const isEditing = editingCategoryId === category.id;
                      const isPendingDelete =
                        pendingDeleteCategoryId === category.id;
                      return (
                        <div
                          className={`category-setting-item ${draggingCategoryId === category.id ? "category-setting-item-dragging" : ""} ${isEditing ? "category-setting-item-editing" : ""}`}
                          key={category.id}
                          data-category-id={category.id}
                          onDragOver={event => event.preventDefault()}
                          onDrop={event =>
                            dropNativeCategory(event, category.id)
                          }
                        >
                          <CategoryIcon category={category} />
                          <div className="category-setting-copy">
                            <strong>{category.label}</strong>
                            <span>
                              {category.system ? "固定分类" : `${count} 个入口`}
                            </span>
                          </div>
                          <div className="category-setting-actions">
                            <button
                              type="button"
                              className="category-edit-button"
                              onClick={() => {
                                setEditingCategoryId(
                                  isEditing ? null : category.id
                                );
                                setAddingCategory(false);
                                setPendingDeleteCategoryId(null);
                              }}
                              aria-label={`编辑 ${category.label}`}
                              title="编辑分类"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="category-drag-handle"
                              draggable
                              onDragStart={event =>
                                beginNativeCategoryDrag(event, category.id)
                              }
                              onDragEnd={endCategoryDrag}
                              onPointerDown={event =>
                                beginCategoryDrag(event, category.id)
                              }
                              onPointerMove={continueCategoryDrag}
                              onPointerUp={endCategoryDrag}
                              onPointerCancel={endCategoryDrag}
                              aria-label={`拖动排序 ${category.label}`}
                              title="拖动排序"
                            >
                              <GripVertical size={15} />
                            </button>
                          </div>
                          {isEditing && (
                            <div className="category-editor">
                              <label>
                                分类名称
                                <input
                                  value={category.label}
                                  onChange={event =>
                                    renameCategory(
                                      category.id,
                                      event.target.value
                                    )
                                  }
                                  onBlur={() => {
                                    if (!category.label.trim())
                                      renameCategory(category.id, "未命名分类");
                                  }}
                                  maxLength={18}
                                />
                              </label>
                              <div>
                                <span className="category-editor-label">
                                  分类图标
                                </span>
                                <CategoryIconPicker
                                  value={category.iconKey}
                                  onChange={value =>
                                    setCategoryIcon(category.id, value)
                                  }
                                />
                              </div>
                              <div className="category-editor-actions">
                                {!category.system && !isPendingDelete && (
                                  <button
                                    type="button"
                                    className="category-delete-button"
                                    onClick={() =>
                                      setPendingDeleteCategoryId(category.id)
                                    }
                                  >
                                    删除分类
                                  </button>
                                )}
                                {isPendingDelete && (
                                  <div className="category-delete-confirm">
                                    <span>
                                      {count
                                        ? `${count} 个入口将移至其他分类。`
                                        : "确认删除这个分类？"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPendingDeleteCategoryId(null)
                                      }
                                    >
                                      取消
                                    </button>
                                    <button
                                      type="button"
                                      className="category-delete-confirm-button"
                                      onClick={() =>
                                        deleteCategory(category.id)
                                      }
                                    >
                                      确认删除
                                    </button>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  className="category-editor-primary"
                                  onClick={() => setEditingCategoryId(null)}
                                >
                                  <Check size={12} /> 完成
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </section>
              <section className="setting-section bookmark-transfer-settings">
                <div className="setting-row">
                  <div>
                    <label className="setting-label">书签数据</label>
                    <p className="setting-hint">
                      兼容本站和 WeTab 的 JSON
                      文件；导入时保留现有内容并按网址去重。
                    </p>
                  </div>
                  <span className="bookmark-transfer-count">
                    {sites.length} 个
                  </span>
                </div>
                <input
                  ref={bookmarkImportRef}
                  className="bookmark-import-input"
                  type="file"
                  accept=".json,application/json"
                  onChange={event => {
                    void importBookmarks(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <div className="bookmark-transfer-actions">
                  <button type="button" onClick={exportBookmarks}>
                    <Download size={14} /> 导出书签
                  </button>
                  <button
                    type="button"
                    onClick={() => bookmarkImportRef.current?.click()}
                    disabled={importingBookmarks}
                  >
                    <Upload size={14} />{" "}
                    {importingBookmarks ? "导入中…" : "导入书签"}
                  </button>
                </div>
              </section>
              <section className="setting-section">
                <label className="setting-label">入口模块大小</label>
                <div
                  className={`segmented-control size-segmented-control size-segmented-${viewMode}`}
                  role="group"
                  aria-label="入口模块大小"
                >
                  <button
                    type="button"
                    className={viewMode === "large" ? "segment-active" : ""}
                    aria-pressed={viewMode === "large"}
                    aria-label="Large"
                    onClick={() => setViewMode("large")}
                  >
                    <Grid2X2 size={14} />
                    <span>Large</span>
                  </button>
                  <button
                    type="button"
                    className={viewMode === "medium" ? "segment-active" : ""}
                    aria-pressed={viewMode === "medium"}
                    aria-label="Medium"
                    onClick={() => setViewMode("medium")}
                  >
                    <LayoutList size={14} />
                    <span>Medium</span>
                  </button>
                  <button
                    type="button"
                    className={viewMode === "small" ? "segment-active" : ""}
                    aria-pressed={viewMode === "small"}
                    aria-label="Small"
                    onClick={() => setViewMode("small")}
                  >
                    <Grid3X3 size={14} />
                    <span>Small</span>
                  </button>
                  <button
                    type="button"
                    className={viewMode === "mini" ? "segment-active" : ""}
                    aria-pressed={viewMode === "mini"}
                    aria-label="Mini"
                    onClick={() => setViewMode("mini")}
                  >
                    <Grid3X3 size={13} />
                    <span>Mini</span>
                  </button>
                </div>
                <p className="setting-hint">
                  Large、Medium、Small 逐级压缩完整信息；Mini 仅显示图标和名称。
                </p>
              </section>
              <section className="setting-section">
                <label className="setting-label">入口排序</label>
                <div className="select-wrap">
                  <select
                    value={sortMode}
                    onChange={event =>
                      setSortMode(event.target.value as SortMode)
                    }
                  >
                    <option value="curated">编辑精选顺序</option>
                    <option value="az">按名称排列</option>
                  </select>
                  <ChevronRight size={15} />
                </div>
              </section>
              <section className="setting-section">
                <div className="setting-row">
                  <div>
                    <label className="setting-label">显示描述</label>
                    <p className="setting-hint">在网站卡片下显示一句简介。</p>
                  </div>
                  <button
                    className={`toggle ${showDescriptions ? "toggle-on" : ""}`}
                    onClick={() => setShowDescriptions(!showDescriptions)}
                    aria-label="切换网站描述"
                  >
                    <span />
                  </button>
                </div>
              </section>
              <section className="setting-preview">
                <div className="preview-image" />
                <div>
                  <p className="section-kicker">MATERIAL NOTE</p>
                  <h3>玻璃的透明度，给内容留出呼吸。</h3>
                  <p>分类、收藏和界面偏好会通过 D1 跨设备同步。</p>
                </div>
              </section>
            </div>
            <div className="drawer-footer">
              <button
                className="secondary-button"
                onClick={() => {
                  setFavorites([]);
                  toast.success("收藏已清空");
                }}
              >
                清空收藏
              </button>
              <button className="primary-button" onClick={closeSettings}>
                <Check size={15} /> 保存并返回
              </button>
            </div>
          </aside>
        </div>
      )}

      {editingSite && editMode && isAuthenticated && (
        <div
          className="modal-layer"
          role="dialog"
          aria-modal="true"
          aria-label={`编辑 ${editingSite.name}`}
        >
          <button
            className="drawer-backdrop"
            onClick={() => setEditingSite(null)}
            aria-label="关闭编辑窗口"
          />
          <form
            className="add-modal edit-site-modal glass-panel"
            onSubmit={event => {
              if (editIconSettingsOpen) {
                event.preventDefault();
                setEditIconSettingsOpen(false);
                return;
              }
              void submitEditedSite(event);
            }}
          >
            <div className="drawer-header">
              <div>
                {editIconSettingsOpen && (
                  <button
                    type="button"
                    className="site-icon-settings-back"
                    onClick={() => setEditIconSettingsOpen(false)}
                  >
                    <ChevronLeft size={15} /> 编辑入口
                  </button>
                )}
                <p className="section-kicker">
                  {editIconSettingsOpen ? "ICON SETTINGS" : "EDIT ENTRY / 05"}
                </p>
                <h2>{editIconSettingsOpen ? "设置网站图标" : "编辑入口"}</h2>
                <p className="ai-modal-intro">
                  {editIconSettingsOpen
                    ? "选择网站自动发现的图标，或上传自己的图片。"
                    : "修改名称、链接和分类；关闭编辑模式后仍可正常打开网站。"}
                </p>
              </div>
              <button
                type="button"
                className="drawer-close"
                onClick={() => setEditingSite(null)}
                aria-label="关闭编辑窗口"
              >
                <X size={18} />
              </button>
            </div>
            <div
              className={`form-fields ${editIconSettingsOpen ? "icon-settings-form-page" : ""}`}
            >
              {editIconSettingsOpen ? (
                <SiteIconSettings
                  name={editingSite.name}
                  url={editingSite.url}
                  iconUrl={editingSite.iconUrl || ""}
                  scale={editingSite.iconScale ?? 100}
                  background={editingSite.iconBackground || "#ffffff"}
                  onChange={value =>
                    setEditingSite({ ...editingSite, ...value })
                  }
                />
              ) : (
                <>
                  <label>
                    网站名称
                    <input
                      autoFocus
                      value={editingSite.name}
                      onChange={event =>
                        setEditingSite({
                          ...editingSite,
                          name: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    网站地址
                    <input
                      value={editingSite.url}
                      onChange={event =>
                        setEditingSite({
                          ...editingSite,
                          url: event.target.value,
                        })
                      }
                      placeholder="https://example.com"
                    />
                  </label>
                  <div className="ai-analyze-card edit-ai-analyze-card">
                    <span className="ai-analyze-icon">
                      <Sparkles size={18} />
                    </span>
                    <div>
                      <strong>AI 识别网站信息</strong>
                      <p>根据当前网址更新名称、简介、分类和标签。</p>
                    </div>
                    <button
                      type="button"
                      className="ai-analyze-button"
                      onClick={analyzeEditedSite}
                      disabled={analyzingSite}
                    >
                      {analyzingSite ? "识别中…" : "AI 识别"}
                    </button>
                  </div>
                  <label>
                    一句话简介
                    <textarea
                      value={editingSite.description}
                      onChange={event =>
                        setEditingSite({
                          ...editingSite,
                          description: event.target.value,
                        })
                      }
                      rows={3}
                    />
                  </label>
                  <label>
                    分类
                    <select
                      value={editingSite.category}
                      onChange={event =>
                        setEditingSite({
                          ...editingSite,
                          category: event.target.value,
                        })
                      }
                    >
                      {contentCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    网站标签
                    <span className="optional">只保留一个最贴切的标签</span>
                    <input
                      list="site-tag-suggestions"
                      value={editingSite.tags[0] || ""}
                      onChange={event =>
                        setEditingSite({
                          ...editingSite,
                          tags: event.target.value ? [event.target.value] : [],
                        })
                      }
                    />
                  </label>
                  <OpenSiteIconSettingsButton
                    onClick={() => setEditIconSettingsOpen(true)}
                  />
                </>
              )}
            </div>
            <div className="modal-footer">
              {editIconSettingsOpen ? (
                <>
                  <span>设置会随入口表单一起保存</span>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setEditIconSettingsOpen(false)}
                  >
                    <Check size={15} /> 完成
                  </button>
                </>
              ) : (
                <>
                  <span>
                    <Pencil size={14} /> 仅在编辑模式中可修改
                  </span>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setEditingSite(null)}
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={savingSite}
                    >
                      <Check size={15} />{" "}
                      {savingSite ? "正在保存…" : "保存修改"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </form>
        </div>
      )}

      {addOpen && isAuthenticated && (
        <div
          className="modal-layer"
          role="dialog"
          aria-modal="true"
          aria-label="添加网站"
        >
          <button
            className="drawer-backdrop"
            onClick={() => {
              setAddOpen(false);
              setAnalysisSource(null);
            }}
            aria-label="关闭添加窗口"
          />
          <form
            className="add-modal glass-panel"
            onSubmit={event => {
              if (newIconSettingsOpen) {
                event.preventDefault();
                setNewIconSettingsOpen(false);
                return;
              }
              void submitNewSite(event);
            }}
          >
            <div className="drawer-header">
              <div>
                {newIconSettingsOpen && (
                  <button
                    type="button"
                    className="site-icon-settings-back"
                    onClick={() => setNewIconSettingsOpen(false)}
                  >
                    <ChevronLeft size={15} /> 返回网站信息
                  </button>
                )}
                <p className="section-kicker">
                  {newIconSettingsOpen ? "ICON SETTINGS" : "AI ENTRY / 03"}
                </p>
                <h2>
                  {newIconSettingsOpen
                    ? "设置网站图标"
                    : analysisSource
                      ? "确认网站信息"
                      : "AI 添加入口"}
                </h2>
                <p className="ai-modal-intro">
                  {newIconSettingsOpen
                    ? "选择网站自动发现的图标，或上传自己的图片。"
                    : "填写网址，让 AI 自动生成简介、分类和标签。"}
                </p>
              </div>
              <button
                type="button"
                className="drawer-close"
                onClick={() => {
                  setAddOpen(false);
                  setAnalysisSource(null);
                }}
                aria-label="关闭添加窗口"
              >
                <X size={18} />
              </button>
            </div>
            <div
              className={`form-fields ${newIconSettingsOpen ? "icon-settings-form-page" : ""}`}
            >
              {newIconSettingsOpen ? (
                <SiteIconSettings
                  name={newSite.name}
                  url={newSite.url}
                  iconUrl={newSite.iconUrl}
                  scale={newSite.iconScale}
                  background={newSite.iconBackground}
                  autoDiscover
                  onChange={value =>
                    setNewSite(current => ({ ...current, ...value }))
                  }
                />
              ) : (
                <>
                  <label>
                    网站地址
                    <input
                      autoFocus
                      value={newSite.url}
                      onChange={event => {
                        setNewSite(current => ({
                          ...current,
                          url: event.target.value,
                          iconUrl: current.iconUrl.startsWith("data:")
                            ? current.iconUrl
                            : "",
                        }));
                        setAnalysisSource(null);
                      }}
                      placeholder="https://example.com"
                    />
                  </label>
                  <label>
                    网站名称<span className="optional">可选，AI 可识别</span>
                    <input
                      value={newSite.name}
                      onChange={event =>
                        setNewSite({ ...newSite, name: event.target.value })
                      }
                      placeholder="例如：Arc"
                    />
                  </label>
                  {!analysisSource ? (
                    <div className="ai-analyze-card">
                      <span className="ai-analyze-icon">
                        <Sparkles size={18} />
                      </span>
                      <div>
                        <strong>AI 自动整理</strong>
                        <p>
                          分析网站用途，复用现有分类并推荐一个最贴切的标签。
                        </p>
                      </div>
                      <button
                        type="button"
                        className="ai-analyze-button"
                        onClick={analyzeNewSite}
                        disabled={analyzingSite}
                      >
                        {analyzingSite ? "分析中…" : "开始分析"}
                      </button>
                    </div>
                  ) : (
                    <div className="ai-review-panel">
                      <div className="ai-review-status">
                        <span>
                          <Check size={14} />{" "}
                          {analysisSource === "ai"
                            ? "AI 分析完成"
                            : "本地智能分析完成"}
                        </span>
                        <button type="button" onClick={analyzeNewSite}>
                          重新分析
                        </button>
                      </div>
                      <label>
                        一句话简介
                        <textarea
                          value={newSite.description}
                          onChange={event =>
                            setNewSite({
                              ...newSite,
                              description: event.target.value,
                            })
                          }
                          rows={3}
                        />
                      </label>
                      <label>
                        推荐分类
                        <select
                          value={newSite.category}
                          onChange={event =>
                            setNewSite({
                              ...newSite,
                              category: event.target.value,
                            })
                          }
                        >
                          {contentCategories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        网站标签
                        <span className="optional">
                          优先选择现有标签，也可修改
                        </span>
                        <input
                          list="site-tag-suggestions"
                          value={newSite.tags[0] || ""}
                          onChange={event =>
                            setNewSite({
                              ...newSite,
                              tags: event.target.value
                                ? [event.target.value]
                                : [],
                            })
                          }
                          placeholder="例如：效率"
                        />
                      </label>
                      <OpenSiteIconSettingsButton
                        onClick={() => setNewIconSettingsOpen(true)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              {newIconSettingsOpen ? (
                <>
                  <span>设置会随入口表单一起保存</span>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setNewIconSettingsOpen(false)}
                  >
                    <Check size={15} /> 完成
                  </button>
                </>
              ) : (
                <>
                  <span>
                    <Tags size={14} />{" "}
                    {analysisSource ? "请确认或修改后保存" : "分析不会自动保存"}
                  </span>
                  {analysisSource && (
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={savingSite}
                    >
                      <Check size={15} />{" "}
                      {savingSite ? "正在保存…" : "确认并保存"}
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
