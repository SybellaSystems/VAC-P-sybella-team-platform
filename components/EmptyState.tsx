import React from 'react';

export default function EmptyState({ title, description, action }: { title?: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto max-w-lg">
        <h3 className="text-xl font-semibold mb-2">{title ?? 'No items yet'}</h3>
        {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
        {action}
      </div>
    </div>
  );
}
