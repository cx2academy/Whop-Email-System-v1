'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, ChevronRightIcon, LayersIcon, CalendarIcon } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import type { CampaignStatus } from '@prisma/client';
import { CalendarViewModal } from './calendar-view-modal';

const STATUS_BADGE: Record<CampaignStatus, string> = {
  DRAFT: 'badge-draft', SCHEDULED: 'badge-scheduled', SENDING: 'badge-sending',
  COMPLETED: 'badge-completed', FAILED: 'badge-failed', PAUSED: 'badge-paused',
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: 'Draft', SCHEDULED: 'Scheduled', SENDING: 'Sending',
  COMPLETED: 'Sent', FAILED: 'Failed', PAUSED: 'Paused',
};

type Campaign = any;

export function CampaignsTable({ campaigns }: { campaigns: Campaign[] }) {
  const [expandedSequences, setExpandedSequences] = useState<Record<string, boolean>>({});
  const [selectedCalendar, setSelectedCalendar] = useState<{ id: string, name: string, items: Campaign[] } | null>(null);

  const toggleSequence = (sequenceId: string, isCalendar: boolean, s: any) => {
    if (isCalendar) {
      setSelectedCalendar({ id: s.id, name: s.name, items: s.items });
    } else {
      setExpandedSequences(prev => ({ ...prev, [sequenceId]: !prev[sequenceId] }));
    }
  };

  // Group campaigns
  const standalone: Campaign[] = [];
  const sequences: Record<string, Campaign[]> = {};

  campaigns.forEach(c => {
    if (c.sequenceId) {
      if (!sequences[c.sequenceId]) sequences[c.sequenceId] = [];
      sequences[c.sequenceId].push(c);
    } else {
      standalone.push(c);
    }
  });

  // Sort sequences by the earliest created campaign
  const sequenceGroups = Object.entries(sequences).map(([id, items]) => {
    items.sort((a, b) => new Date(a.scheduledAt || a.createdAt).getTime() - new Date(b.scheduledAt || b.createdAt).getTime());
    const isCalendar = items.some(i => i.name.includes('Day '));
    return {
      id,
      items,
      createdAt: items[0].createdAt,
      name: items[0].name.split(' — ')[0] || (isCalendar ? 'Calendar' : 'Sequence'),
      isCalendar,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Combine standalone and sequences for sorting
  const allRows: any[] = [];
  
  const allItems = [
    ...standalone.map(c => ({ type: 'single', date: new Date(c.createdAt).getTime(), data: c })),
    ...sequenceGroups.map(s => ({ type: 'sequence', date: new Date(s.createdAt).getTime(), data: s }))
  ].sort((a, b) => b.date - a.date);

  return (
    <>
      <div className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}>
        <table className="w-full text-sm">
          <thead style={{ borderBottom: '1px solid var(--sidebar-border)', background: 'var(--surface-app)' }}>
            <tr>
              {['Campaign', 'Status', 'Sent', 'Open rate', 'Click rate', 'Date'].map((h, i) => (
                <th key={h}
                  className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}
                  style={{ color: 'var(--text-tertiary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allItems.map((item, i) => {
              if (item.type === 'single') {
                const c = item.data;
                const openRate  = c.totalSent > 0 ? ((c.totalOpened  / c.totalSent) * 100).toFixed(1) : null;
                const clickRate = c.totalSent > 0 ? ((c.totalClicked / c.totalSent) * 100).toFixed(1) : null;
                const date      = c.sentAt ?? c.scheduledAt ?? c.createdAt;
                const status    = c.status as CampaignStatus;
                return (
                  <tr key={c.id} className="group transition-colors hover:bg-[#F7F8FA]"
                    style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}>
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/campaigns/${c.id}`}
                        className="font-medium transition-colors group-hover:text-[#16A34A]"
                        style={{ color: 'var(--text-primary)' }}>
                        {c.name}
                      </Link>
                      <p className="text-xs mt-0.5 max-w-[220px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {c.subject}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[status] ?? ''}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {c.totalSent > 0 ? formatNumber(c.totalSent) : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-medium"
                        style={{ color: openRate !== null && Number(openRate) >= 20 ? '#16A34A' : 'var(--text-secondary)' }}>
                        {openRate !== null ? `${openRate}%` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {clickRate !== null ? `${clickRate}%` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {formatDate(date)}
                    </td>
                  </tr>
                );
              } else {
                const s = item.data;
                const isExpanded = expandedSequences[s.id];
                const totalSent = s.items.reduce((acc: number, c: any) => acc + c.totalSent, 0);
                const totalOpened = s.items.reduce((acc: number, c: any) => acc + c.totalOpened, 0);
                const totalClicked = s.items.reduce((acc: number, c: any) => acc + c.totalClicked, 0);
                
                const openRate  = totalSent > 0 ? ((totalOpened  / totalSent) * 100).toFixed(1) : null;
                const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : null;
                const date = s.createdAt;

                return (
                  <React.Fragment key={s.id}>
                    <tr 
                      className="group transition-colors hover:bg-[#F7F8FA] cursor-pointer"
                      onClick={() => toggleSequence(s.id, s.isCalendar, s)}
                      style={{ borderTop: i > 0 ? '1px solid var(--sidebar-border)' : undefined }}
                    >
                      <td className="px-5 py-4 flex items-center gap-2">
                        {!s.isCalendar && (isExpanded ? <ChevronDownIcon className="h-4 w-4 text-gray-400" /> : <ChevronRightIcon className="h-4 w-4 text-gray-400" />)}
                        {s.isCalendar && <div className="w-4" />}
                        <div>
                          <div className="flex items-center gap-2">
                            {s.isCalendar ? (
                              <CalendarIcon className="h-4 w-4 text-[#22C55E]" />
                            ) : (
                              <LayersIcon className="h-4 w-4 text-indigo-500" />
                            )}
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {s.name}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                            {s.isCalendar ? 'Calendar' : 'Sequence'} • {s.items.length} emails
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {s.isCalendar ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-green-50 text-green-700">
                            Calendar
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                            Sequence
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {totalSent > 0 ? formatNumber(totalSent) : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-medium"
                          style={{ color: openRate !== null && Number(openRate) >= 20 ? '#16A34A' : 'var(--text-secondary)' }}>
                          {openRate !== null ? `${openRate}%` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {clickRate !== null ? `${clickRate}%` : '—'}
                      </td>
                      <td className="px-4 py-4 text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {formatDate(date)}
                      </td>
                    </tr>
                    {isExpanded && !s.isCalendar && s.items.map((c: any, j: number) => {
                      const cOpenRate  = c.totalSent > 0 ? ((c.totalOpened  / c.totalSent) * 100).toFixed(1) : null;
                      const cClickRate = c.totalSent > 0 ? ((c.totalClicked / c.totalSent) * 100).toFixed(1) : null;
                      const cDate      = c.sentAt ?? c.scheduledAt ?? c.createdAt;
                      const status    = c.status as CampaignStatus;
                      return (
                        <tr key={c.id} className="group transition-colors bg-gray-50/50 hover:bg-gray-50">
                          <td className="px-5 py-3 pl-12">
                            <Link href={`/dashboard/campaigns/${c.id}`}
                              className="font-medium transition-colors group-hover:text-[#16A34A] text-sm"
                              style={{ color: 'var(--text-primary)' }}>
                              {c.name.split(' — ')[1] || c.name}
                            </Link>
                            <p className="text-xs mt-0.5 max-w-[220px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                              {c.subject}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[status] ?? ''}`}>
                              {STATUS_LABEL[status]}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {c.totalSent > 0 ? formatNumber(c.totalSent) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="text-xs font-medium"
                              style={{ color: cOpenRate !== null && Number(cOpenRate) >= 20 ? '#16A34A' : 'var(--text-secondary)' }}>
                              {cOpenRate !== null ? `${cOpenRate}%` : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {cClickRate !== null ? `${cClickRate}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {formatDate(cDate)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              }
            })}
          </tbody>
        </table>
      </div>

      {selectedCalendar && (
        <CalendarViewModal 
          isOpen={!!selectedCalendar} 
          onClose={() => setSelectedCalendar(null)} 
          calendar={selectedCalendar} 
        />
      )}
    </>
  );
}
