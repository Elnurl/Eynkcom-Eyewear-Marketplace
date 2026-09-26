import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              Səhifə tapılmadı
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Axtardığınız səhifə silinib və ya ünvan səhv yazılıb.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-gray-900 underline" data-testid="link-not-found-home">
            Ana səhifəyə qayıt
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
