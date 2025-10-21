"use client"

import { ProtectedLayout } from "@/components/layout/protected-layout"
import { FacilityForm } from "@/components/facilities/facility-form"

export default function CreateFacilityPage() {
  return (
    <ProtectedLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Facility</h1>
          <p className="text-muted-foreground mt-2">Add a new healthcare facility to the system</p>
        </div>
        <FacilityForm />
      </div>
    </ProtectedLayout>
  )
}
