interface Props {
  currentHole: number
  totalHoles: number
  onPrev: () => void
  onNext: () => void
}

export function HoleNavigation({ currentHole, totalHoles, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrev}
        disabled={currentHole === 1}
        className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 font-semibold text-gray-300 disabled:opacity-30"
      >
        ← Prev
      </button>
      <span className="text-sm text-gray-400">Hole {currentHole} of {totalHoles}</span>
      <button
        onClick={onNext}
        disabled={currentHole === totalHoles}
        className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 border border-green-600 font-semibold text-white disabled:opacity-30"
      >
        Next →
      </button>
    </div>
  )
}
