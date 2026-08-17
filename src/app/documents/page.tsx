'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useListDocuments, useListCategories } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentCard } from '@/components/document-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, Home, X, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

function DocumentsContent() {
  const searchParams = useSearchParams();
  const initialCategoryId = searchParams ? searchParams.get('category') : null;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(
    initialCategoryId ? parseInt(initialCategoryId) : undefined
  );

  const { data: categories } = useListCategories();
  const { data: documents, isLoading } = useListDocuments(
    selectedCategoryId || searchQuery
      ? { categoryId: selectedCategoryId, search: searchQuery }
      : undefined
  );

  const selectedCategory = categories?.find((c) => c.id === selectedCategoryId);

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Knowledge Base</h1>
              <p className="text-xs text-muted-foreground">
                {documents?.length || 0} documents available
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-12 h-12 rounded-2xl"
              data-testid="input-search-documents"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!selectedCategoryId ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategoryId(undefined)}
              className="rounded-full"
              data-testid="button-category-all"
            >
              All Documents
            </Button>
            {categories?.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategoryId === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategoryId(category.id)}
                className="rounded-full"
                data-testid={`button-category-${category.id}`}
              >
                {category.name}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {category.documentCount}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Active Filters */}
          {(selectedCategory || searchQuery) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedCategory && (
                <Badge variant="secondary" className="gap-1">
                  {selectedCategory.name}
                  <button
                    onClick={() => setSelectedCategoryId(undefined)}
                    className="ml-1 hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Documents Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No documents found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Documents...</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
