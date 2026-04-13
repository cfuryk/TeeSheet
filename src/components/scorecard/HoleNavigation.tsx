interface Props {
  currentHole: number
  totalHoles: number
  onPrev: () => void
  onNext: () => void
  allScored?: boolean
  onReview?: () => void
}

export function HoleNavigation({ currentHole, totalHoles, onPrev, onNext, allScored, onReview }: Props) {
  const onLast = currentHole === totalHoles
  const showReview = allScored && onLast

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrev}
        disabled={currentHole === 1}
        className="px-4 py-2 rounded-lg bg-btn-secondary hover:bg-card-bg border border-card-border font-semibold text-muted disabled:opacity-30"
      >
        ← Prev
      </button>
      {showReview ? (
        <button
          onClick={onReview}
          className="px-4 py-2 rounded-lg bg-danger hover:bg-danger/90 font-semibold text-white"
        >
          Review Round
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={onLast}
          className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover border border-brand font-semibold text-white disabled:opacity-30"
        >
          Next →
        </button>
      )}
    </div>
  )
}
