import type { AlertType } from '@/types/message'

export interface ScoringAlert {
  text: string
  alertType: AlertType
}

function pick(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)]
}

const correctionMessages = (name: string, hole: number) => [
    `${name} quietly updated their score on hole ${hole}`,
    `Pencil eraser in use for ${name} on hole ${hole}.`,
    `Possible Cheater Alert: ${name} made a change to their score on hole ${hole}.`,
]

const holeInOneMessages = (name: string, hole: number) => [
    `HOLE IN ONE!!! ${name} just aced hole ${hole}!!!`,
    `DRINKS ON ${name}! A hole in one on hole ${hole}!`,
    `HOLY FUCKIN SHIT! ${name} just made a hole in one on hole ${hole}!`
]

const albatrossMessages = (name: string, hole: number) => [
    `ALBATROSS! ${name} just double eagled hole ${hole}!`,
    `DOUBLE EAGLE! ${name} just double eagled hole ${hole}!`,
    `BIG BIG BIRD! ${name} just albatrossed hole ${hole}!`
]

const eagleMessages = (name: string, score: number, hole: number) => [
    `EAGLE! ${name} goes ${score} on hole ${hole}!`,
    `${name} is on fire with an eagle on hole ${hole}!`,
    `CALL THE COPS! ${name} just made an eagle on hole ${hole}!`,
    `BIG BIG BIRD! ${name} just made an eagle on hole ${hole}!`
]

const birdieMessages = (name: string, hole: number) => [
    `Birdie for ${name} on hole ${hole}!`,
    `Casual bird for ${name} on hole ${hole}!`,
    `It's in the hole! ${name} makes a birdie on hole ${hole}!`,
    `Bird man fly in any weather! ${name} on hole ${hole}!`,
    `Birdy Birdy Birdy Birdy Rockin everywhere. ${name} on hole ${hole}!`
]

const tripleMessages = (name: string, score: number, hole: number) => [
    `${name} takes a ${score} on hole ${hole}... ouch.`,
    `Triple bogey for ${name} on hole ${hole}.`,
    `Not the best hole for ${name}, a ${score} on hole ${hole}.`,
    `${name} might want to forget about hole ${hole} after that ${score}.`,
    `${name} is going to have nightmares about hole ${hole} after that ${score}.`,
    `That's gotta hurt, ${name} on hole ${hole} with a ${score}.`,
    `${name} just triple bogeyed hole ${hole} with a ${score}.`
]

const bronderMessages = (hole: number) => [
    `SNOW ALERT! Sniff sniff on ${hole} for Bronder!`,
    `Brown Meat in the white powder on hole ${hole}!`,
    `Is that Tony Montana or Bronder with all that snow on hole ${hole}!`,
    `El Chapo is loose!!  Snow reported on hole ${hole} for Bronder!`,
]

const newLeaderMessages = (name: string) => [
    `🏆 ${name} takes the lead!`,
    `🏆 ${name} is on fire and takes the lead!`,
    `🏆 New Leader Alert: ${name} is now in the lead!`,
    `🏆 All hail the new leader, ${name}!`,
    `🏆 ${name} just took the lead!`,
    `🏆 ${name} is now leading the pack!`
]

export function buildScoringAlerts(params: {
    playerName: string
    hole: number
    par: number
    prevGross: number | null
    newGross: number
    isNewLeader: boolean
}): ScoringAlert[] {
    const { playerName, hole, par, prevGross, newGross, isNewLeader } = params
    const alerts: ScoringAlert[] = []

    if (prevGross !== null && prevGross !== newGross) {
        alerts.push({ text: pick(correctionMessages(playerName, hole)), alertType: 'correction' })
        return alerts
    }

    if (prevGross === null) {
        const diff = newGross - par
        if (newGross == 8 && playerName.includes('Bronder')) {
            alerts.push({ text: pick(bronderMessages(hole)), alertType: 'negative' })
        }
        if (newGross === 1) {
            alerts.push({ text: pick(holeInOneMessages(playerName, hole)), alertType: 'positive' })
        } else if (diff <= -3) {
            alerts.push({ text: pick(albatrossMessages(playerName, hole)), alertType: 'positive' })
        } else if (diff === -2) {
            alerts.push({ text: pick(eagleMessages(playerName, newGross, hole)), alertType: 'positive' })
        } else if (diff === -1) {
            alerts.push({ text: pick(birdieMessages(playerName, hole)), alertType: 'positive' })
        } else if (diff >= 3) {
            alerts.push({ text: pick(tripleMessages(playerName, newGross, hole)), alertType: 'negative' })
        }

        if (isNewLeader) {
            alerts.push({ text: pick(newLeaderMessages(playerName)), alertType: 'leader' })
        }
    }

    return alerts
}
