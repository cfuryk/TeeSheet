import { Link } from 'react-router-dom'
import { useCourses } from '@/hooks/useCourses'
import { Card, Spinner } from '@/components/ui'

export function CourseListPage() {
  const { courses, loading } = useCourses()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Courses</h2>
        <Link
          to="/courses/new"
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
        >
          + New Course
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">🗺</p>
          <p className="font-medium text-gray-400">No courses yet</p>
          <p className="text-sm">Add a course to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map((course) => (
            <Link key={course.courseId} to={`/courses/${course.courseId}`}>
              <Card className="p-4 hover:border-gray-600 transition-colors">
                <p className="font-semibold text-white">{course.name}</p>
                <p className="text-sm text-gray-500">{course.tees.length} tee set{course.tees.length !== 1 ? 's' : ''}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
