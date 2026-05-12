'use client';

import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';

type RepoLink = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  link_type: string | null;
};

export default function RepoLinksPage() {
  const [links, setLinks] = useState<RepoLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('repo_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (!mounted) return;
      setLinks((data as RepoLink[]) ?? []);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-[#050505] min-h-screen pt-28 pb-20 px-6">
      <Helmet>
        <title>Repo Links | VAC-P</title>
      </Helmet>

      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Repo / Document Links</h1>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Knowledge Assets</h2>
          <p className="text-white/40 mt-4 max-w-2xl">External and internal documents connected to the VAC-P workspace.</p>
        </header>

        {loading ? (
          <div className="text-white/30 text-sm">Syncing links...</div>
        ) : (
          <div className="space-y-4">
            {links.length === 0 ? (
              <div className="text-white/30 text-sm">No links available.</div>
            ) : (
              links.map((l) => (
                <a
                  key={l.id}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-white font-black">{l.title}</div>
                      {l.description ? <div className="text-white/60 mt-2 text-sm">{l.description}</div> : null}
                    </div>
                    <div className="text-white/30 text-xs uppercase font-black tracking-widest whitespace-nowrap">
                      {l.link_type ?? 'DOCUMENT'}
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

