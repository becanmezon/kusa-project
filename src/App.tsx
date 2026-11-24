import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { MemberPage } from './pages/MemberPage'
import { RouteError } from './pages/RouteError'

// 「今日」の画面（MemberPage）だけを最初に読み込み、ほかの画面は開いたときに読み込む
const AdminPage   = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))
const DisplayPage = lazy(() => import('./pages/DisplayPage').then(m => ({ default: m.DisplayPage })))
const CatchPage   = lazy(() => import('./pages/CatchPage').then(m => ({ default: m.CatchPage })))
const MarchPage   = lazy(() => import('./pages/MarchPage').then(m => ({ default: m.MarchPage })))
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
      { path: '/march',   element: page(<MarchPage />) },
      { path: '/summary', element: page(<SummaryPage />) },
      { path: '/classic', element: <MemberPage variant="classic" /> },
      // 以前あった紙の当番表デザインのURLは、旧デザインへ送る
      { path: '/paper',   element: <Navigate to="/classic" replace /> },
      { path: '/paper/summary', element: <Navigate to="/summary" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
