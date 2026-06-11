'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number | null;
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ className, value = 0, style, ...props }, ref) => {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div
      ref={ref}
      className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
      style={style}
      {...props}
    >
      <div
        aria-hidden
        className="h-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
});
Progress.displayName = 'Progress';

export { Progress };
