import { DashboardLayout } from "@/components/dashboard-layout"
import { ComposeForm } from "@/components/compose-form"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function Home() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <ComposeForm />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
