/**
 * Shared admin UI icons — common Lucide glyphs used consistently across the dashboard.
 */
import {
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  Clock,
  GripVertical,
  Image,
  LayoutDashboard,
  LayoutGrid,
  Link,
  List,
  Loader2,
  Menu,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  TrendingUp,
  Trash2,
  Upload,
  User,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

export type { LucideIcon };

export {
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  Clock,
  GripVertical,
  Image,
  LayoutDashboard,
  LayoutGrid,
  Link,
  List,
  Loader2,
  Menu,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  TrendingUp,
  Trash2,
  Upload,
  User,
  UserCog,
  Users,
  X,
};

/** Sidebar navigation icons */
export const AdminNavIcons = {
  overview: LayoutDashboard,
  services: Package,
  appointments: Calendar,
  customers: Users,
  staff: UserCog,
  settings: Settings,
  income: TrendingUp,
  businesses: Building2,
} as const;
