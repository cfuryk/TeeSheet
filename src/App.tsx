import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { TeeSheetPage } from '@/pages/TeeSheetPage'
import { CreateRoundPage } from '@/pages/CreateRoundPage'
import { CreateRoundChoicePage } from '@/pages/CreateRoundChoicePage'
import { SimpleScorePage } from '@/pages/SimpleScorePage'
import { EditRoundPage } from '@/pages/EditRoundPage'
import { RoundDetailPage } from '@/pages/RoundDetailPage'
import { GroupPage } from '@/pages/GroupPage'
import { ScorecardPage } from '@/pages/ScorecardPage'
import { SigningPage } from '@/pages/SigningPage'
import { RoundSummaryPage } from '@/pages/RoundSummaryPage'
import { PlayerScorecardPage } from '@/pages/PlayerScorecardPage'
import { CreateEventPage } from '@/pages/CreateEventPage'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { MyRoundsPage } from '@/pages/MyRoundsPage'
import { MyScoresPage } from '@/pages/MyScoresPage'
import { MyEventsPage } from '@/pages/MyEventsPage'
import { MyBetsPage } from '@/pages/MyBetsPage'
import { CourseListPage } from '@/pages/CourseListPage'
import { CourseDetailPage } from '@/pages/CourseDetailPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminRoundsPage } from '@/pages/admin/AdminRoundsPage'
import { AdminEventsPage } from '@/pages/admin/AdminEventsPage'
import { AdminScoresPage } from '@/pages/admin/AdminScoresPage'
import { AdminBetsPage } from '@/pages/admin/AdminBetsPage'
import { InvitePage } from '@/pages/InvitePage'
import { SideBetsPage } from '@/pages/SideBetsPage'
import { SideBetDetailPage } from '@/pages/SideBetDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* AppShell wraps all page routes; home is public */}
          <Route element={<AppShell />}>
            {/* Public home */}
            <Route path="/" element={<TeeSheetPage />} />

            {/* Protected routes */}
            <Route path="/rounds/new" element={<ProtectedRoute><CreateRoundChoicePage /></ProtectedRoute>} />
            <Route path="/rounds/new/full" element={<ProtectedRoute><CreateRoundPage /></ProtectedRoute>} />
            <Route path="/rounds/new/score" element={<ProtectedRoute><SimpleScorePage /></ProtectedRoute>} />
            <Route path="/rounds/:roundId" element={<ProtectedRoute><RoundDetailPage /></ProtectedRoute>} />
            <Route path="/rounds/:roundId/edit" element={<ProtectedRoute><EditRoundPage /></ProtectedRoute>} />
            <Route path="/rounds/:roundId/groups/:groupId" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
            <Route path="/rounds/:roundId/groups/:groupId/scorecard" element={<ProtectedRoute><ScorecardPage /></ProtectedRoute>} />
            <Route path="/rounds/:roundId/groups/:groupId/sign" element={<ProtectedRoute><SigningPage /></ProtectedRoute>} />
            <Route path="/rounds/:roundId/summary" element={<ProtectedRoute><RoundSummaryPage /></ProtectedRoute>} />
            <Route path="/rounds/:roundId/scorecard/:golferId" element={<ProtectedRoute><PlayerScorecardPage /></ProtectedRoute>} />
            <Route path="/rounds/:roundId/side-bets" element={<ProtectedRoute><SideBetsPage /></ProtectedRoute>} />
            <Route path="/rounds/:roundId/side-bets/:sideBetId" element={<ProtectedRoute><SideBetDetailPage /></ProtectedRoute>} />

            {/* Redirect old lobby URL */}
            <Route path="/rounds/:roundId/lobby" element={<Navigate to=".." relative="path" replace />} />

            <Route path="/events/new" element={<ProtectedRoute><CreateEventPage /></ProtectedRoute>} />
            <Route path="/events/:eventId" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />

            <Route path="/my-rounds" element={<ProtectedRoute><MyRoundsPage /></ProtectedRoute>} />
            <Route path="/my-scores" element={<ProtectedRoute><MyScoresPage /></ProtectedRoute>} />
            <Route path="/my-events" element={<ProtectedRoute><MyEventsPage /></ProtectedRoute>} />
            <Route path="/my-bets" element={<ProtectedRoute><MyBetsPage /></ProtectedRoute>} />

            <Route path="/courses" element={<ProtectedRoute><CourseListPage /></ProtectedRoute>} />
            <Route path="/courses/new" element={<ProtectedRoute><CourseDetailPage /></ProtectedRoute>} />
            <Route path="/courses/:courseId" element={<ProtectedRoute><CourseDetailPage /></ProtectedRoute>} />

            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/admin/rounds" element={<ProtectedRoute requireAdmin><AdminRoundsPage /></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute requireAdmin><AdminEventsPage /></ProtectedRoute>} />
            <Route path="/admin/scores" element={<ProtectedRoute requireAdmin><AdminScoresPage /></ProtectedRoute>} />
            <Route path="/admin/bets" element={<ProtectedRoute requireAdmin><AdminBetsPage /></ProtectedRoute>} />

            <Route path="/invite/:token" element={<InvitePage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
