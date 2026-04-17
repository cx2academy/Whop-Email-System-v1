'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  Globe
} from 'lucide-react';
import { addDomain, getDomains, verifyDomain, deleteDomain } from './actions';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function DomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, []);

  async function loadDomains() {
    setIsLoading(true);
    try {
      const data = await getDomains();
      setDomains(data);
    } catch (error) {
      toast.error('Failed to load domains');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddDomain() {
    if (!newDomain) return;
    
    // Simple domain validation regex
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
    if (!domainRegex.test(newDomain)) {
      toast.error('Please enter a valid domain (e.g. mail.example.com)');
      return;
    }

    setIsAdding(true);
    try {
      const result = await addDomain(newDomain);
      if (result.success) {
        toast.success('Domain added! Please configure DNS.');
        setNewDomain('');
        loadDomains();
        setExpandedDomain(result.domain?.id || null);
      } else {
        toast.error(result.error || 'Failed to add domain');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleVerify(id: string) {
    toast.promise(verifyDomain(id), {
      loading: 'Verifying DNS records...',
      success: (res) => {
        if (res.success) {
          loadDomains();
          return res.status === 'verified' ? 'Domain verified!' : 'DNS records not yet propagated.';
        }
        throw new Error(res.error);
      },
      error: (err) => err.message || 'Verification failed',
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this domain? This will stop all emails sent from this domain.')) return;
    try {
      const result = await deleteDomain(id);
      if (result.success) {
        toast.success('Domain deleted');
        loadDomains();
      } else {
        toast.error(result.error || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard', {
      icon: '📋',
      style: {
        borderRadius: '10px',
        background: '#1A1A1A',
        color: '#fff',
        fontSize: '12px',
      },
    });
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
            Deliverability
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-3">
            Sending Domains
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Verify your domains to improve deliverability, protect your sender reputation, and remove the &quot;via resend.com&quot; notice from your emails.
          </p>
        </div>
        
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="text-right">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</div>
            <div className="text-xs font-medium text-foreground">
              {domains.filter(d => d.resendStatus === 'verified').length} / {domains.length} Verified
            </div>
          </div>
          <div className="h-8 w-px bg-border" />
          <Globe className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Add Domain Form */}
      <div className="bg-card border border-border rounded-2xl p-8 shadow-card-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
          <Globe className="h-32 w-32" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Connect a new domain
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                placeholder="e.g. mail.yourdomain.com"
                className="w-full bg-secondary/50 border border-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
            <button
              onClick={handleAddDomain}
              disabled={isAdding || !newDomain}
              className="bg-primary text-primary-foreground px-8 py-3.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {isAdding ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Domain
            </button>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground italic">
            Tip: We recommend using a subdomain like <code className="text-foreground/80 font-mono">mail.yourdomain.com</code> for better isolation.
          </p>
        </div>
      </div>

      {/* Domains List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <RefreshCw className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-mono tracking-widest uppercase">Initializing...</p>
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-foreground font-bold mb-2">No custom domains yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Add your first sending domain above to start building your sender reputation.
            </p>
          </div>
        ) : (
          domains.map((domain) => (
            <div 
              key={domain.id}
              className={`bg-card border transition-all rounded-2xl overflow-hidden ${expandedDomain === domain.id ? 'border-primary/30 ring-1 ring-primary/20 shadow-card-md' : 'border-border hover:border-primary/20'}`}
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${domain.resendStatus === 'verified' ? 'bg-primary/10 text-primary' : 'bg-yellow-500/10 text-yellow-600'}`}>
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{domain.domain}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      {domain.resendStatus === 'verified' ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                          <CheckCircle2 className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-yellow-600 bg-yellow-500/5 px-2 py-0.5 rounded-md border border-yellow-500/10">
                          <Clock className="h-3 w-3" /> Pending DNS
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ID: {domain.resendDomainId.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedDomain(expandedDomain === domain.id ? null : domain.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${expandedDomain === domain.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                  >
                    {expandedDomain === domain.id ? 'Hide DNS' : 'View DNS'}
                    {expandedDomain === domain.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <div className="h-8 w-px bg-border mx-1" />
                  <button
                    onClick={() => handleVerify(domain.id)}
                    className="p-2.5 rounded-xl bg-secondary hover:bg-primary/10 text-primary transition-all border border-border"
                    title="Refresh status"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(domain.id)}
                    className="p-2.5 rounded-xl bg-secondary hover:bg-destructive/10 text-destructive transition-all border border-border"
                    title="Delete domain"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedDomain === domain.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border bg-secondary/30"
                  >
                    <div className="p-8 space-y-8">
                      <div className="flex items-start gap-4 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                          <AlertCircle className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-blue-700 mb-1">DNS Configuration Required</h4>
                          <p className="text-xs text-blue-600/80 leading-relaxed">
                            Add the following records to your domain provider (GoDaddy, Cloudflare, etc.). 
                            Verification can take up to 48 hours, but usually happens within minutes.
                          </p>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-border bg-card">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-secondary/50 border-b border-border">
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Host / Name</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Value / Points to</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {domain.resendDnsRecords?.map((record: any, idx: number) => (
                              <tr key={idx} className="group hover:bg-secondary/20 transition-colors">
                                <td className="px-4 py-4">
                                  <span className="px-2 py-1 rounded bg-secondary text-[10px] font-mono font-bold text-muted-foreground border border-border">
                                    {record.type}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs text-foreground font-mono break-all max-w-[150px] md:max-w-none">{record.name}</code>
                                    <button 
                                      onClick={() => copyToClipboard(record.name)}
                                      className="p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                      <Copy className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs text-foreground font-mono break-all max-w-[200px] md:max-w-none">{record.value}</code>
                                    <button 
                                      onClick={() => copyToClipboard(record.value)}
                                      className="p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                      <Copy className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  {record.status === 'verified' ? (
                                    <span className="text-[10px] font-bold text-primary flex items-center justify-end gap-1">
                                      <CheckCircle2 className="h-3 w-3" /> Verified
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-muted-foreground flex items-center justify-end gap-1">
                                      <Clock className="h-3 w-3" /> Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Need help? Check our <a href="#" className="text-primary hover:underline">DNS setup guide</a>.</span>
                        </div>
                        <button
                          onClick={() => handleVerify(domain.id)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all border border-primary/20"
                        >
                          I&apos;ve added these records, check now <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
