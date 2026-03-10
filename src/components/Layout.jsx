import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-col">
        <div className="content-area">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
