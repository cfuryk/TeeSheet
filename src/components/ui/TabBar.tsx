interface Tab {
  key: string
  label: string
  alertCount?: number
}

interface Props {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
}

export function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="sticky top-14 z-30 bg-white border-b border-card-border flex">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-[3px] -mb-px relative inline-flex items-center justify-center gap-1.5 ${
            active === tab.key
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-brand'
          }`}
        >
          {tab.label}
          {tab.alertCount != null && tab.alertCount > 0 && (
            <span className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-blue-600 opacity-60" />
              <span className="relative inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none">
                {tab.alertCount}
              </span>
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
