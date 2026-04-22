interface Tab {
  key: string
  label: string
}

interface Props {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
}

export function TabBar({ tabs, active, onChange }: Props) {
  return (
    <div className="sticky top-14 z-30 bg-white border-b border-card-border flex -mx-4 px-4">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            active === tab.key
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-brand'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
