export type UserRole = 'admin' | 'operator';

export interface User {
  id: number;
  username: string;
  password?: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  master_key?: string;
  last_activity?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export interface RouteConfig {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  allowedRoles?: UserRole[];
}
