import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Round } from '@/types'
import { Button } from '@/components/ui'
import { groupService } from '@/services/groupService'

interface Props {
  round: Round
  currentUserId: string
  compact?: boolean
}

export function JoinRoundButton({ round, currentUserId, compact = false }: Props) {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const isParticipant = round.memberIds?.includes(currentUserId)
  const canJoin = !isParticipant && round.status === 'pending'

  async function handleJoin() {
    setLoading(true)
    try {
      const groupId = await groupService.createGroup(round.roundId, currentUserId)
      navigate(`/rounds/${round.roundId}/groups/${groupId}`)
    } finally {
      setLoading(false)
    }
  }

  if (!canJoin) return null

  return (
    <Button size={compact ? 'sm' : 'md'} loading={loading} onClick={handleJoin}>
      Join
    </Button>
  )
}
