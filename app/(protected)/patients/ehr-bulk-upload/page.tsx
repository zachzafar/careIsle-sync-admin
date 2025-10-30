"use client"

import { ProtectedLayout } from "@/components/layout/protected-layout"
import { BulkUploadPanel } from "@/components/ehr/bulk-upload-panel"

export default function EhrBulkUploadPage() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">EHR Bulk Upload</h1>
        <p className="text-muted-foreground">
          Start a background bulk upload for selected facilities. You’ll see a processing toast and status panel.
        </p>
        <BulkUploadPanel />
      </div>
    </ProtectedLayout>
  )
}