'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { ChevronLeft, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createAutomation } from '@/lib/automations/actions';
import Link from 'next/link';

export default function NewAutomationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setLoading(true);
    try {
      const result = await createAutomation({ name, description });
      if (result.success) {
        posthog.capture('Automation Created', {
          automation_name: name,
        });
        router.push(`/dashboard/automations/${result.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/automations">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create Automation</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Automation Details</CardTitle>
            <CardDescription>
              Give your automation a name and description to keep things organized.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Welcome Sequence"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What does this automation do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Link href="/dashboard/automations">
              <Button variant="ghost" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading || !name} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Create & Open Builder
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
