import * as React from "react"
import { tsr } from "@/lib/api/tsr"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

type UploadState = "idle" | "loading" | "success" | "error"

export function BulkUploadPanel() {
  const tsrQueryClient = tsr.useQueryClient()
  const { data: facilitiesResponse } = tsr.facilities.getAll.useQuery({
    queryKey: ["facilities"],
  })

 const facilities = facilitiesResponse?.body ?? []

  const [facilityId, setFacilityId] = React.useState<string>("")
  const [state, setState] = React.useState<UploadState>("idle")
  const [statusPayload, setStatusPayload] = React.useState<{
    message: string
    facilityId: string
    status: "processing"
    startedAt: string
  } | null>(null)

  const { mutateAsync: startBulkUpload, isPending } = tsr.ehr.bulkUploadFromFacility.useMutation()

  const onStart = async () => {
    if (!facilityId) {
      toast("Please select a facility")
      return
    }
    setState("loading")
    try {
      const res = await startBulkUpload({
        body: { facility_id: facilityId },
      })
      if (res.status >= 200 && res.status < 300) {
        setStatusPayload(res.body as any)
        setState("success")
        toast("Bulk upload started", {
          description: `Status: processing · Facility: ${facilityId}`,
        })
      } else {
        setState("error")
        toast("Failed to start bulk upload", {
          description: (res.body as any)?.message ?? "Unknown error",
        })
      }
    } catch (err: any) {
      setState("error")
      toast("Network error while starting bulk upload", {
        description: err?.message ?? String(err),
      })
    } finally {
      // optional: invalidate any related queries
      tsrQueryClient.invalidateQueries({ queryKey: ["patients"] })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload From Facility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Select value={facilityId} onValueChange={setFacilityId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a facility" />
            </SelectTrigger>
            <SelectContent>
              {(facilities ?? []).map((f) => (
                <SelectItem key={f.id} value={f.id!}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onStart} disabled={isPending || !facilityId}>
            {isPending ? "Starting..." : "Start Bulk Upload"}
          </Button>
        </div>

        {state === "loading" && (
          <div className="text-sm text-muted-foreground">Processing…</div>
        )}
        {state === "success" && statusPayload && (
          <div className="text-sm">
            <div>Message: {statusPayload.message}</div>
            <div>Facility: {statusPayload.facilityId}</div>
            <div>Status: {statusPayload.status}</div>
            <div>Started At: {new Date(statusPayload.startedAt).toLocaleString()}</div>
          </div>
        )}
        {state === "error" && (
          <div className="text-sm text-destructive">An error occurred. Check the toast for details.</div>
        )}
      </CardContent>
    </Card>
  )
}