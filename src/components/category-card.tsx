'use client';

import { Category } from '@/lib/types';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  Briefcase, 
  Bell,
  FolderOpen
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  'users': Users,
  'calendar': Calendar,
  'file-text': FileText,
  'dollar-sign': DollarSign,
  'briefcase': Briefcase,
  'bell': Bell,
  'folder-open': FolderOpen,
};

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const Icon = iconMap[category.icon] || FolderOpen;

  return (
    <Link href={`/documents?category=${category.id}`}>
      <Card className="p-5 rounded-2xl border-card-border hover:border-primary/50 transition-all duration-200 cursor-pointer group hover:shadow-md" data-testid={`card-category-${category.id}`}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
              {category.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {category.description}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              {category.documentCount} document{category.documentCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
