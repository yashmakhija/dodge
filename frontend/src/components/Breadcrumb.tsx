import { Separator } from '@/components/ui/separator'

export default function Breadcrumb() {
  return (
    <header className="flex items-center gap-3 h-12 px-5 bg-card border-b select-none">
      <div className="w-7 h-7 bg-primary text-primary-foreground rounded-md grid place-items-center font-bold text-xs tracking-tight">
        D
      </div>
      <Separator orientation="vertical" className="h-5" />
      <span className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
        Mapping
      </span>
      <span className="text-muted-foreground/50">/</span>
      <span className="text-sm font-semibold text-foreground">Order to Cash</span>
    </header>
  )
}
