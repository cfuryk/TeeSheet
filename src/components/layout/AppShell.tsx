import { Outlet } from 'react-router-dom'
import { TopNav } from './TopNav'

export function AppShell() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <TopNav />
      <main className="flex-1 pt-4 px-4 pb-8 max-w-lg mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
