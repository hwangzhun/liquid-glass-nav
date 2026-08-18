/* 潮汐玻璃提醒：这里维持“固定目录脊柱 + 开放内容海域”的结构；透明材质必须服务于快速检索，薄荷色只承担选中与反馈信号。 */
import {
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  Folder,
  Grid2X2,
  GripVertical,
  ImagePlus,
  Keyboard,
  LayoutList,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Pencil,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { CSSProperties, DragEvent as ReactDragEvent, FormEvent, MouseEvent as ReactMouseEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import packageJson from "../../../package.json";
import { toast } from "sonner";

type CategoryId = string;
type SortMode = "curated" | "az";
type ViewMode = "comfortable" | "dense";
type BackgroundMode = "mist" | "blue" | "midnight" | "custom";
type AnalysisSource = "ai" | "local";

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
  iconTone: string;
  tags: string[];
  featured?: boolean;
  accent?: string;
  sortOrder?: number;
};

const initialSites: Site[] = [
  {
    id: "figma",
    name: "Figma",
    url: "https://www.figma.com",
    description: "把想法快速变成可协作的界面与原型。",
    category: "design",
    categoryLabel: "设计工作室",
    icon: "Fi",
    iconTone: "peach",
    tags: ["协作", "原型"],
    featured: true,
    accent: "mint",
  },
  {
    id: "github",
    name: "GitHub",
    url: "https://github.com",
    description: "代码、项目与团队协作的开放档案。",
    category: "dev",
    categoryLabel: "开发工具",
    icon: "GH",
    iconTone: "ink",
    tags: ["代码", "开源"],
    accent: "blue",
  },
  {
    id: "notion",
    name: "Notion",
    url: "https://www.notion.so",
    description: "让笔记、计划和知识在一个空间里生长。",
    category: "productivity",
    categoryLabel: "效率工具",
    icon: "N",
    iconTone: "paper",
    tags: ["笔记", "数据库"],
  },
  {
    id: "linear",
    name: "Linear",
    url: "https://linear.app",
    description: "把复杂项目拆成更清晰的下一步。",
    category: "productivity",
    categoryLabel: "效率工具",
    icon: "L",
    iconTone: "violet",
    tags: ["项目", "团队"],
    accent: "violet",
  },
  {
    id: "dribbble",
    name: "Dribbble",
    url: "https://dribbble.com",
    description: "每天收集一点视觉灵感，留给下一个好点子。",
    category: "inspiration",
    categoryLabel: "灵感收藏",
    icon: "Dr",
    iconTone: "rose",
    tags: ["灵感", "作品"],
  },
  {
    id: "vercel",
    name: "Vercel",
    url: "https://vercel.com",
    description: "让前端项目从本地走向更快的发布体验。",
    category: "dev",
    categoryLabel: "开发工具",
    icon: "▲",
    iconTone: "snow",
    tags: ["部署", "前端"],
  },
  {
    id: "are.na",
    name: "Are.na",
    url: "https://www.are.na",
    description: "把松散的灵感连成一条有趣的线。",
    category: "inspiration",
    categoryLabel: "灵感收藏",
    icon: "A",
    iconTone: "sand",
    tags: ["研究", "收藏"],
  },
  {
    id: "raycast",
    name: "Raycast",
    url: "https://www.raycast.com",
    description: "用一次快捷键，把常用操作拉到手边。",
    category: "productivity",
    categoryLabel: "效率工具",
    icon: "R",
    iconTone: "glow",
    tags: ["快捷键", "效率"],
  },
  {
    id: "github-copilot",
    name: "Copilot",
    url: "https://github.com/features/copilot",
    description: "在编写代码时，让思路多一个安静的陪伴。",
    category: "dev",
    categoryLabel: "开发工具",
    icon: "Co",
    iconTone: "sage",
    tags: ["AI", "代码"],
  },
];

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
  { id: "all", label: "全部入口", iconKey: "grid", color: "mint", system: true },
  { id: "design", label: "设计工作室", iconKey: "sparkles", color: "peach" },
  { id: "dev", label: "开发工具", iconKey: "sliders", color: "blue" },
  { id: "productivity", label: "效率工具", iconKey: "list", color: "violet" },
  { id: "inspiration", label: "灵感收藏", iconKey: "compass", color: "orange" },
  { id: "favorites", label: "我的收藏", iconKey: "bookmark", color: "rose", system: true },
];

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

function getInitialCategories(): Category[] {
  const stored = readLocal<Category[]>("tidal-categories", []);
  if (Array.isArray(stored) && stored.length >= 3) {
    const valid = stored.filter((category, index) => (
      category &&
      typeof category.id === "string" &&
      typeof category.label === "string" &&
      category.id !== "" &&
      stored.findIndex((item) => item.id === category.id) === index
    )).map((category) => ({
      ...category,
      iconKey: category.iconKey in categoryIconMap ? category.iconKey : "folder",
      system: category.id === "all" || category.id === "favorites",
    }));
    if (valid.some((category) => category.id === "all") && valid.some((category) => category.id === "favorites")) return valid;
  }

  const legacyNames = readLocal<Record<string, string>>("tidal-category-names", {});
  const legacyOrder = readLocal<string[]>("tidal-category-order", defaultCategoryMeta.map((category) => category.id));
  const byId = new Map(defaultCategoryMeta.map((category) => [category.id, category]));
  const ordered = legacyOrder.flatMap((id) => {
    const category = byId.get(id);
    return category ? [{ ...category, label: legacyNames[id]?.trim() || category.label }] : [];
  });
  defaultCategoryMeta.forEach((category) => {
    if (!ordered.some((item) => item.id === category.id)) ordered.push({ ...category, label: legacyNames[category.id]?.trim() || category.label });
  });
  return ordered;
}

function getWorkspaceId() {
  const key = "tidal-workspace-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const generated = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `workspace-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

function LogoMark() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <span className="tidal-mark"><i /><i /></span>
    </div>
  );
}

function CategoryIcon({ category }: { category: Category }) {
  const Icon = categoryIconMap[category.iconKey] || Folder;
  return (
    <span className={`category-icon icon-${category.color}`}>
      <Icon size={15} strokeWidth={1.7} />
    </span>
  );
}

function CategoryIconPicker({ value, onChange }: { value: CategoryIconKey; onChange: (value: CategoryIconKey) => void }) {
  return (
    <div className="category-icon-picker" role="group" aria-label="选择分类图标">
      {categoryIconOptions.map((option) => {
        const Icon = categoryIconMap[option.key];
        return (
          <button
            key={option.key}
            type="button"
            className={value === option.key ? "category-icon-option-active" : ""}
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

function BackgroundSlider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) {
  return (
    <label className="background-filter-control">
      <span><strong>{label}</strong><output>{value}{unit}</output></span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
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
  return (
    <span className={`site-icon site-icon-${site.iconTone}`}>
      {source && !iconFailed ? <img src={source} alt="" onError={() => setIconFailed(true)} /> : site.icon}
    </span>
  );
}

function StatChip({ label, value, tone, active, onClick }: { label: string; value: string; tone: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`stat-chip stat-${tone} ${active ? "stat-chip-active" : ""}`} onClick={onClick} aria-pressed={active}>
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

export default function Home({ onLogout }: { onLogout: () => void }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const draggingSiteIdRef = useRef<string | null>(null);
  const lastDragTargetRef = useRef<string | null>(null);
  const siteLayoutPositionsRef = useRef<Map<string, DOMRect>>(new Map());
  const siteLayoutAnimationsRef = useRef<Map<string, Animation>>(new Map());
  const shouldAnimateSiteLayoutRef = useRef(false);
  const draggingCategoryIdRef = useRef<string | null>(null);
  const lastCategoryDragTargetRef = useRef<string | null>(null);
  const [workspaceId] = useState(getWorkspaceId);
  const [storageMode, setStorageMode] = useState<"connecting" | "cloud" | "local">("connecting");
  const [savingSite, setSavingSite] = useState(false);
  const [sites, setSites] = useState<Site[]>(() => readLocal("tidal-sites", initialSites));
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => readLocal("tidal-favorites", []));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [draggingSiteId, setDraggingSiteId] = useState<string | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readLocal("tidal-sidebar-collapsed", false));
  const [skin, setSkin] = useState<"dark" | "light">(() => readLocal("tidal-skin", "dark"));
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(() => readLocal("tidal-background", "mist"));
  const [customBackground, setCustomBackground] = useState(() => readLocal("tidal-custom-background", "#f5f5f7"));
  const [backgroundImage, setBackgroundImage] = useState(() => readLocal("tidal-background-image", ""));
  const [backgroundImageBlur, setBackgroundImageBlur] = useState(() => readLocal("tidal-background-image-blur", 8));
  const [backgroundImageBrightness, setBackgroundImageBrightness] = useState(() => readLocal("tidal-background-image-brightness", 100));
  const [backgroundImageContrast, setBackgroundImageContrast] = useState(() => readLocal("tidal-background-image-contrast", 100));
  const [backgroundImageAdaptive, setBackgroundImageAdaptive] = useState(() => readLocal("tidal-background-image-adaptive", true));
  const [viewMode, setViewMode] = useState<ViewMode>(() => readLocal("tidal-view", "comfortable"));
  const [sortMode, setSortMode] = useState<SortMode>(() => readLocal("tidal-sort", "curated"));
  const [showDescriptions, setShowDescriptions] = useState(() => readLocal("tidal-descriptions", true));
  const [siteName, setSiteName] = useState(() => readLocal("tidal-name", "我的导航"));
  const [categories, setCategories] = useState<Category[]>(getInitialCategories);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<CategoryIconKey>("folder");
  const [editingCategoryId, setEditingCategoryId] = useState<CategoryId | null>(null);
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] = useState<CategoryId | null>(null);
  const [draggingCategoryId, setDraggingCategoryId] = useState<CategoryId | null>(null);
  const [newSite, setNewSite] = useState({ name: "", url: "", description: "", category: "design" as Site["category"], tags: [] as string[], iconUrl: "" });
  const [analyzingSite, setAnalyzingSite] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource | null>(null);

  useEffect(() => {
    window.localStorage.setItem("tidal-sites", JSON.stringify(sites));
  }, [sites]);

  useEffect(() => {
    let cancelled = false;
    const syncSites = async () => {
      try {
        const response = await fetch("/api/sites", { headers: { "x-workspace-id": workspaceId } });
        if (!response.ok) throw new Error("D1 unavailable");
        const payload = await response.json() as { sites?: Site[] };
        const remoteSites = Array.isArray(payload.sites) ? payload.sites : [];
        if (cancelled) return;
        if (remoteSites.length) {
          setSites(remoteSites);
        } else {
          const localSites = readLocal<Site[]>("tidal-sites", initialSites);
          const seedResponse = await fetch("/api/sites", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
            body: JSON.stringify({ sites: localSites }),
          });
          if (!seedResponse.ok) throw new Error("D1 seed failed");
        }
        if (!cancelled) setStorageMode("cloud");
      } catch {
        if (!cancelled) setStorageMode("local");
      }
    };
    void syncSites();
    return () => { cancelled = true; };
  }, [workspaceId]);

  useEffect(() => {
    window.localStorage.setItem("tidal-favorites", JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    const siteIds = new Set(sites.map((site) => site.id));
    setFavorites((current) => {
      const valid = current.filter((id, index) => siteIds.has(id) && current.indexOf(id) === index);
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
    window.localStorage.setItem("tidal-descriptions", JSON.stringify(showDescriptions));
  }, [showDescriptions]);
  useEffect(() => {
    window.localStorage.setItem("tidal-name", JSON.stringify(siteName));
  }, [siteName]);
  useEffect(() => {
    window.localStorage.setItem("tidal-sidebar-collapsed", JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);
  useEffect(() => {
    window.localStorage.setItem("tidal-background", JSON.stringify(backgroundMode));
  }, [backgroundMode]);
  useEffect(() => {
    window.localStorage.setItem("tidal-custom-background", JSON.stringify(customBackground));
  }, [customBackground]);
  useEffect(() => {
    window.localStorage.setItem("tidal-background-image-blur", JSON.stringify(backgroundImageBlur));
  }, [backgroundImageBlur]);
  useEffect(() => {
    window.localStorage.setItem("tidal-background-image-brightness", JSON.stringify(backgroundImageBrightness));
  }, [backgroundImageBrightness]);
  useEffect(() => {
    window.localStorage.setItem("tidal-background-image-contrast", JSON.stringify(backgroundImageContrast));
  }, [backgroundImageContrast]);
  useEffect(() => {
    window.localStorage.setItem("tidal-background-image-adaptive", JSON.stringify(backgroundImageAdaptive));
  }, [backgroundImageAdaptive]);
  useEffect(() => {
    window.localStorage.setItem("tidal-categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSettingsOpen(false);
        setAddOpen(false);
        setEditingSite(null);
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const categoryMeta = useMemo(() => {
    const allCategory = categories.find((category) => category.id === "all");
    return allCategory ? [allCategory, ...categories.filter((category) => category.id !== "all")] : categories;
  }, [categories]);
  const categoryNames = useMemo(() => Object.fromEntries(categories.map((category) => [category.id, category.label])) as Record<string, string>, [categories]);
  const contentCategories = useMemo(() => categories.filter((category) => !category.system), [categories]);
  const defaultContentCategoryId = contentCategories[0]?.id || "design";

  const filteredSites = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const next = sites.filter((site) => {
      const inCategory =
        activeCategory === "all" ||
        (activeCategory === "favorites" ? favorites.includes(site.id) : site.category === activeCategory);
      const inQuery = !normalized || [site.name, site.description, categoryNames[site.category] || site.categoryLabel, ...site.tags].join(" ").toLowerCase().includes(normalized);
      return inCategory && inQuery;
    });
    if (sortMode === "az") return [...next].sort((a, b) => a.name.localeCompare(b.name));
    return next;
  }, [activeCategory, categoryNames, favorites, query, sites, sortMode]);

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
    document.querySelectorAll<HTMLElement>("[data-site-id]").forEach((element) => {
      const siteId = element.dataset.siteId;
      const previous = siteId ? siteLayoutPositionsRef.current.get(siteId) : undefined;
      if (!siteId || !previous) return;
      const current = element.getBoundingClientRect();
      const deltaX = previous.left - current.left;
      const deltaY = previous.top - current.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

      const animation = element.animate([
        { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(.985)` },
        { transform: `translate3d(${-deltaX * .025}px, ${-deltaY * .025}px, 0) scale(1.006)`, offset: .78 },
        { transform: "translate3d(0, 0, 0) scale(1)" },
      ], {
        duration: 430,
        easing: "cubic-bezier(.22, 1, .36, 1)",
      });
      animation.onfinish = () => siteLayoutAnimationsRef.current.delete(siteId);
      nextAnimations.set(siteId, animation);
    });
    siteLayoutAnimationsRef.current = nextAnimations;
  }, [sites]);

  const toggleFavorite = (event: ReactMouseEvent<HTMLButtonElement>, site: Site) => {
    event.preventDefault();
    event.stopPropagation();
    const isFavorite = favorites.includes(site.id);
    setFavorites((current) => (current.includes(site.id) ? current.filter((item) => item !== site.id) : [...current, site.id]));
    toast.success(isFavorite ? `已取消收藏“${site.name}”。` : `已收藏“${site.name}”。`);
  };

  const withSortOrder = (nextSites: Site[]) => nextSites.map((site, index) => ({ ...site, sortOrder: index }));

  const persistSites = async (nextSites: Site[]) => {
    const response = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
      body: JSON.stringify({ sites: withSortOrder(nextSites) }),
    });
    const isJson = response.headers.get("content-type")?.includes("application/json") === true;
    const payload = isJson ? await response.json().catch(() => ({})) as { success?: boolean; error?: string } : {};
    if (!response.ok || payload.success !== true) throw new Error(payload.error || "云端保存失败。");
    return true;
  };

  const moveSite = (sourceId: string, targetId: string) => {
    if (!editMode || sourceId === targetId) return;
    if (!sites.some((site) => site.id === sourceId) || !sites.some((site) => site.id === targetId)) return;
    const previousPositions = new Map<string, DOMRect>();
    document.querySelectorAll<HTMLElement>("[data-site-id]").forEach((element) => {
      const siteId = element.dataset.siteId;
      if (siteId) previousPositions.set(siteId, element.getBoundingClientRect());
    });
    siteLayoutAnimationsRef.current.forEach((animation) => animation.cancel());
    siteLayoutAnimationsRef.current.clear();
    siteLayoutPositionsRef.current = previousPositions;
    shouldAnimateSiteLayoutRef.current = true;
    setSites((current) => {
      const sourceIndex = current.findIndex((site) => site.id === sourceId);
      const targetIndex = current.findIndex((site) => site.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return withSortOrder(next);
    });
    setOrderDirty(true);
  };

  const moveSiteByOffset = (siteId: string, offset: number) => {
    if (!editMode) return;
    const currentIndex = sites.findIndex((site) => site.id === siteId);
    const target = sites[currentIndex + offset];
    if (target) moveSite(siteId, target.id);
  };

  const beginSiteDrag = (event: React.PointerEvent<HTMLButtonElement>, siteId: string) => {
    if (!editMode) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingSiteIdRef.current = siteId;
    lastDragTargetRef.current = null;
    setDraggingSiteId(siteId);
  };

  const continueSiteDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const sourceId = draggingSiteIdRef.current;
    if (!sourceId) return;
    const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-site-id]");
    const targetId = targetElement?.dataset.siteId;
    if (!targetId || targetId === sourceId) {
      lastDragTargetRef.current = null;
      return;
    }
    if (lastDragTargetRef.current === targetId) return;
    lastDragTargetRef.current = targetId;
    moveSite(sourceId, targetId);
  };

  const endSiteDrag = () => {
    draggingSiteIdRef.current = null;
    lastDragTargetRef.current = null;
    setDraggingSiteId(null);
  };

  const beginNativeSiteDrag = (event: ReactDragEvent<HTMLElement>, siteId: string) => {
    if (!editMode) {
      event.preventDefault();
      return;
    }
    draggingSiteIdRef.current = siteId;
    setDraggingSiteId(siteId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", siteId);
  };

  const dropNativeSite = (event: ReactDragEvent<HTMLElement>, targetId: string) => {
    if (!editMode) return;
    event.preventDefault();
    const sourceId = draggingSiteIdRef.current || event.dataTransfer.getData("text/plain");
    if (sourceId) moveSite(sourceId, targetId);
    endSiteDrag();
  };

  const startEditMode = () => {
    setActiveCategory("all");
    setQuery("");
    setSortMode("curated");
    setSettingsOpen(false);
    setEditMode(true);
    toast.message("编辑模式已开启：拖动入口可调整顺序。");
  };

  const finishEditMode = async () => {
    const orderedSites = withSortOrder(sites);
    setSites(orderedSites);
    setEditMode(false);
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

  const selectCategory = (id: CategoryId) => {
    setActiveCategory(id);
    setMobileNavOpen(false);
  };

  const renameCategory = (id: CategoryId, label: string) => {
    setCategories((current) => current.map((category) => category.id === id ? { ...category, label } : category));
  };

  const setCategoryIcon = (id: CategoryId, iconKey: CategoryIconKey) => {
    setCategories((current) => current.map((category) => category.id === id ? { ...category, iconKey } : category));
  };

  const moveCategory = (sourceId: CategoryId, targetId: CategoryId) => {
    if (sourceId === targetId) return;
    setCategories((current) => {
      const from = current.findIndex((category) => category.id === sourceId);
      const to = current.findIndex((category) => category.id === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const beginCategoryDrag = (event: React.PointerEvent<HTMLButtonElement>, categoryId: CategoryId) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingCategoryIdRef.current = categoryId;
    lastCategoryDragTargetRef.current = null;
    setDraggingCategoryId(categoryId);
  };

  const continueCategoryDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const sourceId = draggingCategoryIdRef.current;
    if (!sourceId) return;
    const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-category-id]");
    const targetId = targetElement?.dataset.categoryId;
    if (!targetId || targetId === sourceId || lastCategoryDragTargetRef.current === targetId) return;
    lastCategoryDragTargetRef.current = targetId;
    moveCategory(sourceId, targetId);
  };

  const endCategoryDrag = () => {
    draggingCategoryIdRef.current = null;
    lastCategoryDragTargetRef.current = null;
    setDraggingCategoryId(null);
  };

  const beginNativeCategoryDrag = (event: ReactDragEvent<HTMLButtonElement>, categoryId: CategoryId) => {
    draggingCategoryIdRef.current = categoryId;
    setDraggingCategoryId(categoryId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", categoryId);
  };

  const dropNativeCategory = (event: ReactDragEvent<HTMLDivElement>, targetId: CategoryId) => {
    event.preventDefault();
    const sourceId = draggingCategoryIdRef.current || event.dataTransfer.getData("text/plain");
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
    setCategories((current) => {
      const favoritesIndex = current.findIndex((item) => item.id === "favorites");
      const next = [...current];
      next.splice(favoritesIndex >= 0 ? favoritesIndex : next.length, 0, category);
      return next;
    });
    setNewCategoryName("");
    setNewCategoryIcon("folder");
    setAddingCategory(false);
    setEditingCategoryId(category.id);
    toast.success(`已新增“${label}”。`);
  };

  const deleteCategory = (id: CategoryId) => {
    const category = categories.find((item) => item.id === id);
    if (!category || category.system) return;
    const fallback = contentCategories.find((item) => item.id !== id);
    if (!fallback) {
      toast.error("至少需要保留一个普通分类。");
      return;
    }
    const affectedCount = categoryCounts[id] || 0;
    const nextSites = sites.map((site) => site.category === id ? { ...site, category: fallback.id, categoryLabel: fallback.label } : site);
    setCategories((current) => current.filter((item) => item.id !== id));
    setSites(nextSites);
    setNewSite((current) => current.category === id ? { ...current, category: fallback.id } : current);
    if (activeCategory === id) setActiveCategory(fallback.id);
    setEditingCategoryId(null);
    setPendingDeleteCategoryId(null);
    if (affectedCount) {
      void persistSites(nextSites).catch(() => setStorageMode("local"));
      toast.success(`已删除“${category.label}”，${affectedCount} 个入口已移至“${fallback.label}”。`);
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
    if (!newSite.name.trim() || !newSite.url.trim()) {
      toast.error("先填入网站名称和地址。");
      return;
    }
    const parsedUrl = newSite.url.startsWith("http") ? newSite.url : `https://${newSite.url}`;
    const site: Site = {
      id: `${newSite.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: newSite.name.trim(),
      url: parsedUrl,
      description: newSite.description.trim() || "一个值得放在手边的入口。",
      category: newSite.category,
      categoryLabel: categoryNames[newSite.category]?.trim() || categoryLabelMap[newSite.category] || "未分类",
      icon: newSite.name.trim().slice(0, 2),
      iconUrl: newSite.iconUrl.trim() || faviconUrl(parsedUrl),
      iconTone: "mint",
      tags: newSite.tags.length ? newSite.tags : [categoryNames[newSite.category]?.trim() || categoryLabelMap[newSite.category] || "未分类"],
    };
    const nextSites = withSortOrder([site, ...sites.filter((item) => item.id !== site.id)]);
    setSavingSite(true);
    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
        body: JSON.stringify({ sites: nextSites }),
      });
      const isJson = response.headers.get("content-type")?.includes("application/json") === true;
      const payload = isJson ? await response.json().catch(() => ({})) as { success?: boolean; error?: string } : {};
      const cloudSaved = response.ok && payload.success === true;
      if (!cloudSaved && !import.meta.env.DEV) {
        throw new Error(payload.error || "D1 保存失败。");
      }
      setSites(nextSites);
      setNewSite({ name: "", url: "", description: "", category: defaultContentCategoryId, tags: [], iconUrl: "" });
      setAnalysisSource(null);
      setAddOpen(false);
      setActiveCategory("all");
      setStorageMode(cloudSaved ? "cloud" : "local");
      toast.success(cloudSaved ? "入口已保存到 Cloudflare D1。" : "本地开发模式：入口已保存到浏览器缓存。");
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
        body: JSON.stringify({ name: newSite.name, url: newSite.url }),
      });
      const result = await response.json() as { name?: string; description?: string; category?: Site["category"]; tags?: string[]; source?: AnalysisSource; error?: string };
      if (!response.ok) throw new Error(result.error || "网站分析失败。");
      setNewSite((current) => ({
        ...current,
        name: result.name || current.name,
        description: result.description || "",
        category: result.category && contentCategories.some((category) => category.id === result.category) ? result.category : defaultContentCategoryId,
        tags: Array.isArray(result.tags) ? result.tags : [],
        iconUrl: current.iconUrl || faviconUrl(current.url),
      }));
      setAnalysisSource(result.source || "ai");
      toast.success(result.source === "local" ? "本地智能分析完成，请确认结果。" : "AI 分析完成，请确认结果。");
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
        window.localStorage.setItem("tidal-background-image", JSON.stringify(reader.result));
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

  const uploadSiteIcon = (file?: File) => {
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
    reader.onload = () => setNewSite((current) => ({ ...current, iconUrl: typeof reader.result === "string" ? reader.result : "" }));
    reader.readAsDataURL(file);
  };

  const uploadEditedSiteIcon = (file?: File) => {
    if (!file || !editingSite) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件。");
      return;
    }
    if (file.size > 256 * 1024) {
      toast.error("图标图片不能超过 256KB。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditingSite((current) => current ? { ...current, iconUrl: typeof reader.result === "string" ? reader.result : "" } : current);
    reader.readAsDataURL(file);
  };

  const submitEditedSite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editMode || !editingSite) return;
    if (!editingSite.name.trim() || !editingSite.url.trim()) {
      toast.error("网站名称和地址不能为空。");
      return;
    }
    const parsedUrl = editingSite.url.startsWith("http") ? editingSite.url : `https://${editingSite.url}`;
    const updatedSite: Site = {
      ...editingSite,
      name: editingSite.name.trim(),
      url: parsedUrl,
      description: editingSite.description.trim() || "一个值得放在手边的入口。",
      categoryLabel: categoryNames[editingSite.category]?.trim() || categoryLabelMap[editingSite.category] || "未分类",
      icon: editingSite.name.trim().slice(0, 2),
      iconUrl: editingSite.iconUrl?.trim() || faviconUrl(parsedUrl),
      tags: editingSite.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 4),
    };
    setSavingSite(true);
    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-workspace-id": workspaceId },
        body: JSON.stringify({ site: updatedSite }),
      });
      const isJson = response.headers.get("content-type")?.includes("application/json") === true;
      const payload = isJson ? await response.json().catch(() => ({})) as { success?: boolean; error?: string } : {};
      const cloudSaved = response.ok && payload.success === true;
      if (!cloudSaved && !import.meta.env.DEV) throw new Error(payload.error || "D1 保存失败。");
      setSites((current) => current.map((site) => site.id === updatedSite.id ? updatedSite : site));
      setEditingSite(null);
      setStorageMode(cloudSaved ? "cloud" : "local");
      toast.success(cloudSaved ? "入口修改已同步。" : "入口修改已保存到当前设备。");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存入口修改失败。");
    } finally {
      setSavingSite(false);
    }
  };

  const activeLabel = categoryMeta.find((category) => category.id === activeCategory)?.label || "全部入口";
  const effectiveImageBrightness = backgroundImageAdaptive
    ? Math.max(30, Math.round(backgroundImageBrightness * (skin === "dark" ? .72 : 1.04)))
    : backgroundImageBrightness;
  const effectiveImageContrast = backgroundImageAdaptive
    ? Math.round(backgroundImageContrast * (skin === "dark" ? 1.08 : .94))
    : backgroundImageContrast;

  return (
    <div className={`app-shell skin-${skin} background-${backgroundMode} ${backgroundImage ? "has-background-image" : ""} ${backgroundImageAdaptive ? "background-image-adaptive" : ""} ${editMode ? "app-editing" : ""}`} style={{ "--custom-background": customBackground } as CSSProperties}>
      {backgroundImage && <><div className="workspace-background-image" style={{ backgroundImage: `url(${backgroundImage})`, "--background-image-blur": `${backgroundImageBlur}px`, "--background-image-brightness": `${effectiveImageBrightness}%`, "--background-image-contrast": `${effectiveImageContrast}%` } as CSSProperties} aria-hidden="true" /><div className="workspace-background-overlay" aria-hidden="true" /></>}
      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />
      <div className="ambient-orb orb-three" />
      <div className="grain-overlay" />

      <button className="mobile-nav-trigger glass-button" onClick={() => setMobileNavOpen(true)} aria-label="打开分类导航">
        <Menu size={18} />
        <span>目录</span>
      </button>

      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="sidebar-topline" />
        <div className="brand-lockup">
          <LogoMark />
          <div>
            <div className="brand-wordmark">tidal<span>/</span>index</div>
            <p>你的私人书签</p>
          </div>
          <button
            className="sidebar-collapse-button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? "展开侧边栏" : "收缩侧边栏"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "展开侧边栏" : "收缩侧边栏"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <button className="mobile-close glass-button" onClick={() => setMobileNavOpen(false)} aria-label="关闭分类导航">
            <X size={17} />
          </button>
        </div>

        <div className="sidebar-section-label">收进你的工作台</div>
        <nav className="category-nav" aria-label="网站分类">
          {categoryMeta.map((category) => {
            const isActive = category.id === activeCategory;
            const count = category.id === "all" ? sites.length : category.id === "favorites" ? favorites.length : categoryCounts[category.id] || 0;
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
          <div className="sync-status"><span className="status-pulse" /> {storageMode === "cloud" ? "Cloudflare D1 已同步" : storageMode === "connecting" ? "正在连接 D1" : "本地缓存模式"}</div>
          <p>最后整理于今天 09:42</p>
        </div>
      </aside>

      {mobileNavOpen && <button className="sidebar-backdrop" aria-label="关闭导航" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>工作台</span><ChevronRight size={14} /><strong>{activeLabel}</strong></div>
          <div className="topbar-actions">
            <button className="topbar-button" onClick={() => setSkin(skin === "dark" ? "light" : "dark")} aria-label="切换主题">
              {skin === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              <span>{skin === "dark" ? "日间" : "夜间"}</span>
            </button>
            <button className={`topbar-button edit-mode-button ${editMode ? "edit-mode-button-active" : ""}`} onClick={editMode ? finishEditMode : startEditMode} aria-pressed={editMode}>
              {editMode ? <Check size={16} /> : <Pencil size={15} />}
              <span>{editMode ? "完成" : "编辑"}</span>
            </button>
            <button className="topbar-button topbar-settings" onClick={() => setSettingsOpen(true)}>
              <Settings2 size={16} />
              <span>设置</span>
            </button>
            <button className="profile-chip profile-logout" onClick={onLogout} aria-label="退出登录" title="退出登录"><span>YU</span><LogOut size={13} /></button>
          </div>
        </header>

        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> PERSONAL INDEX / 01</div>
            <h1>让每天要用的入口，<em>随手可得。</em></h1>
            <p>把分散的互联网入口整理成一块有呼吸感的个人工作台。</p>
            <div className="hero-meta"><span><span className="live-dot" /> {sites.length} 个入口已就绪</span><span className="meta-separator" /> <span>本地空间 · 私人使用</span></div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-visual-note"><span>THE QUIET WEB</span><strong>01<span>/</span>09</strong></div>
          </div>
        </section>

        <section className="search-panel glass-panel">
          <div className="search-icon-wrap"><Search size={20} strokeWidth={1.8} /></div>
          <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索网站、分类或标签…" aria-label="搜索网站" />
          <div className="search-shortcut"><Keyboard size={13} /><span>/</span></div>
          {query && <button className="clear-search" onClick={() => setQuery("")} aria-label="清除搜索"><X size={15} /></button>}
        </section>

        <div className="workspace-lower-section">
        <section className="overview-row">
          <div className="overview-intro">
            <p className="section-kicker">CURATED SPACE</p>
            <div className="overview-title-row"><h2>{activeLabel}</h2><span className="result-count">{filteredSites.length.toString().padStart(2, "0")} sites</span></div>
          </div>
          <div className="stats-row">
            <StatChip label="全部入口" value={sites.length.toString().padStart(2, "0")} tone="mint" active={activeCategory === "all"} onClick={() => selectCategory("all")} />
            <StatChip label="我的收藏" value={favorites.length.toString().padStart(2, "0")} tone="rose" active={activeCategory === "favorites"} onClick={() => selectCategory("favorites")} />
            <button className="add-inline-button" onClick={() => setAddOpen(true)}><Plus size={15} /> 添加入口</button>
          </div>
        </section>

        {editMode && (
          <div className="edit-mode-hint" role="status">
            <span className="edit-mode-pulse" />
            <strong>编辑模式</strong>
            <span>拖动卡片右上角的把手调整顺序，点击铅笔修改入口。</span>
            <button onClick={finishEditMode}><Check size={14} /> 完成</button>
          </div>
        )}

        <div className="mobile-category-scroll" aria-label="快速分类">
          {categoryMeta.map((category) => <button key={category.id} className={activeCategory === category.id ? "mobile-category-active" : ""} onClick={() => selectCategory(category.id)}>{category.label}</button>)}
        </div>

        <section className={`site-grid grid-${viewMode} ${editMode ? "site-grid-editing" : ""}`} aria-live="polite">
          {filteredSites.map((site, index) => {
            const isFavorite = favorites.includes(site.id);
            return (
              <article
                key={site.id}
                data-site-id={site.id}
                draggable={editMode}
                onDragStart={(event) => beginNativeSiteDrag(event, site.id)}
                onDragOver={(event) => { if (editMode) event.preventDefault(); }}
                onDrop={(event) => dropNativeSite(event, site.id)}
                onDragEnd={endSiteDrag}
                className={`site-card glass-panel ${site.featured ? "site-card-featured" : ""} ${index === 1 ? "site-card-tall" : ""} ${editMode ? "site-card-editing" : ""} ${draggingSiteId === site.id ? "site-card-dragging" : ""}`}
              >
                {!editMode && <a className="site-card-link" href={site.url} target="_blank" rel="noreferrer" aria-label={`打开 ${site.name}`} />}
                <div className="site-card-topline">
                  <SiteIcon site={site} />
                  {editMode ? (
                    <div className="site-edit-controls">
                      <button className="site-edit-button" onClick={() => openSiteEditor(site)} aria-label={`编辑 ${site.name}`} title="编辑入口"><Pencil size={14} /></button>
                      <button
                        className="site-drag-handle"
                        onPointerDown={(event) => beginSiteDrag(event, site.id)}
                        onPointerMove={continueSiteDrag}
                        onPointerUp={endSiteDrag}
                        onPointerCancel={endSiteDrag}
                        onKeyDown={(event) => {
                          if (["ArrowLeft", "ArrowUp"].includes(event.key)) { event.preventDefault(); moveSiteByOffset(site.id, -1); }
                          if (["ArrowRight", "ArrowDown"].includes(event.key)) { event.preventDefault(); moveSiteByOffset(site.id, 1); }
                        }}
                        aria-label={`拖动 ${site.name} 调整顺序；也可使用方向键`}
                        title="拖动排序"
                      ><GripVertical size={15} /></button>
                    </div>
                  ) : (
                    <button type="button" className={`favorite-button ${isFavorite ? "favorite-active" : ""}`} onClick={(event) => toggleFavorite(event, site)} aria-label={isFavorite ? `取消收藏 ${site.name}` : `收藏 ${site.name}`} title={isFavorite ? "取消收藏" : "加入收藏"}>
                      <Bookmark size={16} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                  )}
                </div>
                <div className="site-card-content">
                  <div className="site-card-heading"><h3>{site.name}</h3></div>
                  {showDescriptions && <p>{site.description}</p>}
                </div>
                <div className="site-card-bottom"><div className="tag-list">{site.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><span className="category-label">{categoryNames[site.category]?.trim() || site.categoryLabel}</span></div>
              </article>
            );
          })}

          {filteredSites.length === 0 && (
            <div className="empty-state glass-panel">
              <div className="empty-art"><Search size={26} /></div>
              <div><p className="section-kicker">NO SIGNAL / 00</p><h3>{activeCategory === "favorites" && !query ? "还没有收藏任何入口" : "还没有找到这个入口"}</h3><p>{activeCategory === "favorites" && !query ? "点击任意卡片右上角的书签，就能在这里快速找到它。" : "换个关键词试试，或者把它添加到你的导航里。"}</p></div>
              {activeCategory === "favorites" && !query ? <button className="primary-button" onClick={() => selectCategory("all")}><Grid2X2 size={15} /> 浏览全部入口</button> : <button className="primary-button" onClick={() => setAddOpen(true)}><Plus size={15} /> 添加网站</button>}
            </div>
          )}
        </section>

        <div className="workspace-bottom">
          <section className="bottom-strip glass-panel">
            <div className="bottom-strip-copy"><p className="section-kicker">TIDAL NOTE / 04</p><h3>收藏一站，少一次搜索。</h3></div>
            <div className="bottom-strip-help"><CircleHelp size={16} /><span>快捷键 / 可随时聚焦搜索</span></div>
          </section>
          <footer className="main-footer"><span>tidal，你的书签收藏夹。</span><span>V{packageJson.version}</span></footer>
        </div>
        </div>
      </main>

      {settingsOpen && (
        <div className="drawer-layer" role="dialog" aria-modal="true" aria-label="导航设置">
          <button className="drawer-backdrop" onClick={() => setSettingsOpen(false)} aria-label="关闭设置" />
          <aside className="settings-drawer">
            <div className="drawer-header"><div><p className="section-kicker">PERSONALIZE / 02</p><h2>导航设置</h2></div><button className="drawer-close" onClick={() => setSettingsOpen(false)} aria-label="关闭设置"><X size={18} /></button></div>
            <div className="drawer-content">
              <section className="setting-section"><label className="setting-label">工作台名称</label><input className="setting-input" value={siteName} onChange={(event) => setSiteName(event.target.value)} /><p className="setting-hint">只在你的设备本地保存。</p></section>
              <section className="setting-section"><label className="setting-label">界面外观</label><div className="segmented-control"><button className={skin === "dark" ? "segment-active" : ""} onClick={() => setSkin("dark")}><Moon size={14} /> 深色石墨</button><button className={skin === "light" ? "segment-active" : ""} onClick={() => setSkin("light")}><Sun size={14} /> 雾白模式</button></div></section>
              <section className="setting-section background-setting">
                <div className="setting-row"><div><label className="setting-label">页面背景</label><p className="setting-hint">底色和背景图片仅保存在当前设备。</p></div><span className="background-status">{backgroundImage ? "图片" : backgroundMode === "custom" ? "自定义" : "预设"}</span></div>
                <div className="background-options">
                  <button type="button" className={`background-option background-option-mist ${backgroundMode === "mist" ? "background-option-active" : ""}`} onClick={() => setBackgroundMode("mist")}><span /><strong>雾白</strong><small>中性留白</small></button>
                  <button type="button" className={`background-option background-option-blue ${backgroundMode === "blue" ? "background-option-active" : ""}`} onClick={() => setBackgroundMode("blue")}><span /><strong>静谧蓝</strong><small>系统蓝光</small></button>
                  <button type="button" className={`background-option background-option-midnight ${backgroundMode === "midnight" ? "background-option-active" : ""}`} onClick={() => setBackgroundMode("midnight")}><span /><strong>午夜</strong><small>深石墨</small></button>
                </div>
                <div className="custom-background-row"><div><strong>自定义颜色</strong><small>作为图片加载前的底色</small></div><label className="color-picker" title="选择自定义背景色"><input type="color" value={customBackground} onChange={(event) => { setCustomBackground(event.target.value); setBackgroundMode("custom"); }} aria-label="选择自定义背景色" /><span style={{ background: customBackground }} /></label></div>
                <div className="background-image-editor">
                  <div className="background-image-heading"><div><strong>背景图片</strong><small>支持 JPG、PNG、WebP，最大 3MB</small></div><div className="background-image-actions"><label className="background-image-upload"><input type="file" accept="image/*" onChange={(event) => { uploadBackgroundImage(event.target.files?.[0]); event.target.value = ""; }} /><ImagePlus size={13} /><span>{backgroundImage ? "更换" : "选择图片"}</span></label>{backgroundImage && <button type="button" className="background-image-remove" onClick={clearBackgroundImage} aria-label="清除背景图片"><Trash2 size={13} /> 清除</button>}</div></div>
                  {backgroundImage && (
                    <>
                      <div className={`background-image-preview skin-${skin}`}><div style={{ backgroundImage: `url(${backgroundImage})`, filter: `blur(${Math.min(backgroundImageBlur, 8)}px) brightness(${effectiveImageBrightness}%) contrast(${effectiveImageContrast}%)` }} /><span>{skin === "dark" ? "暗黑模式预览" : "明亮模式预览"}</span></div>
                      <div className="background-filter-grid">
                        <BackgroundSlider label="模糊" value={backgroundImageBlur} min={0} max={24} unit="px" onChange={setBackgroundImageBlur} />
                        <BackgroundSlider label="亮度" value={backgroundImageBrightness} min={40} max={140} unit="%" onChange={setBackgroundImageBrightness} />
                        <BackgroundSlider label="对比度" value={backgroundImageContrast} min={60} max={160} unit="%" onChange={setBackgroundImageContrast} />
                      </div>
                      <div className="background-adaptive-row"><div><strong>自动适配界面模式</strong><small>暗黑模式压低亮度，明亮模式柔化对比度</small></div><button type="button" className={`toggle ${backgroundImageAdaptive ? "toggle-on" : ""}`} onClick={() => setBackgroundImageAdaptive((current) => !current)} aria-pressed={backgroundImageAdaptive} aria-label="自动适配明暗模式"><span /></button></div>
                    </>
                  )}
                </div>
              </section>
              <section className="setting-section category-settings">
                <div className="setting-row category-settings-heading">
                  <div><label className="setting-label">分类管理</label><p className="setting-hint">新增、编辑或拖动排序；“全部入口”为默认分类。</p></div>
                  <button type="button" className="category-add-button" onClick={() => { setAddingCategory((current) => !current); setEditingCategoryId(null); setPendingDeleteCategoryId(null); }}><Plus size={13} /> 新增</button>
                </div>
                {addingCategory && (
                  <div className="category-editor category-create-editor">
                    <label>分类名称<input autoFocus value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addCategory(); }} placeholder="例如：学习资料" maxLength={18} /></label>
                    <div><span className="category-editor-label">分类图标</span><CategoryIconPicker value={newCategoryIcon} onChange={setNewCategoryIcon} /></div>
                    <div className="category-editor-actions"><button type="button" onClick={() => { setAddingCategory(false); setNewCategoryName(""); }}>取消</button><button type="button" className="category-editor-primary" onClick={addCategory}><Plus size={12} /> 创建分类</button></div>
                  </div>
                )}
                <div className="category-settings-list">
                  {categoryMeta.filter((category) => category.id !== "all").map((category) => {
                    const count = category.id === "all" ? sites.length : category.id === "favorites" ? favorites.length : categoryCounts[category.id] || 0;
                    const isEditing = editingCategoryId === category.id;
                    const isPendingDelete = pendingDeleteCategoryId === category.id;
                    return (
                      <div
                        className={`category-setting-item ${draggingCategoryId === category.id ? "category-setting-item-dragging" : ""} ${isEditing ? "category-setting-item-editing" : ""}`}
                        key={category.id}
                        data-category-id={category.id}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => dropNativeCategory(event, category.id)}
                      >
                        <CategoryIcon category={category} />
                        <div className="category-setting-copy"><strong>{category.label}</strong><span>{category.system ? "固定分类" : `${count} 个入口`}</span></div>
                        <div className="category-setting-actions">
                          <button type="button" className="category-edit-button" onClick={() => { setEditingCategoryId(isEditing ? null : category.id); setAddingCategory(false); setPendingDeleteCategoryId(null); }} aria-label={`编辑 ${category.label}`} title="编辑分类"><Pencil size={13} /></button>
                          <button
                            type="button"
                            className="category-drag-handle"
                            draggable
                            onDragStart={(event) => beginNativeCategoryDrag(event, category.id)}
                            onDragEnd={endCategoryDrag}
                            onPointerDown={(event) => beginCategoryDrag(event, category.id)}
                            onPointerMove={continueCategoryDrag}
                            onPointerUp={endCategoryDrag}
                            onPointerCancel={endCategoryDrag}
                            aria-label={`拖动排序 ${category.label}`}
                            title="拖动排序"
                          ><GripVertical size={15} /></button>
                        </div>
                        {isEditing && (
                          <div className="category-editor">
                            <label>分类名称<input value={category.label} onChange={(event) => renameCategory(category.id, event.target.value)} onBlur={() => { if (!category.label.trim()) renameCategory(category.id, "未命名分类"); }} maxLength={18} /></label>
                            <div><span className="category-editor-label">分类图标</span><CategoryIconPicker value={category.iconKey} onChange={(value) => setCategoryIcon(category.id, value)} /></div>
                            <div className="category-editor-actions">
                              {!category.system && !isPendingDelete && <button type="button" className="category-delete-button" onClick={() => setPendingDeleteCategoryId(category.id)}>删除分类</button>}
                              {isPendingDelete && <div className="category-delete-confirm"><span>{count ? `${count} 个入口将移至其他分类。` : "确认删除这个分类？"}</span><button type="button" onClick={() => setPendingDeleteCategoryId(null)}>取消</button><button type="button" className="category-delete-confirm-button" onClick={() => deleteCategory(category.id)}>确认删除</button></div>}
                              <button type="button" className="category-editor-primary" onClick={() => setEditingCategoryId(null)}><Check size={12} /> 完成</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="setting-section"><label className="setting-label">卡片密度</label><div className="segmented-control"><button className={viewMode === "comfortable" ? "segment-active" : ""} onClick={() => setViewMode("comfortable")}><Grid2X2 size={14} /> 舒适</button><button className={viewMode === "dense" ? "segment-active" : ""} onClick={() => setViewMode("dense")}><LayoutList size={14} /> 紧凑</button></div></section>
              <section className="setting-section"><label className="setting-label">入口排序</label><div className="select-wrap"><select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="curated">编辑精选顺序</option><option value="az">按名称排列</option></select><ChevronRight size={15} /></div></section>
              <section className="setting-section"><div className="setting-row"><div><label className="setting-label">显示描述</label><p className="setting-hint">在网站卡片下显示一句简介。</p></div><button className={`toggle ${showDescriptions ? "toggle-on" : ""}`} onClick={() => setShowDescriptions(!showDescriptions)} aria-label="切换网站描述"><span /></button></div></section>
              <section className="setting-preview"><div className="preview-image" /><div><p className="section-kicker">MATERIAL NOTE</p><h3>玻璃的透明度，给内容留出呼吸。</h3><p>所有偏好只影响当前设备，不会上传。</p></div></section>
            </div>
            <div className="drawer-footer"><button className="secondary-button" onClick={() => { setFavorites([]); toast.success("收藏已清空"); }}>清空收藏</button><button className="primary-button" onClick={() => setSettingsOpen(false)}><Check size={15} /> 保存并返回</button></div>
          </aside>
        </div>
      )}

      {editingSite && editMode && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label={`编辑 ${editingSite.name}`}>
          <button className="drawer-backdrop" onClick={() => setEditingSite(null)} aria-label="关闭编辑窗口" />
          <form className="add-modal edit-site-modal glass-panel" onSubmit={submitEditedSite}>
            <div className="drawer-header"><div><p className="section-kicker">EDIT ENTRY / 05</p><h2>编辑入口</h2><p className="ai-modal-intro">修改名称、链接和分类；关闭编辑模式后仍可正常打开网站。</p></div><button type="button" className="drawer-close" onClick={() => setEditingSite(null)} aria-label="关闭编辑窗口"><X size={18} /></button></div>
            <div className="form-fields">
              <label>网站名称<input autoFocus value={editingSite.name} onChange={(event) => setEditingSite({ ...editingSite, name: event.target.value })} /></label>
              <label>网站地址<input value={editingSite.url} onChange={(event) => setEditingSite({ ...editingSite, url: event.target.value })} placeholder="https://example.com" /></label>
              <label>一句话简介<textarea value={editingSite.description} onChange={(event) => setEditingSite({ ...editingSite, description: event.target.value })} rows={3} /></label>
              <label>分类<select value={editingSite.category} onChange={(event) => setEditingSite({ ...editingSite, category: event.target.value })}>{contentCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
              <label>网站标签<span className="optional">用逗号分隔，最多 4 个</span><input value={editingSite.tags.join("，")} onChange={(event) => setEditingSite({ ...editingSite, tags: event.target.value.split(/[,，]/).map((tag) => tag.trim()).slice(0, 4) })} /></label>
              <div className="icon-field">
                <label>网站图标<span className="optional">默认抓取 favicon</span><input value={editingSite.iconUrl || ""} onChange={(event) => setEditingSite({ ...editingSite, iconUrl: event.target.value })} placeholder={faviconUrl(editingSite.url)} /></label>
                <label className="icon-upload-button"><input type="file" accept="image/*" onChange={(event) => uploadEditedSiteIcon(event.target.files?.[0])} /><span>上传图片</span></label>
                <span className="icon-preview">{editingSite.iconUrl ? <img src={editingSite.iconUrl} alt="图标预览" /> : <span>{editingSite.name.slice(0, 2) || "图"}</span>}</span>
              </div>
            </div>
            <div className="modal-footer"><span><Pencil size={14} /> 仅在编辑模式中可修改</span><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditingSite(null)}>取消</button><button type="submit" className="primary-button" disabled={savingSite}><Check size={15} /> {savingSite ? "正在保存…" : "保存修改"}</button></div></div>
          </form>
        </div>
      )}

      {addOpen && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="添加网站">
          <button className="drawer-backdrop" onClick={() => { setAddOpen(false); setAnalysisSource(null); }} aria-label="关闭添加窗口" />
          <form className="add-modal glass-panel" onSubmit={submitNewSite}>
            <div className="drawer-header"><div><p className="section-kicker">AI ENTRY / 03</p><h2>{analysisSource ? "确认网站信息" : "AI 添加入口"}</h2><p className="ai-modal-intro">填写网址，让 AI 自动生成简介、分类和标签。</p></div><button type="button" className="drawer-close" onClick={() => { setAddOpen(false); setAnalysisSource(null); }} aria-label="关闭添加窗口"><X size={18} /></button></div>
            <div className="form-fields">
              <label>网站地址<input autoFocus value={newSite.url} onChange={(event) => { setNewSite({ ...newSite, url: event.target.value, iconUrl: "" }); setAnalysisSource(null); }} placeholder="https://example.com" /></label>
              <label>网站名称<span className="optional">可选，AI 可识别</span><input value={newSite.name} onChange={(event) => setNewSite({ ...newSite, name: event.target.value })} placeholder="例如：Arc" /></label>
              {!analysisSource ? (
                <div className="ai-analyze-card">
                  <span className="ai-analyze-icon"><Sparkles size={18} /></span>
                  <div><strong>AI 自动整理</strong><p>分析网站用途，生成一句话简介、推荐分类和 2–4 个标签。</p></div>
                  <button type="button" className="ai-analyze-button" onClick={analyzeNewSite} disabled={analyzingSite}>{analyzingSite ? "分析中…" : "开始分析"}</button>
                </div>
              ) : (
                <div className="ai-review-panel">
                  <div className="ai-review-status"><span><Check size={14} /> {analysisSource === "ai" ? "AI 分析完成" : "本地智能分析完成"}</span><button type="button" onClick={analyzeNewSite}>重新分析</button></div>
                  <label>一句话简介<textarea value={newSite.description} onChange={(event) => setNewSite({ ...newSite, description: event.target.value })} rows={3} /></label>
                  <label>推荐分类<select value={newSite.category} onChange={(event) => setNewSite({ ...newSite, category: event.target.value })}>{contentCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
                  <label>网站标签<span className="optional">用逗号分隔，可修改</span><input value={newSite.tags.join("，")} onChange={(event) => setNewSite({ ...newSite, tags: event.target.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 4) })} placeholder="效率，协作" /></label>
                  <div className="icon-field">
                    <label>网站图标<span className="optional">默认抓取 favicon</span><input value={newSite.iconUrl} onChange={(event) => setNewSite({ ...newSite, iconUrl: event.target.value })} placeholder={faviconUrl(newSite.url) || "https://example.com/favicon.ico"} /></label>
                    <label className="icon-upload-button"><input type="file" accept="image/*" onChange={(event) => uploadSiteIcon(event.target.files?.[0])} /><span>上传图片</span></label>
                    <span className="icon-preview">{newSite.iconUrl ? <img src={newSite.iconUrl} alt="图标预览" /> : <span>{newSite.name.slice(0, 2) || "图"}</span>}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer"><span><Tags size={14} /> {analysisSource ? "请确认或修改后保存" : "分析不会自动保存"}</span>{analysisSource && <button type="submit" className="primary-button" disabled={savingSite}><Check size={15} /> {savingSite ? "正在保存…" : "确认并保存"}</button>}</div>
          </form>
        </div>
      )}
    </div>
  );
}
