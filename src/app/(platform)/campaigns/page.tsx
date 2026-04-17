"use client";

import { useState } from "react";
import { useCampaigns, useLeads } from "@/hooks/useStorage";
import { saveCampaign, generateId, addActivity } from "@/lib/storage";
import { useToast } from "@/lib/toast-context";
import CampaignCard from "@/components/CampaignCard";
import { FolderKanban, Plus, X } from "lucide-react";

export default function CampaignsPage() {
  const campaigns = useCampaigns();
  const leads = useLeads();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    const id = generateId();
    saveCampaign({
      id,
      name: name.trim(),
      description: description.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      leadIds: [],
    });
    addActivity("campaign_created", `Created campaign "${name.trim()}"`, undefined, id);
    toast(`Campaign "${name.trim()}" created`, "success");
    setName("");
    setDescription("");
    setShowCreate(false);
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderKanban size={24} /> Campaigns
          </h1>
          <p className="text-sm text-[#888] mt-0.5">{campaigns.length} campaigns</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {/* Campaign Grid */}
      {campaigns.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
          <FolderKanban size={32} className="text-[#333] mx-auto mb-3" />
          <p className="text-sm text-[#666] mb-1">No campaigns yet</p>
          <p className="text-xs text-[#555]">Create a campaign to organize your leads and track outreach progress</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 text-sm text-[#3b82f6] hover:underline cursor-pointer"
          >
            Create your first campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} leads={leads} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative bg-[#111] border border-[#222] rounded-2xl w-full max-w-md mx-4 p-6 toast-in">
            <button
              onClick={() => setShowCreate(false)}
              className="absolute top-4 right-4 text-[#555] hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">Create Campaign</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#666] uppercase tracking-wider mb-1 block">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='e.g. "Dubai Restaurants Q1"'
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-[#333]"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div>
                <label className="text-xs text-[#666] uppercase tracking-wider mb-1 block">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this campaign about?"
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#444] outline-none focus:border-[#333] resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="w-full mt-4 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white font-medium py-2.5 rounded-xl transition-colors cursor-pointer text-sm"
            >
              Create Campaign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
