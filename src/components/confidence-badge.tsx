'use client';

import { MessageConfidence } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: MessageConfidence;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (!confidence) return null;

  const config = {
    high: {
      label: 'High Confidence',
      icon: CheckCircle2,
      className: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    },
    medium: {
      label: 'Medium Confidence',
      icon: AlertCircle,
      className: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    low: {
      label: 'Low Confidence',
      icon: AlertTriangle,
      className: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    },
  };

  const { label, icon: Icon, className } = config[confidence];

  return (
    <Badge variant="outline" className={className} data-testid={`badge-confidence-${confidence}`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}
