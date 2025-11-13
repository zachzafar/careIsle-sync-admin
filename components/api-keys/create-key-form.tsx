"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { tsr } from "@/lib/api/tsr"
import type { ApiKey } from "@/lib/api/contract"
import { toast } from "sonner"

interface CreateKeyFormProps {
  facilityUniqueId: string
  setFacilityUniqueId: (v: string) => void
  name: string
  setName: (v: string) => void
  onCreated: (key: ApiKey) => void
}

export function CreateKeyForm({
  facilityUniqueId,
  setFacilityUniqueId,
  name,
  setName,
  onCreated,
}: CreateKeyFormProps) {
  const createMutation = tsr.keys.create.useMutation({
    onSuccess: (data) => {
      if (data.status === 201) {
        const created = data.body
        onCreated(created)
        toast.success("API key created", {
          description: `Key "${created.name}" for facility ${created.facility_unique_id}`,
        })
      } else {
        toast.error("Unexpected error; try again")
      }
    },
    onError: (error: any) => {
      const status = error?.status
      if (status === 400) {
        toast.error("Facility is required")
      } else if (status === 404) {
        const msg = error?.body?.message || "Facility not found"
        toast.error(msg)
      } else {
        toast.error("Unexpected error; try again")
      }
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedFacility = facilityUniqueId.trim()
    const finalName = name.trim() || "API Key"

    if (!trimmedFacility) {
      toast.error("Facility is required")
      return
    }

    createMutation.mutate({
      body: { facilityUniqueId: trimmedFacility, name: finalName },
    })
  }

  useEffect(() => {
    // No logging of sensitive values
    // Ensure UI disables actions without facility ID
  }, [])

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="facilityUniqueId">Facility Unique ID</Label>
            <Input
              id="facilityUniqueId"
              placeholder="e.g. FAC-12345"
              value={facilityUniqueId}
              onChange={(e) => setFacilityUniqueId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Key Name (optional)</Label>
            <Input
              id="name"
              placeholder="API Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={!facilityUniqueId.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create API Key"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}