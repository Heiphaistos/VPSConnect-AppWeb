import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-base-950 bg-grid">
      <Sidebar />
      <div className="flex-1 ml-[220px] flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  )
}
