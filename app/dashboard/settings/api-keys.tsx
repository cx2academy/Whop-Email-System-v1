'use client';

/**
 * app/dashboard/settings/api-keys.tsx
 *
 * API key management UI.
 * Lists existing keys (masked), creates new ones, revokes them.
 * Full key is shown exactly once after creation — never again.
 */

import { useState, useTransition } from 'react';

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiKeysProps {
  initialKeys: ApiKeyRow[];
}

export function ApiKeys({ initialKeys }: ApiKeysProps) {
  const [keys, setKeys] = useState<ApiKeyRow[]>(initialKeys);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null); // shown once
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!newKeyName.trim()) { setError('Enter a name for this key.'); return; }
    setError('');
    startTransition(async () => {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to create key.'); return; }
      setNewKeyValue(json.data.key);
      setNewKeyName('');
      setKeys((prev) => [
        { id: json.data.id, name: json.data.name, keyPrefix: json.data.keyPrefix, lastUsedAt: null, createdAt: json.data.createdAt },
        ...prev,
      ]);
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      const res = await fetch('/api/v1/keys?id=' + id, { method: 'DELETE' });
      if (!res.ok) { setError('Failed to revoke key.'); return; }
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setRevokeId(null);
      if (newKeyValue) setNewKeyValue(null);
    });
  }

  return (
    <div className="space-y-5">
      {/* New key shown once */}
      {newKeyValue && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <p className="mb-1 text-sm font-semibold text-green-800">API key created — save it now</p>
          <p className="mb-2 text-xs text-green-700">This key will not be shown again.</p>
          <code className="block break-all rounded bg-white px-3 py-2 text-xs font-mono text-green-900 border border-green-200">
            {newKeyValue}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(newKeyValue); }}
            className="mt-2 text-xs font-medium text-green-700 underline"
          >
            Copy to clipboard
          </button>
        </div>
      )}

      {/* Create form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name e.g. My Agent"
          disabled={isPending}
          maxLength={64}
          className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <button
          onClick={handleCreate}
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Creating...' : 'Create key'}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Key list */}
      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No API keys yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{k.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {k.keyPrefix}••••••••••••
                  {k.lastUsedAt
                    ? ' · Last used ' + new Date(k.lastUsedAt).toLocaleDateString()
                    : ' · Never used'}
                </p>
              </div>
              <div>
                {revokeId === k.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Revoke?</span>
                    <button onClick={() => handleRevoke(k.id)} disabled={isPending} className="text-xs font-medium text-destructive hover:underline">
                      Yes, revoke
                    </button>
                    <button onClick={() => setRevokeId(null)} className="text-xs text-muted-foreground hover:underline">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRevokeId(k.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
