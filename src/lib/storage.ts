import { Lead, Campaign, SearchHistoryEntry, ActivityEvent, AppStats, LeadStatus, ActivityType } from './types';

const KEYS = {
  leads: 'salespraai_leads',
  campaigns: 'salespraai_campaigns',
  searchHistory: 'salespraai_search_history',
  activity: 'salespraai_activity',
};

const MAX_SEARCH_HISTORY = 10;
const MAX_ACTIVITY = 50;

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('storage-change', { detail: { key } }));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// --- Leads ---

export function getLeads(): Lead[] {
  return get<Lead[]>(KEYS.leads, []);
}

export function getLeadById(id: string): Lead | undefined {
  return getLeads().find((l) => l.id === id);
}

export function saveLead(lead: Lead): void {
  const leads = getLeads();
  const existing = leads.findIndex((l) => l.id === lead.id);
  if (existing >= 0) {
    leads[existing] = lead;
  } else {
    leads.unshift(lead);
  }
  set(KEYS.leads, leads);
}

export function updateLead(id: string, partial: Partial<Lead>): void {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx >= 0) {
    leads[idx] = { ...leads[idx], ...partial, updatedAt: new Date().toISOString() };
    set(KEYS.leads, leads);
  }
}

export function deleteLead(id: string): void {
  const leads = getLeads().filter((l) => l.id !== id);
  set(KEYS.leads, leads);
  // Remove from campaigns
  const campaigns = getCampaigns();
  campaigns.forEach((c) => {
    c.leadIds = c.leadIds.filter((lid) => lid !== id);
  });
  set(KEYS.campaigns, campaigns);
}

export function isBusinessSaved(placeId: string): boolean {
  return getLeads().some((l) => l.business.place_id === placeId);
}

export function getLeadByPlaceId(placeId: string): Lead | undefined {
  return getLeads().find((l) => l.business.place_id === placeId);
}

// --- Campaigns ---

export function getCampaigns(): Campaign[] {
  return get<Campaign[]>(KEYS.campaigns, []);
}

export function getCampaignById(id: string): Campaign | undefined {
  return getCampaigns().find((c) => c.id === id);
}

export function saveCampaign(campaign: Campaign): void {
  const campaigns = getCampaigns();
  const existing = campaigns.findIndex((c) => c.id === campaign.id);
  if (existing >= 0) {
    campaigns[existing] = campaign;
  } else {
    campaigns.unshift(campaign);
  }
  set(KEYS.campaigns, campaigns);
}

export function updateCampaign(id: string, partial: Partial<Campaign>): void {
  const campaigns = getCampaigns();
  const idx = campaigns.findIndex((c) => c.id === id);
  if (idx >= 0) {
    campaigns[idx] = { ...campaigns[idx], ...partial, updatedAt: new Date().toISOString() };
    set(KEYS.campaigns, campaigns);
  }
}

export function deleteCampaign(id: string): void {
  const campaigns = getCampaigns().filter((c) => c.id !== id);
  set(KEYS.campaigns, campaigns);
}

export function addLeadToCampaign(campaignId: string, leadId: string): void {
  const campaign = getCampaignById(campaignId);
  if (campaign && !campaign.leadIds.includes(leadId)) {
    campaign.leadIds.push(leadId);
    campaign.updatedAt = new Date().toISOString();
    saveCampaign(campaign);
  }
}

export function removeLeadFromCampaign(campaignId: string, leadId: string): void {
  const campaign = getCampaignById(campaignId);
  if (campaign) {
    campaign.leadIds = campaign.leadIds.filter((id) => id !== leadId);
    campaign.updatedAt = new Date().toISOString();
    saveCampaign(campaign);
  }
}

// --- Search History ---

export function getSearchHistory(): SearchHistoryEntry[] {
  return get<SearchHistoryEntry[]>(KEYS.searchHistory, []);
}

export function addSearchHistory(entry: SearchHistoryEntry): void {
  let history = getSearchHistory();
  // Remove duplicate queries
  history = history.filter((h) => h.query.toLowerCase() !== entry.query.toLowerCase());
  history.unshift(entry);
  if (history.length > MAX_SEARCH_HISTORY) history = history.slice(0, MAX_SEARCH_HISTORY);
  set(KEYS.searchHistory, history);
}

// --- Activity ---

export function getActivity(): ActivityEvent[] {
  return get<ActivityEvent[]>(KEYS.activity, []);
}

export function addActivity(type: ActivityType, description: string, leadId?: string, campaignId?: string): void {
  let activity = getActivity();
  activity.unshift({
    id: generateId(),
    type,
    description,
    timestamp: new Date().toISOString(),
    leadId,
    campaignId,
  });
  if (activity.length > MAX_ACTIVITY) activity = activity.slice(0, MAX_ACTIVITY);
  set(KEYS.activity, activity);
}

// --- Stats ---

export function getStats(): AppStats {
  const leads = getLeads();
  const campaigns = getCampaigns();

  const leadsByStatus: Record<LeadStatus, number> = {
    new: 0,
    contacted: 0,
    responded: 0,
    won: 0,
    lost: 0,
    archived: 0,
  };

  let pitchesGenerated = 0;
  let emailsSent = 0;

  leads.forEach((l) => {
    leadsByStatus[l.status]++;
    if (l.pitch) pitchesGenerated++;
    if (l.emailSentAt) emailsSent++;
  });

  return {
    totalLeads: leads.length,
    pitchesGenerated,
    emailsSent,
    activeCampaigns: campaigns.length,
    leadsByStatus,
  };
}
