interface Props {
  currentHole: number
  totalHoles: number
  onPrev: () => void
  onNext: () => void
  allScored?: boolean
  onReview?: () => void
  strokes?: number
}

export function HoleNavigation({ currentHole, totalHoles, onPrev, onNext, allScored, onReview, strokes = 0 }: Props) {
  const onLast = currentHole === totalHoles
  const showReview = allScored && onLast

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrev}
        disabled={currentHole === 1}
        className="h-9 px-4 rounded-lg bg-btn-secondary hover:bg-card-bg border border-card-border text-sm font-semibold text-muted disabled:opacity-30"
      >
        ← Prev
      </button>
      {strokes > 0 ? (
        <div className="flex items-center gap-1.5 text-xs text-brand">
          <span className="flex gap-0.5">
            {Array.from({ length: strokes }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand inline-block" />
            ))}
          </span>
          <span>{strokes} stroke{strokes > 1 ? 's' : ''}</span>
        </div>
      ) : (
        <span />
      )}
      {showReview ? (
        <button
          onClick={onReview}
          className="h-9 px-4 rounded-lg bg-danger hover:bg-danger/90 text-sm font-semibold text-white"
        >
          Review Round
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={onLast}
          className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-hover border border-brand text-sm font-semibold text-white disabled:opacity-30"
        >
          Next →
        </button>
      )}
    </div>
  )
}
