"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCampaign, useLeads } from "@/hooks/useStorage";
import { updateCampaign, addLeadToCampaign, removeLeadFromCampaign, updateLead, deleteCampaign, addActivity } from "@/lib/storage";
import { useToast } from "@/lib/toast-context";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import AddLeadsModal from "@/components/AddLeadsModal";
import { LeadStatus } from "@/lib/types";
import {
  ArrowLeft,
  FolderKanban,
  Plus,
  Users,
  Trash2,
  Globe,
  MapPin,
  Star,
  ExternalLink,
  Edit3,
  Check,
  X,
} from "lucide-react";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const campaign = useCampaign(id);
  const allLeads = useLeads();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");

  if (!campaign) {
    return (
      <div className="fade-in flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-[#888]">Campaign not found</p>
        <Link href="/campaigns" className="text-sm text-[#3b82f6] hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Campaigns
        </Link>
      </div>
    );
  }

  const campaignLeads = allLeads.filter((l) => campaign.leadIds.includes(l.id));
  const total = campaignLeads.length;
  const statusCounts: Record<string, number> = {};
  campaignLeads.forEach((l) => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  const statusColors: Record<string, string> = {
    new: "#3b82f6",
    contacted: "#eab308",
    responded: "#8b5cf6",
    won: "#22c55e",
    lost: "#ef4444",
    archived: "#666",
  };

  const handleAddLeads = (leadIds: string[]) => {
    leadIds.forEach((lid) => addLeadToCampaign(id, lid));
    toast(`Added ${leadIds.length} leads`, "success");
    setShowAddModal(false);
  };

  const handleRemoveLead = (leadId: string, name: string) => {
    removeLeadFromCampaign(id, leadId);
    toast(`${name} removed from campaign`, "info");
  };

  const handleStatusChange = (leadId: string, status: LeadStatus, name: string) => {
    updateLead(leadId, { status });
    addActivity("lead_status_change", `Changed ${name} to ${status}`, leadId, id);
    toast(`${name} marked as ${status}`, "success");
  };

  const handleDelete = () => {
    deleteCampaign(id);
    toast("Campaign deleted", "info");
    router.push("/campaigns");
  };

  const handleSaveName = () => {
    if (nameValue.trim()) {
      updateCampaign(id, { name: nameValue.trim() });
      toast("Name updated", "success");
    }
    setEditingName(false);
  };

  const handleSaveDesc = () => {
    updateCampaign(id, { description: descValue.trim() || undefined });
    toast("Description updated", "success");
    setEditingDesc(false);
  };

  return (
    <div className="fade-in">
      <Link href="/campaigns" className="text-xs text-[#666] hover:text-white flex items-center gap-1 transition-colors mb-6 w-fit">
        <ArrowLeft size={14} /> Back to Campaigns
      </Link>

      {/* Header */}
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#8b5cf6]/10 flex items-center justify-center flex-shrink-0">
              <FolderKanban size={22} className="text-[#8b5cf6]" />
            </div>
            <div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="bg-[#0a0a0a] border border-[#333] rounded-lg px-2 py-1 text-sm text-white outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  />
                  <button onClick={handleSaveName} className="text-[#22c55e] cursor-pointer"><Check size={14} /></button>
                  <button onClick={() => setEditingName(false)} className="text-[#ef4444] cursor-pointer"><X size={14} /></button>
                </div>
              ) : (
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  {campaign.name}
                  <button
                    onClick={() => { setNameValue(campaign.name); setEditingName(true); }}
                    className="text-[#555] hover:text-white cursor-pointer"
                  >
                    <Edit3 size={12} />
                  </button>
                </h1>
              )}

              {editingDesc ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    placeholder="Add description..."
                    className="bg-[#0a0a0a] border border-[#333] rounded-lg px-2 py-1 text-xs text-[#888] outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveDesc()}
                  />
                  <button onClick={handleSaveDesc} className="text-[#22c55e] cursor-pointer"><Check size={12} /></button>
                  <button onClick={() => setEditingDesc(false)} className="text-[#ef4444] cursor-pointer"><X size={12} /></button>
                </div>
              ) : (
                <p
                  className="text-xs text-[#666] mt-0.5 cursor-pointer hover:text-[#888]"
                  onClick={() => { setDescValue(campaign.description || ""); setEditingDesc(true); }}
                >
                  {campaign.description || "Click to add description..."}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="text-[#555] hover:text-[#ef4444] transition-colors cursor-pointer"
            title="Delete campaign"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Progress */}
        {total > 0 && (
          <div className="mt-5 pt-5 border-t border-[#1a1a1a]">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-[#888]" />
              <span className="text-sm text-[#888]">{total} leads</span>
            </div>
            {/* Stacked progress bar */}
            <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden flex">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(count / total) * 100}%`,
                    backgroundColor: statusColors[status] || "#666",
                  }}
                />
              ))}
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              {Object.entries(statusCounts).map(([status, count]) => (
                <span key={status} className="text-[10px] text-[#888] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[status] }} />
                  {status} ({count})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#111] border border-[#222] hover:border-[#333] text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus size={14} /> Add Leads
        </button>
      </div>

      {/* Lead List */}
      {campaignLeads.length === 0 ? (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-12 text-center">
          <Users size={32} className="text-[#333] mx-auto mb-3" />
          <p className="text-sm text-[#666]">No leads in this campaign</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-sm text-[#3b82f6] hover:underline cursor-pointer"
          >
            Add leads
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {campaignLeads.map((lead) => {
            const b = lead.business;
            return (
              <div key={lead.id} className="bg-[#111] border border-[#222] rounded-xl p-4 hover:border-[#333] transition-colors group">
                <div className="flex items-center gap-4">
                  {b.photo_url ? (
                    <img src={b.photo_url} alt={b.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                      <Globe size={16} className="text-[#444]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/leads/${lead.id}`} className="text-sm font-semibold text-white hover:text-[#3b82f6] transition-colors truncate">
                        {b.name}
                      </Link>
                      <StatusBadge status={lead.status} />
                    </div>
                    <span className="text-xs text-[#888] flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {b.address}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus, b.name)}
                      className="bg-transparent border border-[#222] rounded-lg px-2 py-1.5 text-[11px] text-[#888] outline-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="responded">Responded</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                    <Link href={`/leads/${lead.id}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors">
                      <ExternalLink size={14} />
                    </Link>
                    <button
                      onClick={() => handleRemoveLead(lead.id, b.name)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#555] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Leads Modal */}
      {showAddModal && (
        <AddLeadsModal
          leads={allLeads}
          existingLeadIds={campaign.leadIds}
          onAdd={handleAddLeads}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
