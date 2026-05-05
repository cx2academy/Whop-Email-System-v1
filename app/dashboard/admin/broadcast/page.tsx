'use client';

import React, { useState, useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { broadcastNotification } from '@/lib/admin/actions';
import { MegaphoneIcon, Loader2Icon, CheckCircle2Icon } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBroadcastPage() {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<{ count: number } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    actionUrl: '',
    audience: 'ALL' as 'ALL' | 'FREE_ONLY' | 'PAID_ONLY' | 'SPECIFIC_WORKSPACE',
    specificWorkspaceId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);

    if (!formData.title || !formData.message) {
      toast.error('Title and message are required.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await broadcastNotification(formData);
        if (result.success) {
          setSuccess({ count: result.count });
          setFormData({
            title: '',
            message: '',
            actionUrl: '',
            audience: 'ALL',
            specificWorkspaceId: '',
          });
          toast.success(`Successfully broadcasted to ${result.count} workspaces!`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Broadcast failed');
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-8">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center">
          <MegaphoneIcon className="h-5 w-5 text-brand" />
        </div>
        <div>
          <h2 className="text-xl font-bold">System Broadcast</h2>
          <p className="text-sm text-muted-foreground">Send an internal notification to your users.</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience</Label>
            <Select 
              value={formData.audience} 
              onValueChange={(val: any) => setFormData({...formData, audience: val})}
            >
              <SelectTrigger id="audience">
                <SelectValue placeholder="Select who receives this" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Workspaces</SelectItem>
                <SelectItem value="FREE_ONLY">Free Plan Only</SelectItem>
                <SelectItem value="PAID_ONLY">Paid Plans Only</SelectItem>
                <SelectItem value="SPECIFIC_WORKSPACE">Specific Workspace ID</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.audience === 'SPECIFIC_WORKSPACE' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <Label htmlFor="workspaceId">Workspace ID</Label>
              <Input 
                id="workspaceId"
                placeholder="ws_xxxx..."
                value={formData.specificWorkspaceId}
                onChange={(e) => setFormData({...formData, specificWorkspaceId: e.target.value})}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Notification Title</Label>
            <Input 
              id="title"
              placeholder="e.g. New Feature Released!"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message History</Label>
            <Textarea 
              id="message"
              placeholder="Keep it brief and actionable..."
              className="min-h-[100px]"
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="actionUrl">Action URL (Optional)</Label>
            <Input 
              id="actionUrl"
              placeholder="/dashboard/campaigns (relative or absolute)"
              value={formData.actionUrl}
              onChange={(e) => setFormData({...formData, actionUrl: e.target.value})}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-brand" 
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Sending Broadcast...
              </>
            ) : (
              'Send Notification Blast'
            )}
          </Button>

          {success && (
            <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3 text-green-700 animate-in zoom-in-95">
              <CheckCircle2Icon className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">Broadcast sent to {success.count} workspaces successfully.</p>
            </div>
          )}
        </form>
      </Card>

      <div className="p-4 bg-zinc-50 border rounded-lg text-xs text-zinc-500">
        <strong>Note:</strong> Broadcasts are sent as SYSTEM type notifications. 
        They will appear in the user's notification bell and history page immediately. 
        This action is irreversible.
      </div>
    </div>
  );
}
