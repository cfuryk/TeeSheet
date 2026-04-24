export interface BropenParticipant {
    name: string
    email: string
    phone: string
}

export const BROPEN_2026_PARTICIPANTS: BropenParticipant[] = [
    { name: 'Kyle Dowler', email: 'wvukyle@gmail.com', phone: '4125141302' },
    { name: 'Chris Furyk', email: 'chris.furyk@yahoo.com', phone: '4122253394' },
    { name: 'Kris Koeppl', email: 'Kris.koeppl@gmail.com', phone: '4122876381' },
    { name: 'Justin Granger', email: 'justin.granger01@gmail.com', phone: '4128494933' },
    { name: 'Steve Hart', email: 'sdhart211@gmail.com', phone: '4128481746' },
    { name: 'Steve Bronder', email: 'srbronder@gmail.com', phone: '4126386668' },
    { name: 'Nick Wasylik', email: 'nwasylik@gmail.com', phone: '7248753144' },
    { name: 'Josh Dvorchak', email: 'Dvo1293@hotmail.com', phone: '7245571616' },
    { name: 'Eric Kirsch', email: 'Ekirsch22@gmail.com', phone: '4125766711' },
    { name: 'Sean Blackwell', email: 'seanblackwell22@gmail.com', phone: '4125081222' },
    { name: 'Brandon Doughty', email: 'bdoughty66@gmail.com', phone: '4122771960' },
    { name: 'Ryan Zelder', email: 'zelerdds@gmail.com', phone: '4125598731' },
    { name: 'Brandon Pfaff', email: 'brandon.pfaff14@gmail.com', phone: '4124802111' },
    { name: 'Ryan Shoplik', email: 'rshoplik@gmail.com', phone: '4129778606' },
    { name: 'Matt Slogan', email: 'Mc.slogan22@gmail.com', phone: '4126064209' },
    { name: 'John Nagurney', email: 'nagurneyjohn@gmail.com', phone: '4127206543' },
    { name: 'David Furyk', email: 'dfuryk10@gmail.com', phone: '4124270037' },
    { name: 'Paul White', email: 'Paulwhite333666789@gmail.com', phone: '6232253482' },
    { name: 'Isaac Segar', email: 'Isaac.segar@yahoo.com', phone: '2489147306' },
    { name: 'Jeff Douglas', email: 'Jdouglas22@gmail.com', phone: '3135881298' },
    { name: 'Rob Farmerie', email: 'Rjfarmerie@gmail.com', phone: '4129563030' },
    { name: 'Josh Hickey', email: 'Jhickey36@yahoo.com', phone: '4127798756' },
    { name: 'Rick Kesich', email: 'Rkesich@gmail.com', phone: '4127205060' },
    { name: 'JR Measures', email: 'jrmeasures1@gmail.com', phone: '4127797021' },
]

export const ROOM_ASSIGNMENTS: [string, string][] = [
    ['Josh Hickey', 'Ryan Zelder'],
    ['Kyle Dowler', 'Nick Wasylik'],
    ['David Furyk', 'Jeff Douglas'],
    ['Isaac Segar', 'Paul White'],
    ['Matt Slogan', 'John Nagurney'],
    ['Steve Bronder', 'Justin Granger'],
    ['Rick Kesich', 'Steve Hart'],
    ['Kris Koeppl', 'Brandon Pfaff'],
    ['Chris Furyk', 'Rob Farmerie'],
    ['Josh Dvorchak', 'Eric Kirsch'],
    ['Ryan Shoplik', 'JR Measures'],
    ['Sean Blackwell', 'Brandon Doughty'],
]

export function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return raw
}

export function getInitials(name: string): string {
    return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}
