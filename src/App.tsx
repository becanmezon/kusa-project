import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { MemberPage } from './pages/MemberPage'
import { AdminPage } from './pages/AdminPage'
import { DisplayPage } from './pages/DisplayPage'
import { CatchPage } from './pages/CatchPage'
import { RouteError } from './pages/RouteError'
import { SummaryPage } from './pages/SummaryPage'

const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/',        element: <MemberPage /> },
      { path: '/admin',   element: <AdminPage /> },
      { path: '/display', element: <DisplayPage /> },
      { path: '/catch',   element: <CatchPage /> },
      { path: '/summary', element: <SummaryPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
