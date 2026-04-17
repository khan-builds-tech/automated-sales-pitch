"use client";

import { useSyncExternalStore, useRef } from "react";
import {
  getLeads,
  getLeadById,
  getCampaigns,
  getCampaignById,
  getSearchHistory,
  getActivity,
  getStats,
} from "@/lib/storage";
import type { Lead, Campaign, SearchHistoryEntry, ActivityEvent, AppStats } from "@/lib/types";

type Subscriber = () => void;

let subscribers: Subscriber[] = [];

function subscribe(callback: Subscriber): () => void {
  subscribers.push(callback);

  const handleChange = () => callback();
  window.addEventListener("storage-change", handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    subscribers = subscribers.filter((s) => s !== callback);
    window.removeEventListener("storage-change", handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

// Cache getSnapshot results so useSyncExternalStore sees stable references.
// A new reference is only returned when the serialized data actually changes.
function makeCachedSnapshot<T>(getFresh: () => T, serverValue: T): { get: () => T; server: () => T } {
  let cachedJson: string | undefined;
  let cachedValue: T = serverValue;

  return {
    get() {
      const json = JSON.stringify(getFresh());
      if (json !== cachedJson) {
        cachedJson = json;
        cachedValue = JSON.parse(json);
      }
      return cachedValue;
    },
    server: () => serverValue,
  };
}

function useStore<T>(getFresh: () => T, serverValue: T): T {
  const cacheRef = useRef<ReturnType<typeof makeCachedSnapshot<T>> | undefined>(undefined);
  if (!cacheRef.current) {
    cacheRef.current = makeCachedSnapshot(getFresh, serverValue);
  }
  return useSyncExternalStore(subscribe, cacheRef.current.get, cacheRef.current.server);
}

const EMPTY_LEADS: Lead[] = [];
const EMPTY_CAMPAIGNS: Campaign[] = [];
const EMPTY_SEARCH_HISTORY: SearchHistoryEntry[] = [];
const EMPTY_ACTIVITY: ActivityEvent[] = [];
const EMPTY_STATS: AppStats = {
  totalLeads: 0,
  activeCampaigns: 0,
  pitchesGenerated: 0,
  emailsSent: 0,
  leadsByStatus: { new: 0, contacted: 0, responded: 0, won: 0, lost: 0, archived: 0 },
};

export function useLeads(): Lead[] {
  return useStore(getLeads, EMPTY_LEADS);
}

export function useLead(id: string): Lead | undefined {
  return useStore(() => getLeadById(id), undefined);
}

export function useCampaigns(): Campaign[] {
  return useStore(getCampaigns, EMPTY_CAMPAIGNS);
}

export function useCampaign(id: string): Campaign | undefined {
  return useStore(() => getCampaignById(id), undefined);
}

export function useSearchHistory(): SearchHistoryEntry[] {
  return useStore(getSearchHistory, EMPTY_SEARCH_HISTORY);
}

export function useActivity(): ActivityEvent[] {
  return useStore(getActivity, EMPTY_ACTIVITY);
}

export function useStats(): AppStats {
  return useStore(getStats, EMPTY_STATS);
}
