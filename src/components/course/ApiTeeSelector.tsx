import type { ApiCourse, ApiTee } from '@/services/golfCourseApiService'
import { allApiTees, displayCourseName } from '@/lib/courseApiMapper'

interface Props {
  course: ApiCourse
  selectedTees: ApiTee[]
  onToggle: (tee: ApiTee) => void
}

export function ApiTeeSelector({ course, selectedTees, onToggle }: Props) {
  const maleTees = course.tees.male ?? []
  const femaleTees = course.tees.female ?? []
  const allTees = allApiTees(course)

  function isSelected(tee: ApiTee) {
    return selectedTees.some((t) => t.tee_name === tee.tee_name && t.course_rating === tee.course_rating)
  }

  function renderGroup(tees: ApiTee[], label: string) {
    if (tees.length === 0) return null
    return (
      <div>
        <p className="text-xs text-muted uppercase tracking-wide mb-2">{label}</p>
        <div className="flex flex-col gap-2">
          {tees.map((tee) => {
            const selected = isSelected(tee)
            return (
              <button
                key={`${tee.tee_name}-${tee.course_rating}`}
                onClick={() => onToggle(tee)}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                  selected
                    ? 'border-brand bg-brand/10'
                    : 'border-card-border bg-card-bg hover:border-card-border'
                }`}
              >
                <div>
                  <p className="font-semibold text-brand">{tee.tee_name}</p>
                  <p className="text-xs text-muted">
                    {tee.total_yards} yds · Par {tee.par_total}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-brand">Rating {tee.course_rating}</p>
                  <p className="text-xs text-muted">Slope {tee.slope_rating}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-semibold text-brand">{displayCourseName(course)}</p>
        <p className="text-sm text-muted">
          {[course.location.city, course.location.state].filter(Boolean).join(', ')}
        </p>
      </div>
      <p className="text-sm text-muted">
        Select the tees you want to import ({allTees.length} available):
      </p>
      {renderGroup(maleTees, 'Men')}
      {renderGroup(femaleTees, 'Women')}
      {selectedTees.length > 0 && (
        <p className="text-xs text-brand">
          {selectedTees.length} tee set{selectedTees.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
