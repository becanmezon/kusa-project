import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { MemberPage } from './pages/MemberPage'
import { AdminPage } from './pages/AdminPage'

const router = createBrowserRouter([
  { path: '/',      element: <MemberPage /> },
  { path: '/admin', element: <AdminPage /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
