export enum View {
  DASHBOARD = "Dashboard",
  ADD_PRODUCT = "Add Product",
  MANAGE_PRODUCTS = "Manage Products",
  MANAGE_ADMINS = "Manage Admins",
  MANAGE_ROLES = "Manage Roles",
  MANAGE_CATEGORIES = "Manage Categories",
  MANAGE_CATEGORY_KEYWORDS = "Manage Category Keywords",
  MANAGE_TAGS = "Manage Tags",
  MANAGE_BANNERS = "Manage Banners",
  MANAGE_BANNER_POSITIONS = "Banner Positions",
  MANAGE_BANNER_CAMPAIGNS = "Banner Campaigns",
  MANAGE_BANNER_IMAGES = "Manage Banner Images",
  SETTINGS = "Settings",
  CHANGE_PASSWORD = "Change Password"
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  description: string;
  imageUrl: string;
  tags: string[];
  status: "Active" | "Draft" | "Archived";
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface Admin {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role_id: number;
  role_name: string;
  status: 'active' | 'inactive';
  last_login_at: string;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  created_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  slug: string;
  description: string;
  group_name: string;
}

export interface Tag {
  id: number;
  name: string;
  is_active: boolean;
  product_count?: number;
  created_at?: string;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  active: boolean;
}

export interface Settings {
  id: number;
  website_name: string;
  logo_url: string;
  maintenance_mode: boolean;
}

export interface SocialMedia {
  id: number;
  name: string;
  icon_url: string;
  url: string;
  is_active: boolean;
  sort_order: number;
}
