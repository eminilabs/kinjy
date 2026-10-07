import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import ForumBrowser from '@/components/forums/ForumBrowser'
import { cn } from '@/lib/utils'

export default function Forums() {
  // A free-standing forum belongs to no community, so its button is the page's own.
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <AppShell
      title="Forums"
      subtitle="Threaded discussion that nests by topic and by geography. Answers distil into a cited knowledge base."
    >
      <div className="mb-4">
        <button
          type="button"
          aria-expanded={createOpen}
          onClick={() => setCreateOpen((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
            createOpen
              ? 'border-gold/50 bg-gold/10 text-gold-soft'
              : 'border-transparent bg-gradient-to-br from-gold-soft to-gold font-bold text-ink',
          )}
        >
          {createOpen ? <X size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          Open a forum
        </button>
      </div>
      <ForumBrowser createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
    </AppShell>
  )
}
