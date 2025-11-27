export type SkinModel = 'classic' | 'slim';

export interface Profile {
  id: string;
  userId?: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  birthDate?: string | null;
  avatarUrl: string;
  skinUrl: string;
  skinModel?: SkinModel;
  email?: string;
  registeredAt?: string;
  bannerUrl?: string;
  profileTheme?: string;
  customThemeColor1?: string;
  customThemeColor2?: string;
  profileWallpaper?: string;
  userStatus?: string;
  customStatus?: string;
  socialLinks?: Array<{ type: string; value: string }>;
}

export interface Session {
  tokenId: string;
  familyId: string;
  expiresAt: string;
  replacedBy: string | null;
  revokedAt: string | null;
  deviceId: string | null;
  ip: string | null;
  ua: string | null;
  createdAt: string;
}

export type Status = 'active' | 'expired' | 'replaced' | 'revoked';

export interface ToastEntry {
  id: number;
  type: 'success' | 'error';
  message: string;
  fading?: boolean;
}

export interface SessionFilters {
  active: boolean;
  expired: boolean;
  replaced: boolean;
  revoked: boolean;
}

export type SortKey = 'created_desc' | 'created_asc' | 'expires_desc' | 'expires_asc';
