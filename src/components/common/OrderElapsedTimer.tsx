import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface OrderElapsedTimerProps {
  receivedAt?: string;
  status?: string; // 'active' | 'preparing' | 'placed' | 'cooking' | 'in_progress', etc.
  variant?: 'banner' | 'badge' | 'compact';
  className?: string;
  showReceivedTime?: boolean;
}

export const OrderElapsedTimer: React.FC<OrderElapsedTimerProps> = ({
  receivedAt,
  status = 'active',
  variant = 'banner',
  className = '',
  showReceivedTime = true
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Live ticking timer every second
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!receivedAt) return null;

  const receivedTimestamp = new Date(receivedAt).getTime();
  if (isNaN(receivedTimestamp)) return null;

  const diffMs = Math.max(0, now - receivedTimestamp);
  const totalSecs = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedTimer =
    hours > 0
      ? `${hours}h ${pad(mins)}m ${pad(secs)}s`
      : `${pad(mins)}:${pad(secs)}`;

  // Kitchen Display Urgency Thresholds:
  // < 10 mins: Fresh / on schedule
  // 10 - 20 mins: Warning (approaching standard delivery window)
  // >= 20 mins: Delayed / Overdue (high priority alert)
  const isDelayed = totalSecs >= 1200; // >= 20 min
  const isWarning = totalSecs >= 600 && totalSecs < 1200; // 10 - 20 min

  const statusLower = (status || '').toLowerCase();
  const isPreparing =
    statusLower === 'preparing' ||
    statusLower === 'in_progress' ||
    statusLower === 'cooking';

  const receivedTimeStr = new Date(receivedTimestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Variant: BADGE (compact pill for headers or summary rows)
  if (variant === 'badge') {
    let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
    let iconClass = 'text-blue-500';

    if (isDelayed) {
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse font-bold';
      iconClass = 'text-rose-600 animate-spin-slow';
    } else if (isWarning) {
      badgeClass = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
      iconClass = 'text-amber-600';
    } else if (!isPreparing) {
      badgeClass = 'bg-amber-50/80 text-amber-900 border-amber-200';
      iconClass = 'text-amber-600';
    }

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-xs border ${badgeClass} ${className}`}
        title={`Elapsed time since order received: ${formattedTimer} (Received at ${receivedTimeStr})`}
      >
        <Timer className={`w-3 h-3 ${iconClass}`} />
        <span className="font-bold tracking-tight">{formattedTimer}</span>
      </div>
    );
  }

  // Variant: COMPACT (minimal text with timer icon)
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-1 text-[11px] font-mono ${
          isDelayed
            ? 'text-rose-600 font-bold animate-pulse'
            : isWarning
            ? 'text-amber-700 font-semibold'
            : isPreparing
            ? 'text-blue-700 font-medium'
            : 'text-amber-800 font-medium'
        } ${className}`}
        title={`Received at ${receivedTimeStr}`}
      >
        <Timer className="w-3 h-3 flex-shrink-0" />
        <span>{formattedTimer}</span>
      </div>
    );
  }

  // Variant: BANNER (default prominent display banner on order cards)
  let bannerBg = 'bg-blue-50/70 border-blue-200/90 text-blue-950';
  let iconBg = 'bg-blue-100 text-blue-700';
  let timerTextColor = 'text-blue-900';
  let labelText = isPreparing ? 'Prep Elapsed' : 'Order Elapsed';

  if (isDelayed) {
    bannerBg = 'bg-rose-50/90 border-rose-300 text-rose-950';
    iconBg = 'bg-rose-100 text-rose-700 animate-pulse';
    timerTextColor = 'text-rose-700 font-black';
  } else if (isWarning) {
    bannerBg = 'bg-amber-50/90 border-amber-300 text-amber-950';
    iconBg = 'bg-amber-100 text-amber-800';
    timerTextColor = 'text-amber-900 font-bold';
  } else if (!isPreparing) {
    bannerBg = 'bg-amber-50/60 border-amber-200/80 text-amber-950';
    iconBg = 'bg-amber-100 text-amber-700';
    timerTextColor = 'text-amber-900 font-bold';
    labelText = 'Waiting Elapsed';
  }

  return (
    <div
      className={`px-3.5 py-1.5 border-b flex items-center justify-between text-xs transition-colors ${bannerBg} ${className}`}
      data-testid="order-card-timer"
    >
      <div className="flex items-center gap-2">
        <div className={`p-1 rounded-md flex-shrink-0 ${iconBg}`}>
          <Timer className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-600">
            {labelText}:
          </span>
          <span className={`font-mono text-xs tracking-tight ${timerTextColor}`}>
            {formattedTimer}
          </span>
          {isDelayed && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-200 text-rose-900 border border-rose-300 animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5" />
              Overdue (&gt;20m)
            </span>
          )}
          {isWarning && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-200 text-amber-900 border border-amber-300">
              Attention (&gt;10m)
            </span>
          )}
        </div>
      </div>
      {showReceivedTime && (
        <div className="text-[10px] text-gray-500 font-mono hidden sm:block">
          Rec'd {receivedTimeStr}
        </div>
      )}
    </div>
  );
};
