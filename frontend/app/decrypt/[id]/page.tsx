import { DashboardLayout } from "@/components/dashboard-layout"
import { DecryptView } from "@/components/decrypt-view"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default async function DecryptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <DecryptView messageId={id} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
