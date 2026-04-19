'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Mail, Globe, Zap, KeyRound, MessageSquare, Star, Trash2, Edit2, CheckCircle2, ShieldAlert, Clock, Check, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { generateInviteCode, updateWaitlistStatus } from './actions';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export function AdminBetaDashboard({ initialData }: { initialData: any }) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'feedback' | 'codes' | 'waitlist'>('matrix');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedWaitlist, setExpandedWaitlist] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const { workspaces, feedback, inviteCodes, waitlist } = initialData;

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      await generateInviteCode(1, 'BETA');
      toast.success('Generated new code!');
      window.location.reload();
    } catch {
      toast.error('Failed to generate code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(id);
    try {
      const result = await updateWaitlistStatus(id, status);
      toast.success(status === 'APPROVED' ? `Approved! Code: ${result.code}` : 'Rejected Application');
      window.location.reload();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border p-5 rounded-xl">
          <div className="text-muted-foreground text-sm font-medium mb-2 flex items-center gap-2"><Users size={16}/> Total Testers</div>
          <div className="text-3xl font-display font-bold">{workspaces.length}</div>
        </div>
        <div className="bg-card border border-border p-5 rounded-xl">
          <div className="text-muted-foreground text-sm font-medium mb-2 flex items-center gap-2"><KeyRound size={16}/> Active BYOKs</div>
          <div className="text-3xl font-display font-bold">
            {workspaces.filter((w: any) => w.resendApiKey).length}
          </div>
        </div>
        <div className="bg-card border border-border p-5 rounded-xl">
          <div className="text-muted-foreground text-sm font-medium mb-2 flex items-center gap-2"><MessageSquare size={16}/> Total Feedbacks</div>
          <div className="text-3xl font-display font-bold">{feedback.length}</div>
        </div>
        <div className="bg-card border border-border p-5 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={48} /></div>
          <div className="text-muted-foreground text-sm font-medium mb-2 flex items-center gap-2 text-green-400"><Zap size={16}/> AI Credits Left</div>
          <div className="text-3xl font-display font-bold text-green-400">
             {workspaces.reduce((acc: number, w: any) => acc + w.aiCredits, 0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'matrix' ? 'text-foreground border-b-2 border-brand' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Beta Matrix
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'feedback' ? 'text-foreground border-b-2 border-brand' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Feedback Feed
        </button>
        <button
          onClick={() => setActiveTab('codes')}
          className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'codes' ? 'text-foreground border-b-2 border-brand' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Invite Codes
        </button>
        <button
          onClick={() => setActiveTab('waitlist')}
          className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'waitlist' ? 'text-foreground border-b-2 border-brand' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Pending Access ({waitlist.filter((w: any) => w.status === 'PENDING').length})
        </button>
      </div>

      {/* TABS CONTENT */}
      <div className="pt-2">
        
        {/* === THE MATRIX === */}
        {activeTab === 'matrix' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
             <table className="w-full text-sm text-left">
               <thead className="bg-muted/30 border-b border-border text-xs uppercase text-muted-foreground">
                 <tr>
                   <th className="px-6 py-4 font-bold tracking-wider">Workspace</th>
                   <th className="px-6 py-4 font-bold tracking-wider">Plan / Code</th>
                   <th className="px-6 py-4 font-bold tracking-wider text-center">Resend Key</th>
                   <th className="px-6 py-4 font-bold tracking-wider text-center">AI Balance</th>
                   <th className="px-6 py-4 font-bold tracking-wider text-center">Campaigns</th>
                   <th className="px-6 py-4 font-bold tracking-wider text-center">Contacts</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {workspaces.map((ws: any) => (
                   <tr key={ws.id} className="hover:bg-muted/10 transition-colors">
                     <td className="px-6 py-4">
                       <div className="font-medium text-foreground">{ws.name}</div>
                       <div className="text-muted-foreground text-xs">{ws.slug}</div>
                     </td>
                     <td className="px-6 py-4">
                       <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand/10 text-brand">
                         {ws.plan}
                       </div>
                     </td>
                     <td className="px-6 py-4 text-center">
                       {ws.resendApiKey ? (
                         <div className="inline-flex text-green-500"><CheckCircle2 size={16}/></div>
                       ) : (
                         <div className="inline-flex text-zinc-600"><ShieldAlert size={16}/></div>
                       )}
                     </td>
                     <td className="px-6 py-4 text-center font-mono font-medium text-amber-400">
                       {ws.aiCredits}
                     </td>
                     <td className="px-6 py-4 text-center text-muted-foreground font-mono">
                       {ws._count.campaigns}
                     </td>
                     <td className="px-6 py-4 text-center text-muted-foreground font-mono">
                       {ws._count.contacts}
                     </td>
                   </tr>
                 ))}
                 {workspaces.length === 0 && (
                   <tr>
                     <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No beta testers yet.</td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        )}

        {/* === FEEDBACK FEED === */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            {feedback.map((f: any) => (
              <div key={f.id} className="bg-card border border-border p-5 rounded-xl flex gap-5">
                <div className="flex flex-col items-center gap-1 shrink-0 px-2">
                  <div className="text-2xl font-bold font-display text-amber-400">{f.rating / 20}<span className="text-sm text-zinc-600">/5</span></div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                       <Star key={s} size={12} className={s <= (f.rating / 20) ? 'fill-amber-400 text-amber-400' : 'fill-zinc-800 text-zinc-800'} />
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                        {f.feature.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-muted-foreground">·</span>
                      <span className="text-sm font-medium">{f.user.name || f.user.email}</span>
                      <span className="text-sm text-muted-foreground">({f.workspace.name})</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="bg-muted/20 p-4 rounded-xl border border-white/5 text-sm text-zinc-300 leading-relaxed italic">
                    "{f.feedback || 'No written feedback provided.'}"
                  </div>
                </div>
              </div>
            ))}
            {feedback.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border border-border border-dashed rounded-xl">
                 No micro-surveys submitted yet.
              </div>
            )}
          </div>
        )}

        {/* === INVITE CODES === */}
        {activeTab === 'codes' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button 
                onClick={handleGenerateCode}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-brand text-brand-foreground hover:bg-brand/90 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Generate Invite Code</>}
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl xl:overflow-hidden">
               <table className="w-full text-sm text-left">
                 <thead className="bg-muted/30 border-b border-border text-xs uppercase text-muted-foreground">
                   <tr>
                     <th className="px-6 py-4 font-bold tracking-wider">Access Code</th>
                     <th className="px-6 py-4 font-bold tracking-wider text-center">Uses left</th>
                     <th className="px-6 py-4 font-bold tracking-wider">Created</th>
                     <th className="px-6 py-4 font-bold tracking-wider text-right">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                   {inviteCodes.map((c: any) => {
                     const isExhausted = c.currentUses >= c.maxUses;
                     return (
                       <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                         <td className="px-6 py-4">
                           <div className="font-mono font-bold text-foreground text-base tracking-widest">{c.code}</div>
                         </td>
                         <td className="px-6 py-4 text-center">
                           <span className={`font-mono ${isExhausted ? 'text-red-400' : 'text-green-400'}`}>
                             {c.maxUses - c.currentUses}
                           </span>
                           <span className="text-muted-foreground"> / {c.maxUses}</span>
                         </td>
                         <td className="px-6 py-4 text-muted-foreground">
                           {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                         </td>
                         <td className="px-6 py-4 text-right">
                           {isExhausted ? (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500">
                               Exhausted
                             </span>
                           ) : (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500">
                               Active
                             </span>
                           )}
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* === WAITLIST === */}
        {activeTab === 'waitlist' && (
          <div className="space-y-4">
            {waitlist.map((w: any) => {
              const isExpanded = expandedWaitlist === w.id;
              const isPending = w.status === 'PENDING';
              
              return (
                <div key={w.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div 
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/5 transition-colors"
                    onClick={() => setExpandedWaitlist(isExpanded ? null : w.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg ${w.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' : w.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 'bg-brand/10 text-brand'}`}>
                        {w.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-foreground flex items-center gap-2">
                          {w.name} 
                          {w.status === 'APPROVED' && <Check size={14} className="text-green-500" />}
                          {w.status === 'REJECTED' && <X size={14} className="text-red-500" />}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{w.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                       <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                         <Clock size={12} /> {formatDistanceToNow(new Date(w.createdAt), { addSuffix: true })}
                       </div>
                       {isPending && (
                         <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                           <button 
                             disabled={isProcessing === w.id}
                             onClick={() => handleUpdateStatus(w.id, 'REJECTED')}
                             className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                             title="Deny"
                           >
                             {isProcessing === w.id ? <Loader2 size={16} className="animate-spin" /> : <X size={18} />}
                           </button>
                           <button 
                             disabled={isProcessing === w.id}
                             onClick={() => handleUpdateStatus(w.id, 'APPROVED')}
                             className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors border border-green-500/20"
                             title="Approve"
                           >
                              {isProcessing === w.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                           </button>
                         </div>
                       )}
                       {w.status === 'APPROVED' && (
                         <div className="text-xs font-bold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-md">
                           CODE: {w.inviteCode}
                         </div>
                       )}
                       <div className="text-muted-foreground">
                         {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                       </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t border-border"
                      >
                         <div className="p-6 bg-muted/5 space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Why they want access</label>
                              <div className="text-sm text-zinc-300 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5 whitespace-pre-wrap">
                                {w.reason}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Beta Pledge:</label>
                               <span className={`text-[10px] font-bold uppercase ${w.acceptedPledge ? 'text-green-500' : 'text-zinc-600'}`}>
                                 {w.acceptedPledge ? 'Accepted' : 'Declined'}
                               </span>
                            </div>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {waitlist.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border border-border border-dashed rounded-xl">
                 No waitlist applications found.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
