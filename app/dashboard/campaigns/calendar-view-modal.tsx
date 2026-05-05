'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, CheckIcon, EyeIcon, EditIcon, CalendarIcon, PlusIcon, SmartphoneIcon, MonitorIcon, Loader2Icon, CheckCircle2Icon, CircleIcon } from 'lucide-react';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { toggleCampaignApproval, approveAllCampaigns, getCampaignDetail } from './actions';

import { Portal } from '@/components/ui/portal';

export function CalendarViewModal({ 
  isOpen, 
  onClose, 
  calendar 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  calendar: { id: string, name: string, items: any[] } 
}) {
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isPending, startTransition] = useTransition();

  // Optimistic state for approvals
  const [approvedMap, setApprovedMap] = useState<Record<string, boolean>>(
    calendar.items.reduce((acc, item) => ({ ...acc, [item.id]: item.isApproved }), {})
  );

  useEffect(() => {
    if (selectedEmail) {
      setIsLoadingPreview(true);
      getCampaignDetail(selectedEmail.id).then(data => {
        setPreviewData(data);
        setIsLoadingPreview(false);
      }).catch(() => {
        setIsLoadingPreview(false);
      });
    } else {
      setPreviewData(null);
    }
  }, [selectedEmail]);

  if (!isOpen) return null;

  // Find date range
  const dates = calendar.items.map(i => new Date(i.scheduledAt || i.createdAt));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  const startDate = startOfWeek(minDate);
  const endDate = endOfWeek(maxDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleToggleApprove = (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setApprovedMap(prev => ({ ...prev, [id]: newStatus }));
    startTransition(() => {
      toggleCampaignApproval(id, newStatus);
    });
  };

  const handleApproveAll = () => {
    const newMap = { ...approvedMap };
    calendar.items.forEach(item => {
      newMap[item.id] = true;
    });
    setApprovedMap(newMap);
    startTransition(() => {
      approveAllCampaigns(calendar.items.map(i => i.id));
    });
  };

  const allApproved = calendar.items.every(item => approvedMap[item.id]);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex w-full max-w-[1400px] w-[95vw] h-[90vh] overflow-hidden rounded-2xl bg-background shadow-2xl"
        >
          {/* Main Calendar Area */}
          <div className="flex-1 flex flex-col min-w-[600px] overflow-hidden bg-muted/5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-background z-10">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#22C55E]/10 p-2 text-[#22C55E]">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                    {calendar.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {calendar.items.length} emails scheduled
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleApproveAll}
                  disabled={allApproved || isPending}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    allApproved 
                      ? 'bg-green-100 text-green-700 opacity-50 cursor-not-allowed' 
                      : 'bg-[#22C55E] text-white hover:bg-[#16A34A] shadow-sm'
                  }`}
                >
                  <CheckIcon className="h-4 w-4" />
                  {allApproved ? 'All Approved' : 'Approve All'}
                </button>
                {!selectedEmail && (
                  <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
                    <XIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* True Calendar Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
                {/* Days of week header */}
                <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar cells (1px gap for borders) */}
                <div className="grid grid-cols-7 gap-px bg-border">
                  {days.map((day, i) => {
                    const emailsForDay = calendar.items.filter(item => isSameDay(new Date(item.scheduledAt || item.createdAt), day));
                    const isCurrentMonth = day.getMonth() === minDate.getMonth();
                    
                    return (
                      <div 
                        key={i} 
                        className={`min-h-[140px] bg-background p-1.5 flex flex-col transition-colors ${
                          !isCurrentMonth ? 'opacity-50 bg-muted/30' : ''
                        }`}
                      >
                        <div className="text-right text-xs font-medium text-muted-foreground p-1 mb-1">
                          {format(day, 'd')}
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-1.5">
                          {emailsForDay.map(email => {
                            const isApproved = approvedMap[email.id];
                            const isSelected = selectedEmail?.id === email.id;
                            
                            return (
                              <div 
                                key={email.id}
                                onClick={() => setSelectedEmail(email)}
                                className={`group relative flex flex-col gap-1 cursor-pointer rounded-md p-2 text-left transition-all ${
                                  isSelected ? 'ring-2 ring-[#22C55E] ring-offset-1 z-10' : 'hover:ring-1 hover:ring-border'
                                } ${
                                  isApproved 
                                    ? 'bg-green-50 border border-green-200' 
                                    : 'bg-muted/50 border border-transparent hover:bg-muted'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isApproved ? 'text-green-700' : 'text-muted-foreground'}`}>
                                    {email.name.split(' — ')[1] || 'Email'}
                                  </span>
                                  
                                  {/* Minimal Status Indicator */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleApprove(email.id, isApproved);
                                    }}
                                    className="rounded-full hover:bg-black/5 p-0.5 transition-colors"
                                  >
                                    {isApproved ? (
                                      <CheckCircle2Icon className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <CircleIcon className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />
                                    )}
                                  </button>
                                </div>
                                
                                <p className={`text-xs font-medium line-clamp-2 leading-tight ${isApproved ? 'text-green-900' : 'text-foreground'}`}>
                                  {email.subject}
                                </p>
                              </div>
                            );
                          })}

                          {emailsForDay.length === 0 && (
                            <div className="flex flex-1 min-h-[30px] items-center justify-center rounded-md border border-dashed border-border/50 bg-transparent opacity-0 transition-opacity hover:opacity-100 hover:bg-muted/20 cursor-pointer">
                              <PlusIcon className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Slide-over Preview Panel */}
          <AnimatePresence>
            {selectedEmail && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 450, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex flex-col bg-background border-l border-border flex-shrink-0 z-20 absolute right-0 inset-y-0 shadow-2xl lg:static lg:shadow-none"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-background">
                  <h3 className="font-semibold text-sm">Preview</h3>
                  <div className="flex items-center gap-2">
                    {/* Device Toggle */}
                    <div className="flex bg-muted rounded-lg p-0.5">
                      <button 
                        onClick={() => setPreviewDevice('mobile')} 
                        className={`p-1.5 rounded-md transition-colors ${previewDevice === 'mobile' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <SmartphoneIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setPreviewDevice('desktop')} 
                        className={`p-1.5 rounded-md transition-colors ${previewDevice === 'desktop' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <MonitorIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <button onClick={() => setSelectedEmail(null)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                      <XIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto bg-muted/5">
                  {/* Clean Metadata Section */}
                  <div className="p-6 bg-background border-b border-border space-y-5">
                    <div>
                      <h2 className="text-xl font-bold text-foreground leading-snug">
                        {previewData?.subject || selectedEmail.subject}
                      </h2>
                      {previewData?.previewText && (
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          {previewData.previewText}
                        </p>
                      )}
                    </div>
                    
                    {/* Approval Toggle in Preview */}
                    <div className="flex items-center justify-between bg-muted/30 rounded-xl p-3 border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${approvedMap[selectedEmail.id] ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                          <CheckIcon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Ready to send</span>
                      </div>
                      {/* Linear-style Approval Switch */}
                      <button
                        onClick={() => handleToggleApprove(selectedEmail.id, approvedMap[selectedEmail.id])}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          approvedMap[selectedEmail.id] ? 'bg-green-500' : 'bg-muted-foreground/30 hover:bg-muted-foreground/40'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            approvedMap[selectedEmail.id] ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  
                  {/* Iframe Container */}
                  <div className="p-6 flex justify-center">
                    <div 
                      className={`rounded-xl border border-border overflow-hidden bg-white shadow-sm transition-all duration-300 ${
                        previewDevice === 'mobile' ? 'w-[320px]' : 'w-full'
                      }`}
                    >
                      <div className="p-0 relative min-h-[500px] bg-white">
                        {isLoadingPreview ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
                            <Loader2Icon className="h-6 w-6 animate-spin mb-2" />
                            <span className="text-xs font-medium">Loading preview...</span>
                          </div>
                        ) : (
                          <iframe 
                            srcDoc={previewData?.htmlBody || ''} 
                            className="w-full h-[600px] border-0"
                            title="Email Preview"
                            sandbox="allow-same-origin"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-border p-4 bg-background">
                  <Link
                    href={`/dashboard/campaigns/${selectedEmail.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#22C55E] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#16A34A] shadow-sm"
                  >
                    <EditIcon className="h-4 w-4" />
                    Edit in Builder
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </Portal>
  );
}
