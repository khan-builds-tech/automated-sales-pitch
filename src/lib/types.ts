export interface Business {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  total_ratings?: number;
  phone?: string;
  website?: string;
  types?: string[];
  photo_url?: string;
  business_status?: string;
  opening_hours?: { open_now: boolean };
  lat?: number;
  lng?: number;
}

export interface AuditScore {
  label: string;
  score: number; // 0-100
  details: string[];
  unavailable?: boolean;
}

export interface SocialProfile {
  platform: string;
  found: boolean;
  url?: string;
}

export interface CompetitorInfo {
  name: string;
  website?: string;
  rating?: number;
  totalRatings?: number;
  hasWebsite: boolean;
  strengths: string[];
}

export interface OnlinePresence {
  hasWebsite: boolean;
  socialProfiles: SocialProfile[];
  competitorsWithWebsites: number;
  competitorsTotal: number;
  websiteBenefits: string[];
}

export interface AuditResult {
  business: Business;
  hasWebsite: boolean;
  scores: AuditScore[];
  recommendations: string[];
  competitors: CompetitorInfo[];
  overallGrade: string;
  opportunities: string[];
  onlinePresence?: OnlinePresence;
  auditError?: string;
  siteBroken?: boolean;
  socialOnlyPlatform?: string;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  html: string;
}

export interface SalesPitch {
  email: {
    subject: string;
    body: string;
    html: string;
  };
  callScript: {
    opening: string;
    discovery: string;
    pitch: string;
    objectionHandling: string[];
    closing: string;
    fullScript: string;
  };
}

export interface SpreadsheetRow {
  name: string;
  location: string;
  website: string;
  phone: string;
  callScript: string;
  email: string;
}

export type Step = 'search' | 'select' | 'audit' | 'pitch';

export type LeadStatus = 'new' | 'contacted' | 'responded' | 'won' | 'lost' | 'archived';

export interface Lead {
  id: string;
  business: Business;
  audit?: AuditResult;
  pitch?: SalesPitch;
  status: LeadStatus;
  campaignId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  contactedAt?: string;
  emailSentAt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  leadIds: string[];
}

export interface SearchHistoryEntry {
  query: string;
  resultCount: number;
  timestamp: string;
}

export type ActivityType = 'search' | 'audit' | 'pitch' | 'email_sent' | 'lead_saved' | 'lead_status_change' | 'campaign_created';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  leadId?: string;
  campaignId?: string;
}

export interface AppStats {
  totalLeads: number;
  pitchesGenerated: number;
  emailsSent: number;
  activeCampaigns: number;
  leadsByStatus: Record<LeadStatus, number>;
}

export type UserRole = 'admin' | 'staff';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  photoUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}
