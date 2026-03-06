export type AppRole = "admin" | "coach" | "member";
export type CoachAccountStatus = "pending" | "approved" | "rejected";

export type AuthAccountRow = {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
  password_hash: string | null;
  coach_status: CoachAccountStatus;
  is_active: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AppSession = {
  accountId: string;
  email: string;
  displayName: string;
  role: AppRole;
  iat: number;
  exp: number;
};
