import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/services/userService'
import { profileUpdateSchema, ProfileUpdateFormData } from '@/schemas/userSchemas'
import { Input, Button, Alert, Card } from '@/components/ui'
import { formatHandicap } from '@/lib/formatters'

export function ProfilePage() {
    const { currentUser, userProfile } = useAuth()
    const [error, setError] = useState('')
    const navigate = useNavigate()
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileUpdateFormData>({
        resolver: zodResolver(profileUpdateSchema),
        defaultValues: { displayName: '' },
    })

    useEffect(() => {
        if (userProfile) {
            reset({ displayName: userProfile.displayName ?? '' })
        }
    }, [userProfile, reset])

    async function onSubmit(data: ProfileUpdateFormData) {
        if (!currentUser) return
        try {
            setError('')
            await userService.updateProfile(currentUser.uid, data)
            navigate('/')
        } catch {
            setError('Failed to update profile.')
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-white">Profile</h2>
            <Card className="p-4">
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                    {error && <Alert message={error} />}
                    <Input label="Display Name" {...register('displayName')} error={errors.displayName?.message} />
                    <div className="flex flex-col gap-1 text-sm text-gray-400">
                        <span>Email: {userProfile?.email}</span>
                        <span>
                            TeeSheet Handicap:{' '}
                            <span className="text-white font-medium">
                                {userProfile?.teeSheetHandicap != null
                                    ? formatHandicap(userProfile.teeSheetHandicap)
                                    : 'Not enough rounds'}
                            </span>
                        </span>
                    </div>
                    <Button type="submit" loading={isSubmitting}>Save Changes</Button>
                </form>
            </Card>
        </div>
    )
}
