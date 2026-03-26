import { Separator } from '@/components/ui/separator'
import Logo from '@/components/Logo'
import { Network } from 'lucide-react'

export default function Breadcrumb() {
  return (
    <header className="flex items-center justify-between h-12 px-4 bg-card border-b select-none shrink-0">
      <div className="flex items-center gap-3">
        <Logo size={26} />
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2 text-[13px]">
          <Network className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            Mapping
          </span>
          <span className="text-muted-foreground/30">/</span>
          <span className="font-semibold text-foreground">Order to Cash</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Connected
      </div>
    </header>
  )
}
