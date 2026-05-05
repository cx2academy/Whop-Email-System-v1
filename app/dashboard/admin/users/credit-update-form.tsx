'use client';

import { useState } from 'react';
import { updateWorkspaceCredits } from '@/lib/admin/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckIcon, Edit2Icon } from 'lucide-react';

export function CreditUpdateForm({ workspaceId, currentCredits }: { workspaceId: string; currentCredits: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentCredits.toString());
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await updateWorkspaceCredits(workspaceId, parseInt(value));
      setIsEditing(false);
    } catch (err) {
      alert('Failed to update credits');
    } finally {
      setLoading(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 group">
        <span className="font-mono">{currentCredits}</span>
        <button 
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all"
        >
          <Edit2Icon className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input 
        type="number" 
        value={value} 
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-16 px-1 text-xs"
      />
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-7 w-7 text-green-600"
        onClick={handleSubmit}
        disabled={loading}
      >
        <CheckIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
