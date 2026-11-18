import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { MemberPage } from './pages/MemberPage'
import { RouteError } from './pages/RouteError'

// 「今日」の画面（MemberPage）だけを最初に読み込み、ほかの画面は開いたときに読み込む
const AdminPage   = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))
const DisplayPage = lazy(() => import('./pages/DisplayPage').then(m => ({ default: m.DisplayPage })))
const CatchPage   = lazy(() => import('./pages/CatchPage').then(m => ({ default: m.CatchPage })))
const SummaryPage = lazy(() => import('./pages/SummaryPage').then(m => ({ default: m.SummaryPage })))

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-soil-500 text-sm" role="status">
      読み込み中…
    </div>
  )
}

const page = (el: ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>

const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/',        element: <MemberPage /> },
      { path: '/admin',   element: page(<AdminPage />) },
      { path: '/display', element: page(<DisplayPage />) },
      { path: '/catch',   element: page(<CatchPage />) },
      { path: '/summary', element: page(<SummaryPage />) },
      { path: '/paper',   element: <MemberPage variant="paper" /> },
      { path: '/paper/summary', element: page(<SummaryPage variant="paper" />) },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
