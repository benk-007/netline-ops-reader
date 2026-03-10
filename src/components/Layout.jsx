import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar  from './TopBar'

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-col">
        <TopBar />
        <div className="content-area">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
