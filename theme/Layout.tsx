import { Layout as DefaultLayout } from '@rspress/core/theme-original'
import { ProjectSidebar } from './ProjectSidebar'
import './layout.css'

export function Layout () {
  return (
    <div className="project-layout">
      <ProjectSidebar activeProject="cssx" />
      <div className="project-layout-content">
        <DefaultLayout />
      </div>
    </div>
  )
}
