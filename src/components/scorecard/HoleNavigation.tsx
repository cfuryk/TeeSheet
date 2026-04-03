interface Props {
  currentHole: number
  totalHoles: number
  onPrev: () => void
  onNext: () => void
}

export function HoleNavigation({ currentHole, totalHoles, onPrev, onNext }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={currentHole === 1}
          className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 font-semibold text-gray-300 disabled:opacity-30 hover:bg-gray-700"
        >
          ← Prev
        </button>
        <span className="text-sm text-gray-400">Hole {currentHole} of {totalHoles}</span>
        <button
          onClick={onNext}
          disabled={currentHole === totalHoles}
          className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 font-semibold text-gray-300 disabled:opacity-30 hover:bg-gray-700"
        >
          Next →
        </button>
      </div>
      <div className="flex justify-center gap-1 flex-wrap">
        {Array.from({ length: totalHoles }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 rounded-full transition-all ${
              i + 1 === currentHole ? 'w-4 bg-green-500' : 'w-2.5 bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
