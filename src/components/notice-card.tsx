'use client';

import { Notice } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NoticeCardProps {
  notice: Notice;
}

export function NoticeCard({ notice }: NoticeCardProps) {
  const priorityConfig = {
    urgent: { label: 'Urgent', className: 'bg-rose-500 dark:bg-rose-600 text-white' },
    high: { label: 'High', className: 'bg-amber-500 dark:bg-amber-600 text-white' },
    normal: { label: 'Normal', className: 'bg-blue-500 dark:bg-blue-600 text-white' },
  };

  const config = priorityConfig[notice.priority];

  return (
    <Card 
      className={`p-5 rounded-2xl border-card-border ${notice.isPinned ? 'border-l-4 border-l-primary' : ''}`}
      data-testid={`card-notice-${notice.id}`}
    >
      <div className="flex items-start gap-3">
        {notice.isPinned && (
          <Pin className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <Badge className={config.className} data-testid={`badge-priority-${notice.priority}`}>
              <AlertCircle className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
            {notice.categoryName && (
              <Badge variant="outline" className="text-xs">
                {notice.categoryName}
              </Badge>
            )}
          </div>
          
          <h3 className="font-semibold text-foreground mb-2">
            {notice.title}
          </h3>
          
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            {notice.content}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Published {formatDistanceToNow(new Date(notice.publishedAt), { addSuffix: true })}
            </span>
            {notice.deadline && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <Calendar className="w-3 h-3" />
                Due {formatDistanceToNow(new Date(notice.deadline), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
