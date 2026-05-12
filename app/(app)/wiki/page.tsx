'use client';

import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';

type WikiPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  summary: string | null;
  is_published: boolean;
};

export default function WikiPageRoute() {
  const [q, setQ] = useState('');
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      const { data } = await supabase
        .from('wiki_pages')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!mounted) return;
      setPages((data as WikiPage[]) ?? []);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return pages;

    return pages.filter((p) => {
      const hay = `${p.title} ${p.slug} ${p.summary ?? ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [pages, q]);

  return (
    <div className="bg-[#050505] min-h-screen pt-28 pb-20 px-6">
      <Helmet>
        <title>Wiki | VAC-P</title>
      </Helmet>

      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Wiki / Knowledge Base</h1>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Company Knowledge</h2>
          <p className="text-white/40 mt-4 max-w-2xl">Search, reference, and publish internal documentation.</p>
        </header>

        <div className="flex items-center gap-3 mb-8">
          <input
            value={q}
            onChange={(e: any) => setQ(e.target.value)}

            placeholder="Search wiki..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {loading ? (
          <div className="text-white/30 text-sm">Syncing wiki...</div>
        ) : (
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="text-white/30 text-sm">No matching pages.</div>
            ) : (
              filtered.map((p) => (
                <div key={p.id} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-white font-black">{p.title}</div>
                      <div className="text-white/40 text-sm mt-1">/wiki/{p.slug}</div>
                    </div>
                    <div className="text-white/30 text-xs uppercase font-black tracking-widest">{p.is_published ? 'PUBLISHED' : 'DRAFT'}</div>
                  </div>
                  {p.summary ? <p className="text-white/60 mt-4">{p.summary}</p> : null}
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-10 text-white/20 text-xs">
          Note: Insert/Update is restricted by RLS; non-publishable drafts may not be visible.
        </div>
      </div>
    </div>
  );
}

