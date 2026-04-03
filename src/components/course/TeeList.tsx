import type { Course } from '@/types'
import { Card, Button } from '@/components/ui'

interface Props {
  course: Course
  canEdit: boolean
  onEdit: (teeId: string) => void
  onDelete: (teeId: string) => void
}

export function TeeList({ course, canEdit, onEdit, onDelete }: Props) {
  if (course.tees.length === 0) {
    return <p className="text-gray-500 text-sm">No tee sets yet. Add one below.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {course.tees.map((tee) => (
        <Card key={tee.teeId} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-gray-900">{tee.name}</p>
            {canEdit && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(tee.teeId)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => onDelete(tee.teeId)}>Delete</Button>
              </div>
            )}
          </div>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>Par {tee.par}</span>
            <span>{tee.yardage} yds</span>
            <span>Slope {tee.slope}</span>
            <span>Rating {tee.rating}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}
