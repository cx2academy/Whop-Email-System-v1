'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { submitBetaFeedback } from '@/app/actions/beta';
import toast from 'react-hot-toast';

interface BetaQuestEngineProps {
  unlockedQuests: string[];
}

const QUEST_MESSAGES: Record<string, { title: string, desc: string }> = {
  domain_setup: { title: 'First Domain Setup!', desc: 'How was the BYOK domain verification process?' },
  imported_leads: { title: 'Contacts Imported!', desc: 'How did the CSV import or syncing feel?' },
  used_ai: { title: 'AI Sequence Generated!', desc: 'How was the quality of the AI generation?' },
  sent_campaign: { title: 'First Campaign Sent!', desc: 'How easy was it to build and send?' },
  graduation: { title: 'All Quests Complete!', desc: 'Rate your overall experience to unlock your Beta Rewards!' }
};

export function BetaQuestEngine({ unlockedQuests }: BetaQuestEngineProps) {
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  // When a new quest arrives that we haven't seen in our local session, show it
  useEffect(() => {
    // Only pick the first one that exists
    if (unlockedQuests.length > 0 && !activeQuest) {
       setActiveQuest(unlockedQuests[0]);
    }
  }, [unlockedQuests]);

  const handleDismiss = () => {
    // In a real app we might mark it dismissed in DB, but for now we just 
    // clear it from local state. The server clears it from the 'newlyUnlocked' list once rated.
    setActiveQuest(null);
  };

  const handleSubmitParams = async () => {
    if (!activeQuest || rating === 0) {
      toast.error('Please select a rating (1-5 stars)');
       return;
    }

    setIsSubmitting(true);
    try {
      await submitBetaFeedback({
        feature: activeQuest,
        rating: rating * 20, // Convert 5 stars to 0-100 rating as requested
        feedback
      });
      toast.success('Feedback saved! Your credits will be updated.');
      const wasGraduation = activeQuest === 'graduation';
      setActiveQuest(null);
      setRating(0);
      setFeedback('');

      if (wasGraduation) {
        // Force a reload to show the new sidebar tab
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      toast.error('Could not save feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeQuest) return null;

  const questInfo = QUEST_MESSAGES[activeQuest] || { title: 'Feature Unlocked!', desc: 'How was your experience?' };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-[380px] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-400" />
        
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/20 text-green-500 p-2 rounded-xl">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold tracking-tight">{questInfo.title}</h3>
                <p className="text-xs text-zinc-400">{questInfo.desc}</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-zinc-600 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex justify-center gap-2 mb-5">
             {[1, 2, 3, 4, 5].map(star => (
               <button
                 key={star}
                 className="focus:outline-none transition-transform hover:scale-110"
                 onMouseEnter={() => setHoveredRating(star)}
                 onMouseLeave={() => setHoveredRating(0)}
                 onClick={() => setRating(star)}
               >
                 <Star 
                   size={32}
                   className={`transition-colors ${
                     star <= (hoveredRating || rating) 
                       ? 'fill-yellow-500 text-yellow-500' 
                       : 'fill-transparent text-zinc-700'
                   }`}
                 />
               </button>
             ))}
          </div>

          <div className="mb-4">
            <textarea
              placeholder="Any bugs? What could be improved? (Optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-green-500/50 resize-none h-20 placeholder:text-zinc-600"
            />
          </div>

          <button
            onClick={handleSubmitParams}
            disabled={isSubmitting || rating === 0}
            className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 py-3 rounded-xl text-sm font-bold transition-colors"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Submit Feedback</>}
          </button>
          
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
