import * as React from "react"
import { tsr } from "@/lib/api/tsr"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function FacilitySyncToggle(props: {
  facilityId: string
  initialCanSync: boolean
  onUpdated?: (nextCanSync: boolean) => void
}) {
  const { facilityId, initialCanSync, onUpdated } = props
  const [canSync, setCanSync] = React.useState<boolean>(initialCanSync)
  const [isLoading, setIsLoading] = React.useState(false)

  const { mutateAsync: updateCanSync } = tsr.ehr.updateCanSync.useMutation()

  const onChange = async (checked: boolean) => {
    setIsLoading(true)
    const previous = canSync
    setCanSync(checked)
    try {
      const res = await updateCanSync({
        body: { facility_id: facilityId, can_sync: checked },
      })
      if (res.status >= 200 && res.status < 300) {
        toast("Sync status updated", {
          description: `Facility ${facilityId} can_sync = ${checked}`,
        })
        onUpdated?.(checked)
      } else {
        // Backend validation error (e.g., duplicates exist)
        setCanSync(previous)
        toast("Unable to update sync status", {
          description: (res.body as any)?.message ?? "Resolve duplicates first",
        })
      }
    } catch (err: any) {
      setCanSync(previous)
      toast("Network error updating sync status", {
        description: err?.message ?? String(err),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={`sync-${facilityId}`}>Can Sync</Label>
      <Switch id={`sync-${facilityId}`} checked={canSync} onCheckedChange={onChange} disabled={isLoading} />
    </div>
  )
}