/**
 * lib/segmentation/segment-engine.ts
 *
 * Evaluates segment rules against the workspace's contacts.
 *
 * Rule format:
 * {
 *   operator: 'AND' | 'OR',
 *   conditions: SegmentCondition[]
 * }
 *
 * Returns an array of matching contactIds.
 * Designed to be efficient — uses targeted DB queries rather than loading all contacts.
 */

import { db } from '@/lib/db/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConditionField =
  | 'tag'
  | 'status'
  | 'createdAt'
  | 'lastOpened'
  | 'lastClicked'
  | 'opensCount'
  | 'emailsSent'
  | 'whopStatus'
  | 'whopPasses';

export type ConditionOp = 'eq' | 'not_eq' | 'has' | 'not_has' | 'gt' | 'lt' | 'within_days' | 'older_than_days' | 'never';

export interface SegmentCondition {
  field: ConditionField;
  op: ConditionOp;
  value?: string | number;
}

export interface SegmentRules {
  operator: 'AND' | 'OR';
  conditions: SegmentCondition[];
}

// ---------------------------------------------------------------------------
// Main evaluator
// ---------------------------------------------------------------------------

export async function evaluateSegment(
  workspaceId: string,
  rules: SegmentRules
): Promise<string[]> {
  if (!rules.conditions || rules.conditions.length === 0) {
    // No rules — return all subscribed contacts
    const all = await db.contact.findMany({
      where: { workspaceId, status: 'SUBSCRIBED' },
      select: { id: true },
    });
    return all.map((c) => c.id);
  }

  // Evaluate each condition to a Set of contactIds
  const sets: Set<string>[] = await Promise.all(
    rules.conditions.map((cond) => evaluateCondition(workspaceId, cond))
  );

  if (sets.length === 0) return [];

  // Combine with AND (intersection) or OR (union)
  if (rules.operator === 'AND') {
    return intersectAll(sets);
  } else {
    return unionAll(sets);
  }
}

// ---------------------------------------------------------------------------
// Individual condition evaluators
// ---------------------------------------------------------------------------

async function evaluateCondition(
  workspaceId: string,
  cond: SegmentCondition
): Promise<Set<string>> {
  const now = new Date();

  switch (cond.field) {
    case 'status': {
      const contacts = await db.contact.findMany({
        where: { workspaceId, status: String(cond.value) as any },
        select: { id: true },
      });
      return new Set(contacts.map((c) => c.id));
    }

    case 'whopStatus': {
      const contacts = await db.contact.findMany({
        where: { 
          workspaceId, 
          status: 'SUBSCRIBED',
          whopStatus: cond.op === 'eq' ? String(cond.value) : { not: String(cond.value) }
        },
        select: { id: true },
      });
      return new Set(contacts.map((c) => c.id));
    }

    case 'whopPasses': {
      const contacts = await db.contact.findMany({
        where: { 
          workspaceId, 
          status: 'SUBSCRIBED',
          whopPasses: cond.op === 'has' ? { has: String(cond.value) } : undefined
        },
        select: { id: true, whopPasses: true },
      });
      
      if (cond.op === 'not_has') {
        const value = String(cond.value);
        return new Set(contacts.filter(c => !c.whopPasses.includes(value)).map(c => c.id));
      }
      
      return new Set(contacts.map((c) => c.id));
    }

    case 'tag': {
      const tag = await db.tag.findUnique({
        where: { workspaceId_name: { workspaceId, name: String(cond.value) } },
      });
      if (!tag) return new Set();

      if (cond.op === 'has') {
        const ct = await db.contactTag.findMany({
          where: { tagId: tag.id },
          select: { contactId: true },
        });
        return new Set(ct.map((x) => x.contactId));
      } else {
        // not_has — all subscribed contacts minus those with the tag
        const [all, tagged] = await Promise.all([
          db.contact.findMany({ where: { workspaceId, status: 'SUBSCRIBED' }, select: { id: true } }),
          db.contactTag.findMany({ where: { tagId: tag.id }, select: { contactId: true } }),
        ]);
        const taggedSet = new Set(tagged.map((x) => x.contactId));
        return new Set(all.map((c) => c.id).filter((id) => !taggedSet.has(id)));
      }
    }

    case 'createdAt': {
      const days = Number(cond.value) || 30;
      const cutoff = new Date(now.getTime() - days * 86400000);
      let where: any = { workspaceId, status: 'SUBSCRIBED' };
      if (cond.op === 'within_days') where.createdAt = { gte: cutoff };
      else if (cond.op === 'older_than_days') where.createdAt = { lt: cutoff };

      const contacts = await db.contact.findMany({ where, select: { id: true } });
      return new Set(contacts.map((c) => c.id));
    }

    case 'lastOpened': {
      const days = Number(cond.value) || 30;
      const cutoff = new Date(now.getTime() - days * 86400000);

      if (cond.op === 'never') {
        // Contacts who have never opened any email
        const opened = await db.emailSend.findMany({
          where: { workspaceId, openedAt: { not: null } },
          select: { contactId: true },
          distinct: ['contactId'],
        });
        const openedSet = new Set(opened.map((x) => x.contactId));
        const all = await db.contact.findMany({ where: { workspaceId, status: 'SUBSCRIBED' }, select: { id: true } });
        return new Set(all.map((c) => c.id).filter((id) => !openedSet.has(id)));
      }

      const sends = await db.emailSend.findMany({
        where: {
          workspaceId,
          openedAt: cond.op === 'within_days' ? { gte: cutoff } : { lt: cutoff },
        },
        select: { contactId: true },
        distinct: ['contactId'],
      });
      return new Set(sends.map((x) => x.contactId));
    }

    case 'lastClicked': {
      const days = Number(cond.value) || 30;
      const cutoff = new Date(now.getTime() - days * 86400000);

      if (cond.op === 'never') {
        const clicked = await db.emailSend.findMany({
          where: { workspaceId, clickedAt: { not: null } },
          select: { contactId: true },
          distinct: ['contactId'],
        });
        const clickedSet = new Set(clicked.map((x) => x.contactId));
        const all = await db.contact.findMany({ where: { workspaceId, status: 'SUBSCRIBED' }, select: { id: true } });
        return new Set(all.map((c) => c.id).filter((id) => !clickedSet.has(id)));
      }

      const sends = await db.emailSend.findMany({
        where: {
          workspaceId,
          clickedAt: cond.op === 'within_days' ? { gte: cutoff } : { lt: cutoff },
        },
        select: { contactId: true },
        distinct: ['contactId'],
      });
      return new Set(sends.map((x) => x.contactId));
    }

    case 'opensCount': {
      const threshold = Number(cond.value) || 0;
      // Group by contactId and count opens
      const grouped = await db.emailSend.groupBy({
        by: ['contactId'],
        where: { workspaceId, openedAt: { not: null } },
        _count: { _all: true },
      });
      return new Set(
        grouped
          .filter((g) => cond.op === 'gt' ? g._count._all > threshold : g._count._all < threshold)
          .map((g) => g.contactId)
      );
    }

    case 'emailsSent': {
      const threshold = Number(cond.value) || 0;
      const grouped = await db.emailSend.groupBy({
        by: ['contactId'],
        where: { workspaceId },
        _count: { _all: true },
      });
      return new Set(
        grouped
          .filter((g) => cond.op === 'gt' ? g._count._all > threshold : g._count._all < threshold)
          .map((g) => g.contactId)
      );
    }

    default:
      return new Set();
  }
}

// ---------------------------------------------------------------------------
// Set helpers
// ---------------------------------------------------------------------------

function intersectAll(sets: Set<string>[]): string[] {
  if (sets.length === 0) return [];
  let result = sets[0];
  for (let i = 1; i < sets.length; i++) {
    result = new Set([...result].filter((id) => sets[i].has(id)));
  }
  return [...result];
}

function unionAll(sets: Set<string>[]): string[] {
  const result = new Set<string>();
  for (const s of sets) s.forEach((id) => result.add(id));
  return [...result];
}

// ---------------------------------------------------------------------------
// Resolve contacts for a list of segmentIds (used by send engine)
// ---------------------------------------------------------------------------

export async function resolveSegmentContacts(
  workspaceId: string,
  segmentIds: string[]
): Promise<string[]> {
  if (segmentIds.length === 0) return [];

  const segments = await db.segment.findMany({
    where: { id: { in: segmentIds }, workspaceId },
  });

  const allIds = new Set<string>();
  for (const seg of segments) {
    let rules: SegmentRules;
    try {
      rules = JSON.parse(seg.rules) as SegmentRules;
    } catch {
      continue;
    }
    const ids = await evaluateSegment(workspaceId, rules);
    ids.forEach((id) => allIds.add(id));

    // Update cached count
    await db.segment.update({
      where: { id: seg.id },
      data: { contactCount: ids.length, lastEvaluatedAt: new Date() },
    });
  }

  return [...allIds];
}
