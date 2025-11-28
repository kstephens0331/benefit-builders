/**
 * Premium 404 Not Found Page
 *
 * Polished error page with helpful navigation and smooth animations
 */

import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 animate-fade-in">
      <Card variant="elevated" className="max-w-2xl w-full text-center animate-scale-in">
        <CardContent padding="lg" className="py-16">
          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="text-9xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 dark:from-primary-400 dark:to-accent-400 bg-clip-text text-transparent animate-bounce-in">
              404
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Page Not Found
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/dashboard">
              <Button variant="primary" size="lg">
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/companies">
              <Button variant="secondary" size="lg">
                View Companies
              </Button>
            </Link>
          </div>

          {/* Additional Help */}
          <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Common pages you might be looking for:
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/proposals"
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Proposals
              </Link>
              <span className="text-neutral-300 dark:text-neutral-600">•</span>
              <Link
                href="/admin/billing"
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Billing
              </Link>
              <span className="text-neutral-300 dark:text-neutral-600">•</span>
              <Link
                href="/accounting"
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Accounting
              </Link>
              <span className="text-neutral-300 dark:text-neutral-600">•</span>
              <Link
                href="/reports"
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Reports
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
