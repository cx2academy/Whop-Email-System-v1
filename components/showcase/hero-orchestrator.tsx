"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useSpring, useMotionValueEvent } from "framer-motion";
import { Bell, RefreshCw, ShieldCheck, CreditCard } from "lucide-react";

// Notification Types
const NOTIFICATION_TYPES = [
  {
    icon: RefreshCw,
    title: "Revenue Recovery Event",
    template: "Automated mitigation sequence successful: +${amount}",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Bell,
    title: "Negative Churn Signal",
    template: "Expansion logic preserved active session worth ${amount}",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Retention Protocol Active",
    template: "System-level intervention secured ${amount} in recurring revenue",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: CreditCard,
    title: "Dunning Resolution",
    template: "Validation cycle resolved failed invoice: ${amount}",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

type NotificationData = {
  id: number;
  type: (typeof NOTIFICATION_TYPES)[0] & { amount: number; message: string };
};

function Counter({ value }: { value: number }) {
  const springValue = useSpring(value, {
    stiffness: 45,
    damping: 18,
    mass: 1,
  });

  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  useMotionValueEvent(springValue, "change", (latest) => {
    setDisplayValue(latest);
  });

  return (
    <motion.span
      animate={{ scale: [1, 1.01, 1] }}
      transition={{ duration: 0.3 }}
      className="font-mono font-black tabular-nums tracking-tighter"
    >
      <span className="text-slate-300 mr-1 md:mr-2">$</span>
      {displayValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </motion.span>
  );
}

function RecoverySparkline() {
  return (
    <div className="w-16 h-8 overflow-hidden opacity-40">
      <svg viewBox="0 0 100 40" className="w-full h-full">
        <motion.path
          d="M0 35 L10 32 L25 38 L40 20 L55 25 L70 5 L85 15 L100 0"
          fill="none"
          stroke="url(#sparklineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
        />
        <defs>
          <linearGradient
            id="sparklineGradient"
            x1="0"
            y1="0"
            x2="100"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#22c55e" />
            <stop offset="1" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function HeroOrchestrator() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const calculateInitialValue = () => {
      const now = new Date();
      const secondsSinceMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      return 2400 + secondsSinceMidnight * 0.15;
    };

    setTotalSaved(calculateInitialValue());
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const timeout = setTimeout(() => {
      const addRandom = () => {
        const randomTypeBase =
          NOTIFICATION_TYPES[Math.floor(Math.random() * NOTIFICATION_TYPES.length)];

        const isBigMove = Math.random() > 0.9;
        const amount = isBigMove ? 100 + Math.random() * 99 : 2.5 + Math.random() * 72.5;

        const randomType = {
          ...randomTypeBase,
          amount,
          message: randomTypeBase.template.replace("${amount}", amount.toFixed(2)),
        };

        setNotifications((prev) => [
          { id: Date.now() + Math.random(), type: randomType },
          ...prev.slice(0, 10),
        ]);
        setTotalSaved((prev) => prev + amount);

        const delay = 2250 + Math.random() * 3750;
        setTimeout(addRandom, delay);
      };
      addRandom();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [isClient]);

  if (!isClient) {
    return <div className="h-[400px]" />;
  }

  return (
    <div className="relative flex w-full flex-col px-4 md:px-0">
      {/* Hyper-Gloss Counter Container with Shadow-Stroke */}
      <div className="relative group mb-12">
        <div className="absolute -inset-[1px] bg-slate-900/10 rounded-[2.5rem]" />
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 via-emerald-400/20 to-teal-500/20 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 animate-gradient-xy"></div>

        <div className="relative flex flex-col items-center justify-center p-10 md:p-14 bg-white/70 backdrop-blur-3xl border border-white/80 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Internal ambient glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />

          <div className="w-full flex items-center justify-between mb-8">
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="flex items-center gap-2 rounded-full bg-slate-100/50 px-3 py-1 border border-slate-200/50"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,1)]" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-slate-500">
                Recovery Engine Active
              </span>
            </motion.div>
            <RecoverySparkline />
          </div>

          <div className="mb-4 text-6xl md:text-8xl font-black tracking-tighter text-slate-900 drop-shadow-sm flex items-baseline">
            <Counter value={totalSaved} />
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 md:text-xs">
              Revenue Recovered Today
            </div>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-6 h-0.5 bg-slate-200 rounded-full" />
              ))}
            </div>
          </div>

          {/* Floating technical data bits */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: -200, opacity: [0, 1, 0] }}
                transition={{ duration: 6 + i, repeat: Infinity, delay: i * 1.2 }}
                className="absolute text-[8px] font-mono text-green-500/50"
                style={{ left: `${15 + i * 15}%` }}
              >
                0x{Math.floor(Math.random() * 1000).toString(16)}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Feed (Terminal Log Style) */}
      <div className="relative w-full max-w-2xl mx-auto h-[350px] overflow-hidden mask-fade-y">
        <div className="flex flex-col gap-[18px] p-2">
          <AnimatePresence initial={false} mode="popLayout">
            {notifications.map((notif, index) => {
              const age = index;
              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, x: -15, filter: "blur(4px)" }}
                  animate={{
                    opacity: 1 - age * 0.15,
                    x: 0,
                    filter: "blur(0px)",
                    scale: 1 - age * 0.02,
                  }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 35,
                  }}
                  className="w-full flex items-center justify-between gap-4 p-4 rounded-xl bg-white/40 backdrop-blur-md border border-slate-200/50 shadow-sm group hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`p-2.5 rounded-lg ${notif.type.bg} flex items-center justify-center shrink-0 border border-slate-200/20`}
                    >
                      <notif.type.icon size={18} className={notif.type.color} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[8px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-widest">
                          {new Date(notif.id).toLocaleTimeString([], {
                            hour12: false,
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">
                          {notif.type.title}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-500 font-medium truncate opacity-90 italic">
                        &quot; {notif.type.message.split(":")[0]}... &quot;
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-green-600 text-sm">
                      +${notif.type.amount.toFixed(2)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
