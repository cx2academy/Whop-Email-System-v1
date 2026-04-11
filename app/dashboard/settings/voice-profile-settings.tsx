'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export function VoiceProfileSettings({ builtAt }: { builtAt: string | null }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleBuild = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/build-voice-profile', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success('Voice profile built successfully!');
        window.location.reload();
      } else {
        toast.error(data.error || 'Failed to build voice profile.');
      }
    } catch (e) {
      toast.error('An error occurred while building the voice profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        The AI will analyze your last 5 completed campaigns to extract your unique tone, vocabulary, and sentence structure.
      </p>
      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
        <div>
          <p className="font-medium text-gray-900">Voice Profile</p>
          <p className="text-sm text-gray-500">
            {builtAt 
              ? `Last updated ${new Date(builtAt).toLocaleDateString()}` 
              : 'Not built yet'}
          </p>
        </div>
        <button
          onClick={handleBuild}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Building...' : builtAt ? 'Rebuild Profile' : 'Build Profile'}
        </button>
      </div>
    </div>
  );
}
