import { UseFormRegister, FieldErrors, FieldArrayWithId } from 'react-hook-form'
import { TeeFormValues } from '@/schemas/courseSchemas'

interface Props {
  fields: FieldArrayWithId<TeeFormValues, 'holes'>[]
  register: UseFormRegister<TeeFormValues>
  errors: FieldErrors<TeeFormValues>
}

export function HoleTable({ fields, register, errors }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-[400px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 text-left border border-gray-200 w-12">Hole</th>
            <th className="p-2 text-center border border-gray-200">Par</th>
            <th className="p-2 text-center border border-gray-200">Yardage</th>
            <th className="p-2 text-center border border-gray-200">Stroke Index</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => (
            <tr key={field.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="p-1 text-center border border-gray-200 font-medium">{index + 1}</td>
              <td className="p-1 border border-gray-200">
                <input
                  type="number"
                  min={3}
                  max={5}
                  {...register(`holes.${index}.par`, { valueAsNumber: true })}
                  className="w-full text-center rounded border border-gray-200 px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </td>
              <td className="p-1 border border-gray-200">
                <input
                  type="number"
                  min={50}
                  max={700}
                  {...register(`holes.${index}.yardage`, { valueAsNumber: true })}
                  className="w-full text-center rounded border border-gray-200 px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </td>
              <td className="p-1 border border-gray-200">
                <input
                  type="number"
                  min={1}
                  max={18}
                  {...register(`holes.${index}.handicap`, { valueAsNumber: true })}
                  className="w-full text-center rounded border border-gray-200 px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {errors.holes?.root?.message && (
        <p className="text-xs text-red-600 mt-1">{errors.holes.root.message}</p>
      )}
    </div>
  )
}
