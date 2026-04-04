interface Props {
  strokes: number
  courseHandicap: number
}

export function StrokeIndicator({ strokes, courseHandicap }: Props) {
  if (strokes <= 0) return null

  return (
    <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
      <div className="flex gap-1">
        {Array.from({ length: strokes }).map((_, i) => (
          <span key={i} className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
        ))}
      </div>
      <span>
        You receive {strokes} stroke{strokes > 1 ? 's' : ''} on this hole (Course HCP: {courseHandicap})
      </span>
    </div>
  )
}
