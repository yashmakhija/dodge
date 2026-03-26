import { Separator } from '@/components/ui/separator'
import Logo from '@/components/Logo'
import { Network } from 'lucide-react'

export default function Breadcrumb() {
  return (
    <header className="flex items-center justify-between h-11 px-4 bg-card border-b select-none shrink-0">
      <div className="flex items-center gap-3">
        <Logo size={24} />
        <Separator orientation="vertical" className="h-4 max-md:hidden" />
        <div className="flex items-center gap-2 text-[13px]">
          <Network className="h-3.5 w-3.5 text-muted-foreground max-md:hidden" />
          <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer max-md:hidden">
            Mapping
          </span>
          <span className="text-muted-foreground/30 max-md:hidden">/</span>
          <span className="font-semibold text-foreground">Order to Cash</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="max-md:hidden">Connected</span>
      </div>
    </header>
  )
}
