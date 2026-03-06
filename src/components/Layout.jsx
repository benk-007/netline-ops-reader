import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout({ filters, onFilterChange }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-col">
        <Topbar filters={filters} onFilterChange={onFilterChange} />
        <div className="content-area">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
