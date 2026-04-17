'use client';

import { useState } from 'react';
import { 
  Plus, 
  Zap, 
  Play, 
  Pause, 
  Trash2, 
  MoreVertical, 
  Clock, 
  Mail, 
  Tag, 
  Sparkles, 
  RotateCcw, 
  TrendingUp,
  Activity,
  LayoutGrid,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { AUTOMATION_BLUEPRINTS } from '@/lib/automations/blueprints';
import { installBlueprint } from '@/lib/automations/actions';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface AutomationsClientProps {
  automations: any[];
  logs: any[];
  AutomationList: React.ReactNode;
}

export function AutomationsClient({ automations, logs, AutomationList }: AutomationsClientProps) {
  const router = useRouter();
  const [isInstalling, setIsInstalling] = useState<string | null>(null);

  async function handleInstall(blueprintId: string) {
    setIsInstalling(blueprintId);
    try {
      const result = await installBlueprint(blueprintId);
      if (result.success) {
        toast.success('Blueprint installed! Redirecting to builder...');
        router.push(`/dashboard/automations/${result.id}`);
      }
    } catch (error) {
      toast.error('Failed to install blueprint');
    } finally {
      setIsInstalling(null);
    }
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className="h-5 w-5" />;
      case 'RotateCcw': return <RotateCcw className="h-5 w-5" />;
      case 'TrendingUp': return <TrendingUp className="h-5 w-5" />;
      default: return <Zap className="h-5 w-5" />;
    }
  };

  return (
    <Tabs defaultValue="my-automations" className="space-y-6">
      <div className="flex items-center justify-between">
        <TabsList className="bg-secondary/50 p-1">
          <TabsTrigger value="my-automations" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            My Automations
          </TabsTrigger>
          <TabsTrigger value="blueprints" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Blueprints
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" />
            Activity Logs
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="my-automations" className="space-y-4">
        {AutomationList}
      </TabsContent>

      <TabsContent value="blueprints" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {AUTOMATION_BLUEPRINTS.map((blueprint) => (
            <Card key={blueprint.id} className="flex flex-col border-border/50 hover:border-primary/30 transition-all group">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    {getIcon(blueprint.icon)}
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
                    {blueprint.category}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{blueprint.name}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {blueprint.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <Button 
                  className="w-full gap-2" 
                  onClick={() => handleInstall(blueprint.id)}
                  disabled={isInstalling === blueprint.id}
                >
                  {isInstalling === blueprint.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Install Blueprint
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="logs">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              System Health
            </CardTitle>
            <CardDescription>
              Real-time logs of all automation events in your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-md border-t">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[180px]">Time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No activity logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {log.event.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.message}
                        </TableCell>
                        <TableCell className="text-right">
                          {log.event.includes('failed') ? (
                            <XCircle className="h-4 w-4 text-destructive ml-auto" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function RefreshCw({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
