'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Scale } from 'lucide-react';

export default function LegalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Legal</h1>
        <p className="text-slate-600">Legal documents and compliance</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Scale className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500">Legal management features coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
