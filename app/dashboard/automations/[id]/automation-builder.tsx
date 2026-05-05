'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Plus, 
  Zap, 
  Mail, 
  Clock, 
  Tag, 
  Trash2, 
  Save, 
  Play, 
  Pause,
  Settings2,
  ArrowDown,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateAutomation } from '@/lib/automations/actions';
import { AutomationStatus, AutomationStepType } from '@prisma/client';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  id?: string;
  type: AutomationStepType;
  config: any;
  position: number;
}

export default function AutomationBuilder({ automation }: { automation: any }) {
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>(automation.steps);
  const [status, setStatus] = useState<AutomationStatus>(automation.status);
  const [saving, setSaving] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAutomation(automation.id, { 
        steps,
        status 
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addStep = (type: AutomationStepType) => {
    const newStep: Step = {
      type,
      config: type === AutomationStepType.DELAY ? { days: 1 } : {},
      position: steps.length
    };
    setSteps([...steps, newStep]);
    setSelectedStepIndex(steps.length);
  };

  const removeStep = (index: number) => {
    if (index === 0) return; // Cannot remove trigger
    const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i }));
    setSteps(newSteps);
    if (selectedStepIndex === index) setSelectedStepIndex(null);
  };

  const updateStepConfig = (index: number, config: any) => {
    const newSteps = [...steps];
    newSteps[index].config = { ...newSteps[index].config, ...config };
    setSteps(newSteps);
  };

  return (
    <div className="flex flex-col h-full -m-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/automations">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{automation.name}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
                {status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Last updated {new Date(automation.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select 
            value={status} 
            onValueChange={(v) => setStatus(v as AutomationStatus)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 bg-slate-50 overflow-y-auto p-12 flex flex-col items-center">
          <div className="max-w-md w-full space-y-4 flex flex-col items-center">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center w-full">
                {index > 0 && (
                  <div className="py-2">
                    <ArrowDown className="h-6 w-6 text-slate-300" />
                  </div>
                )}
                
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full group relative cursor-pointer transition-all ${
                    selectedStepIndex === index ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-slate-200'
                  }`}
                  onClick={() => setSelectedStepIndex(index)}
                >
                  <Card className="shadow-sm">
                    <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getStepColor(step.type)}`}>
                          {getStepIcon(step.type)}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            {step.type.replace('_', ' ')}
                          </CardTitle>
                          <p className="text-sm font-medium">
                            {getStepSummary(step)}
                          </p>
                        </div>
                      </div>
                      {index > 0 && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStep(index);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </CardHeader>
                  </Card>
                </motion.div>
              </div>
            ))}

            {/* Add Step Button */}
            <div className="pt-8 flex flex-col items-center gap-4">
              <div className="h-8 w-px bg-slate-200" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => addStep(AutomationStepType.DELAY)} className="gap-2">
                  <Clock className="h-4 w-4" /> Add Delay
                </Button>
                <Button variant="outline" size="sm" onClick={() => addStep(AutomationStepType.SEND_EMAIL)} className="gap-2">
                  <Mail className="h-4 w-4" /> Send Email
                </Button>
                <Button variant="outline" size="sm" onClick={() => addStep(AutomationStepType.ADD_TAG)} className="gap-2">
                  <Tag className="h-4 w-4" /> Add Tag
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Settings */}
        <AnimatePresence>
          {selectedStepIndex !== null && (
            <motion.div 
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="w-96 border-l bg-background p-6 overflow-y-auto shadow-xl z-20"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Step Settings
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedStepIndex(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground font-bold">Step Type</Label>
                  <p className="font-medium">{steps[selectedStepIndex].type.replace('_', ' ')}</p>
                </div>

                {renderStepSettings(steps[selectedStepIndex], selectedStepIndex, updateStepConfig)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getStepIcon(type: AutomationStepType) {
  switch (type) {
    case 'TRIGGER': return <Zap className="h-5 w-5" />;
    case 'SEND_EMAIL': return <Mail className="h-5 w-5" />;
    case 'DELAY': return <Clock className="h-5 w-5" />;
    case 'ADD_TAG': return <Tag className="h-5 w-5" />;
    default: return <Settings2 className="h-5 w-5" />;
  }
}

function getStepColor(type: AutomationStepType) {
  switch (type) {
    case 'TRIGGER': return 'bg-amber-100 text-amber-600';
    case 'SEND_EMAIL': return 'bg-blue-100 text-blue-600';
    case 'DELAY': return 'bg-slate-100 text-slate-600';
    case 'ADD_TAG': return 'bg-purple-100 text-purple-600';
    default: return 'bg-slate-100 text-slate-600';
  }
}

function getStepSummary(step: Step) {
  const config = step.config;
  switch (step.type) {
    case 'TRIGGER':
      return config.type === 'whop_purchase' ? 'When a purchase is made' : 'Trigger';
    case 'SEND_EMAIL':
      return config.subject || 'Send an email';
    case 'DELAY':
      const parts = [];
      if (config.days) parts.push(`${config.days}d`);
      if (config.hours) parts.push(`${config.hours}h`);
      if (config.minutes) parts.push(`${config.minutes}m`);
      return parts.length > 0 ? `Wait for ${parts.join(' ')}` : 'No delay set';
    case 'ADD_TAG':
      return config.tagName ? `Add tag: ${config.tagName}` : 'Add a tag';
    default:
      return 'Configure this step';
  }
}

function renderStepSettings(step: Step, index: number, updateConfig: any) {
  const config = step.config;

  switch (step.type) {
    case 'TRIGGER':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Trigger Event</Label>
            <Select 
              value={config.type || 'whop_purchase'} 
              onValueChange={(v) => updateConfig(index, { type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whop_purchase">Whop Purchase</SelectItem>
                <SelectItem value="manual">Manual Enrollment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'DELAY':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label>Days</Label>
              <Input 
                type="number" 
                value={config.days || 0} 
                onChange={(e) => updateConfig(index, { days: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input 
                type="number" 
                value={config.hours || 0} 
                onChange={(e) => updateConfig(index, { hours: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mins</Label>
              <Input 
                type="number" 
                value={config.minutes || 0} 
                onChange={(e) => updateConfig(index, { minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      );

    case 'SEND_EMAIL':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Subject Line</Label>
            <Input 
              value={config.subject || ''} 
              onChange={(e) => updateConfig(index, { subject: e.target.value })}
              placeholder="e.g. Welcome to the community!"
            />
          </div>
          <div className="space-y-2">
            <Label>Email Content (HTML)</Label>
            <Textarea 
              value={config.htmlBody || ''} 
              onChange={(e) => updateConfig(index, { htmlBody: e.target.value })}
              placeholder="<p>Hello world!</p>"
              rows={10}
            />
          </div>
        </div>
      );

    case 'ADD_TAG':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tag Name</Label>
            <Input 
              value={config.tagName || ''} 
              onChange={(e) => updateConfig(index, { tagName: e.target.value })}
              placeholder="e.g. customer_vip"
            />
          </div>
        </div>
      );

    default:
      return <p>No settings for this step type.</p>;
  }
}
