import * as React from "react"
import { tsr } from "@/lib/api/tsr"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

type DuplicatesState = "idle" | "loading" | "success" | "error"

export type DuplicateGroups = Record<string, any[]>

export function DuplicatesView(props: {
  onPrefillMerge?: (primaryId: string, secondaryIds: string[]) => void
}) {
  const { onPrefillMerge } = props
  const { data: facilitiesResponse } = tsr.facilities.getAll.useQuery({
    queryKey: ["facilities"],
  })

  const facilities = facilitiesResponse?.body ?? []
  const [facilityId, setFacilityId] = React.useState<string>("")

  const { data: duplicatesResponse, isPending, status, error } = tsr.ehr.getDuplicates.useQuery(
    {
      queryKey: ["ehr", "duplicates", facilityId],
      queryData: {
        params: { facility_id: facilityId },
      },
      enabled: !!facilityId,
    } 
  ) 

  const duplicates = duplicatesResponse?.body ?? {}

  const viewState: DuplicatesState = !facilityId
    ? "idle"
    : isPending
    ? "loading"
    : status === "success"
    ? "success"
    : "error"

  React.useEffect(() => {
    if (!isPending && status === "error") {
      toast("Failed to fetch duplicates", {
        description: (error as any)?.message ?? "Unknown error",
      })
    }
  }, [isPending, status, error])

  const groups = (duplicates ?? {}) as DuplicateGroups

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duplicates by Facility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {viewState === "idle" && (
          <div className="text-sm text-muted-foreground">Select a facility to view duplicates.</div>
        )}

        {viewState === "loading" && (
          <div className="text-sm text-muted-foreground">Loading duplicates…</div>
        )}

        {viewState === "success" && (
          <div className="space-y-6">
            {Object.entries(groups).length === 0 && (
              <div className="text-sm">No duplicates detected for this facility.</div>
            )}
            {Object.entries(groups).map(([primaryId, duplicates]) => (
              <div key={primaryId} className="space-y-2">
                <div className="font-medium">Primary candidate: {primaryId}</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>System ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>DOB</TableHead>
                      <TableHead>Gender</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {duplicates.map((p: any) => (
                      <TableRow key={p.system_id ?? `${p.first_name}-${p.last_name}-${p.dob}`}>
                        <TableCell>{p.system_id ?? "-"}</TableCell>
                        <TableCell>
                          {p.first_name} {p.last_name}
                        </TableCell>
                        <TableCell>{p.dob}</TableCell>
                        <TableCell>{p.gender}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="secondary"
                  onClick={() =>
                    onPrefillMerge?.(primaryId, duplicates.map((p: any) => p.system_id).filter(Boolean))
                  }
                >
                  Prefill Merge Form for this group
                </Button>
              </div>
            ))}
          </div>
        )}

        {viewState === "error" && (
          <div className="text-sm text-destructive">Failed to load duplicates. Check toast for details.</div>
        )}
      </CardContent>
    </Card>
  )
}