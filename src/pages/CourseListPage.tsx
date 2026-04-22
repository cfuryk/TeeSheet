import { Link } from 'react-router-dom'
import { useCourses } from '@/hooks/useCourses'
import { Card, Spinner } from '@/components/ui'

export function CourseListPage() {
  const { courses, loading } = useCourses()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-brand">Courses</h2>
        <Link
          to="/courses/new"
          className="inline-flex items-center bg-brand text-white px-4 h-9 rounded-lg text-sm font-semibold hover:bg-brand-hover"
        >
          + New Course
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">🗺</p>
          <p className="font-medium text-muted">No courses yet</p>
          <p className="text-sm text-muted">Add a course to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map((course) => (
            <Link key={course.courseId} to={`/courses/${course.courseId}`}>
              <Card className="p-4 hover:border-card-border transition-colors">
                <p className="font-semibold text-brand">{course.name}</p>
                <p className="text-sm text-muted">{course.tees.length} tee set{course.tees.length !== 1 ? 's' : ''}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
