import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-auto rounded-2xl">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 text-destructive">
            <AlertCircle className="h-8 w-8" />
            <h1 className="text-2xl font-bold text-foreground">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            The page or document you are looking for does not exist or has been moved.
          </p>
        </CardContent>

        <div className="flex justify-end gap-2 p-6 pt-0">
          <Button asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
