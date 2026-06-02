import { DashboardLayout } from "@/components/dashboard-layout"
import { InboxList } from "@/components/inbox-list"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function InboxPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <InboxList folder="inbox" />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
