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
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</p>
        <div className="flex flex-col gap-2">
          {tees.map((tee) => {
            const selected = isSelected(tee)
            return (
              <button
                key={`${tee.tee_name}-${tee.course_rating}`}
                onClick={() => onToggle(tee)}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${
                  selected
                    ? 'border-green-500 bg-green-900/20'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                }`}
              >
                <div>
                  <p className="font-semibold text-white">{tee.tee_name}</p>
                  <p className="text-xs text-gray-400">
                    {tee.total_yards} yds · Par {tee.par_total}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-300">Rating {tee.course_rating}</p>
                  <p className="text-xs text-gray-400">Slope {tee.slope_rating}</p>
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
        <p className="font-semibold text-white">{displayCourseName(course)}</p>
        <p className="text-sm text-gray-400">
          {[course.location.city, course.location.state].filter(Boolean).join(', ')}
        </p>
      </div>
      <p className="text-sm text-gray-400">
        Select the tees you want to import ({allTees.length} available):
      </p>
      {renderGroup(maleTees, 'Men')}
      {renderGroup(femaleTees, 'Women')}
      {selectedTees.length > 0 && (
        <p className="text-xs text-green-400">
          {selectedTees.length} tee set{selectedTees.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
