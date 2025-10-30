"use client"

import * as React from "react"
import { tsr } from "@/lib/api/tsr"
import { DuplicatesView } from "@/components/ehr/duplicates-view"
import { MergePatientsForm } from "@/components/ehr/merge-patients-form"
import { ProtectedLayout } from "@/components/layout/protected-layout"

export default function DuplicatesAndMergePage() {
  const tsrQueryClient = tsr.useQueryClient()
  const [prefill, setPrefill] = React.useState<{ primary?: string; secondary?: string[] }>({})

  return (
    <ProtectedLayout>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DuplicatesView
          onPrefillMerge={(primary, secondary) => {
            setPrefill({ primary, secondary })
          }}
        />
        <MergePatientsForm
          prefillPrimaryId={prefill.primary}
          prefillSecondaryIds={prefill.secondary ?? []}
          onMerged={() => {
            // After a successful merge, refresh duplicates listing
            tsrQueryClient.invalidateQueries({ queryKey: ["ehr", "duplicates"] })
          }}
        />
      </div>
    </ProtectedLayout>
  )
}