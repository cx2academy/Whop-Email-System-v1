'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronDown, ChevronUp, Code } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface WebhookLog {
  id: string;
  action: string;
  status: number;
  errorMessage: string | null;
  payload: any;
  createdAt: Date | string;
  workspace: { name: string };
}

export function WebhookInspector({ logs }: { logs: WebhookLog[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No webhooks recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const isExpanded = expandedId === log.id;
        
        return (
          <div 
            key={log.id} 
            className={cn(
              "rounded-lg border border-border/50 transition-all overflow-hidden",
              isExpanded ? "bg-muted/50" : "bg-muted/20 hover:bg-muted/30"
            )}
          >
            <div 
              className="flex items-start justify-between p-3 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={log.status === 200 ? 'default' : 'destructive'} className="text-[10px] uppercase">
                    {log.action}
                  </Badge>
                  <span className="text-xs font-medium">{log.workspace.name}</span>
                </div>
                {log.errorMessage && (
                  <p className="text-[10px] text-destructive font-mono">{log.errorMessage}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>

            {isExpanded && (
              <div className="p-3 pt-0 border-t border-border/50 bg-black/20">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <Code className="h-3 w-3" />
                  Raw Payload
                </div>
                <pre className="text-[10px] font-mono p-3 rounded bg-black/40 overflow-x-auto text-zinc-400 max-h-[300px]">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
