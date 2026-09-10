import { memo } from "react";
import {
  Brain,
  Code2,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  ListChecks,
  Mail,
  MonitorSmartphone,
  Play,
  Plug,
  Save,
  Search,
  Sparkles,
  Rocket,
  Table2,
  Terminal,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import { resolveToolActivity, brandIconUrl } from "@/lib/toolActivity";

const LUCIDE: Record<string, typeof Globe> = {
  Brain,
  Code2,
  FileText,
  Globe,
  Image: ImageIcon,
  Layers,
  Play,
  Plug,
  Save,
  Search,
  Sparkles,
  Rocket,
  Table2,
  Terminal,
  Users,
  Video,
  Wrench,
};

/**
 * Tool families / raw tool names that map straight onto a clean glyph, so a
 * running tool never falls back to a generic wrench when we know better.
 */
const FAMILY: Record<string, typeof Globe> = {
  browser: Globe,
  computer: MonitorSmartphone,
  computer_use: MonitorSmartphone,
  code: Terminal,
  files: FileText,
  file: FileText,
  mcp: Plug,
  integration: Plug,
  search: Search,
  web_search: Search,
  image: ImageIcon,
  video: Video,
  memory: Brain,
  scrape_page: Globe,
  crawl_site: Layers,
  extract_data: Table2,
  read_url: Globe,
  deep_research: Search,
  slides: Layers,
  sheets: Table2,
  build_and_deploy_app: Rocket,
  deploy: Rocket,
  computer_task: MonitorSmartphone,
  computer_task_status: MonitorSmartphone,
  send_email: Mail,
  read_inbox: Mail,
  mail: Mail,
  generate_image: ImageIcon,
  generate_video: Video,
  create_slides: Layers,
  list_integrations: Plug,
  use_integration: Plug,
  use_skill: Sparkles,
  write_todo: ListChecks,
  delegate_agent: Users,
  remember_fact: Brain,
  open_url: Globe,
};

export interface ToolIconProps {
  /** Tool family (`browser`) or exact tool name (`gmail_send_email`). */
  name?: string | null;
  appSlug?: string;
  size?: number;
  className?: string;
}

/**
 * Single source of truth for tool glyphs in chat: brand mark when the tool
 * belongs to a known app, otherwise a quiet lucide glyph. Always rendered flat
 * and monochrome so rows stay clean.
 */
const ToolIcon = ({ name, appSlug, size = 14, className = "" }: ToolIconProps) => {
  const key = String(name || "").trim();
  const px = { width: size, height: size };

  const Family = key ? FAMILY[key] || FAMILY[key.split("_")[0]] : undefined;
  if (Family && !appSlug) {
    return <Family style={px} className={`shrink-0 ${className}`} />;
  }

  const meta = resolveToolActivity(key, appSlug);
  if (meta.slug) {
    return (
      <img
        loading="lazy"
        decoding="async"
        src={brandIconUrl(meta.slug)}
        alt=""
        style={px}
        className={`shrink-0 opacity-80 dark:invert ${className}`}
      />
    );
  }

  const Glyph = LUCIDE[meta.lucide || "Wrench"] || Wrench;
  return <Glyph style={px} className={`shrink-0 ${className}`} />;
};

export default memo(ToolIcon);
