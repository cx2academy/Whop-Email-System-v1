'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, RefreshCw, CheckCircle2, Clock, 
  AlertCircle, ExternalLink, Copy, ChevronDown, ChevronUp, 
  Globe, Loader2, Search, Zap, Check, ShieldCheck, X
} from 'lucide-react';
import { addDomain, getDomains, verifyDomain, deleteDomain } from './actions';
import { checkDomainAvailability } from '@/lib/domains/actions';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function DomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'connect' | 'search'>('connect');

  // Connect State
  const [isAdding, setIsAdding] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  // Search State
  const [domainSearch, setDomainSearch] = useState('');
  const [domainStatus, setDomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [domainPrice, setDomainPrice] = useState('$13.95/yr');

  useEffect(() => {
    loadDomains();
  }, []);

  async function handleDomainCheck() {
    if (!domainSearch) return;
    setDomainStatus('checking');
    try {
      const res = await checkDomainAvailability(domainSearch);
      if (res.available) {
        setDomainStatus('available');
        setDomainPrice(res.price || '$13.95/yr');
      } else {
        setDomainStatus('taken');
      }
    } catch {
      toast.error('Failed to check domain.');
      setDomainStatus('idle');
    }
  }

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
        setIsModalOpen(false); // Close modal on success
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
      style: { borderRadius: '10px', background: '#1A1A1A', color: '#fff', fontSize: '12px' },
    });
  };

  const verifiedCount = domains.filter(d => d.resendStatus === 'verified').length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Sending Domains</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
             Manage and verify domains for high deliverability. 
             <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-foreground">
               <ShieldCheck className="h-3 w-3 text-primary" />
               {verifiedCount} / {domains.length} Verified
             </span>
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-sm shrink-0 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </button>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary/60" />
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-24 bg-card border border-dashed border-border rounded-3xl">
            <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-foreground font-bold mb-2">No custom domains yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              You need a custom domain to send emails. Add your existing domain or buy a new one to get started.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:opacity-90 inline-flex items-center gap-2 transition-all"
            >
              <Plus className="h-4 w-4" /> Add Domain
            </button>
          </div>
        ) : (
          domains.map((domain) => (
            <div 
              key={domain.id}
              className={`bg-card border transition-all rounded-2xl overflow-hidden ${expandedDomain === domain.id ? 'border-primary/30 ring-1 ring-primary/20 shadow-card-md' : 'border-border hover:border-primary/20'}`}
            >
              <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${domain.resendStatus === 'verified' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-yellow-500/10 text-yellow-600'}`}>
                    {domain.resendStatus === 'verified' ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground text-lg truncate">{domain.domain}</h3>
                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                      {domain.resendStatus === 'verified' ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded border border-[#22C55E]/20">
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-yellow-600 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                          Pending DNS Setup
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded border border-border">
                        ID: {domain.resendDomainId.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedDomain(expandedDomain === domain.id ? null : domain.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${expandedDomain === domain.id ? 'bg-secondary text-foreground border border-border' : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'}`}
                  >
                    {expandedDomain === domain.id ? 'Hide DNS' : 'View DNS'}
                    {expandedDomain === domain.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <div className="h-6 w-px bg-border mx-1" />
                  <button
                    onClick={() => handleVerify(domain.id)}
                    className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20"
                    title="Refresh status"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(domain.id)}
                    className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all border border-transparent hover:border-destructive/20"
                    title="Delete domain"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* DNS Records Expandable Section */}
              <AnimatePresence>
                {expandedDomain === domain.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border bg-secondary/20"
                  >
                    <div className="p-8 space-y-6">
                      <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                          <AlertCircle className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground mb-1">Update your DNS records</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Log in to your domain registrar (e.g. NameSilo, GoDaddy) and add these records to your DNS settings. 
                            If you purchased your domain through RevTray (NameSilo), <a href="https://www.namesilo.com/login" target="_blank" rel="noreferrer" className="text-primary hover:underline">login to your NameSilo account here</a>.
                          </p>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-secondary/50 border-b border-border">
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Content/Value</th>
                              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {domain.resendDnsRecords?.map((record: any, idx: number) => (
                              <tr key={idx} className="group hover:bg-secondary/30 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono font-bold text-muted-foreground border border-border">
                                    {record.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <code className="text-[11px] text-foreground font-mono break-all">{record.name}</code>
                                    <button onClick={() => copyToClipboard(record.name)} className="p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"><Copy className="h-3 w-3 text-muted-foreground" /></button>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <code className="text-[11px] text-foreground font-mono break-all max-w-[200px] md:max-w-none">{record.value}</code>
                                    <button onClick={() => copyToClipboard(record.value)} className="p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"><Copy className="h-3 w-3 text-muted-foreground" /></button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {record.status === 'verified' ? (
                                    <span className="text-[10px] font-bold text-[#22C55E] flex items-center justify-end gap-1"><CheckCircle2 className="h-3 w-3" /> OK</span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-yellow-600 flex items-center justify-end gap-1"><Clock className="h-3 w-3" /> Pending</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleVerify(domain.id)}
                          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80 border border-border transition-all shadow-sm"
                        >
                          Verify Records Now
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

      {/* Add Domain Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-card">
                <h3 className="font-bold text-foreground">Add Sending Domain</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 -mr-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="flex p-1 bg-secondary rounded-xl mb-6">
                  <button 
                    onClick={() => setModalTab('connect')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${modalTab === 'connect' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    I own a domain
                  </button>
                  <button 
                    onClick={() => setModalTab('search')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${modalTab === 'search' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Register new domain
                  </button>
                </div>

                {modalTab === 'connect' ? (
                  <div className="space-y-4">
                    <div className="bg-secondary/30 rounded-xl p-5 border border-border">
                      <h4 className="text-sm font-bold text-foreground mb-1">Connect Existing Domain</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        We highly recommend using a subdomain (e.g. <code className="bg-secondary px-1 py-0.5 rounded text-foreground font-mono">mail.yourdomain.com</code>) entirely dedicated to RevTray to protect your root domain's reputation.
                      </p>
                      
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, ''))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                          placeholder="mail.example.com"
                          className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={handleAddDomain}
                      disabled={isAdding || !newDomain}
                      className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect Domain'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-secondary/30 rounded-xl p-5 border border-border">
                      <h4 className="text-sm font-bold text-foreground mb-1">Find a Clean Domain</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        Search NameSilo for a fresh domain to use exclusively for cold email.
                      </p>
                      
                      <div className="relative flex items-center">
                        <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
                        <input
                          type="text"
                          value={domainSearch}
                          onChange={(e) => {
                            setDomainSearch(e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, ''));
                            setDomainStatus('idle');
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleDomainCheck()}
                          placeholder="alpha-agency-mail.com"
                          className="w-full bg-background border border-border rounded-xl pl-12 pr-28 py-3.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                        />
                        <div className="absolute right-1.5">
                          <button
                            onClick={handleDomainCheck}
                            disabled={domainStatus === 'checking' || !domainSearch}
                            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center"
                          >
                            {domainStatus === 'checking' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Check'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {domainStatus === 'taken' && (
                        <motion.div 
                          key="taken"
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive text-xs font-medium flex items-center gap-2"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0" /> 
                          That domain is already registered. Try another variation.
                        </motion.div>
                      )}

                      {domainStatus === 'available' && (
                        <motion.div 
                          key="available"
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 text-[#22C55E] text-xs font-bold uppercase tracking-wider mb-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Available Now
                              </div>
                              <div className="font-mono text-foreground font-bold">{domainSearch}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-foreground">{domainPrice}</span>
                              <a
                                href={`https://www.namesilo.com/domain/search-results?query=${domainSearch}&rid=9b15194xx`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#22C55E] text-white text-xs font-bold hover:opacity-90 transition-all whitespace-nowrap shadow-sm"
                              >
                                Buy <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </div>
                          <p className="text-center text-[10px] text-muted-foreground mt-3">
                            After purchasing on NameSilo, return to the "I own a domain" tab to connect it.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
