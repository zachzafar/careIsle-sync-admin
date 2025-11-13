import * as React from "react"
import { tsr } from "@/lib/api/tsr"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

type MergeState = "idle" | "loading" | "success" | "error"

export function MergePatientsForm(props: {
  prefillPrimaryId?: string
  prefillSecondaryIds?: string[]
  onMerged?: () => void
}) {
  const { prefillPrimaryId = "", prefillSecondaryIds = [], onMerged } = props

  const [primaryId, setPrimaryId] = React.useState<string>(prefillPrimaryId)
  const [secondaryIds, setSecondaryIds] = React.useState<string[]>(prefillSecondaryIds)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [state, setState] = React.useState<MergeState>("idle")

  const { mutateAsync: mergePatients, isPending } = tsr.ehr.merge.useMutation()

  const toggleSecondary = (id: string, checked: boolean) => {
    setSecondaryIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const onSubmit = async () => {
    if (!primaryId || secondaryIds.length === 0) {
      toast("Select a primary and at least one secondary patient ID")
      return
    }
    setConfirmOpen(true)
  }

  const onConfirm = async () => {
    setConfirmOpen(false)
    setState("loading")
    try {
      const res = await mergePatients({
        body: {
          merge_info: secondaryIds.map((sec) => ({
            primary_patient_id: primaryId,
            secondary_patient_ids: sec,
          })),
        },
      })
      if (res.status >= 200 && res.status < 300) {
        setState("success")
        toast("Merge complete", {
          description: `Merged ${res.body.successful.length} patients`,
        })
        onMerged?.()
      } else {
        setState("error")
        toast("Merge failed", {
          description: (res.body as any)?.message ?? "Unknown error",
        })
      }
    } catch (err: any) {
      setState("error")
      toast("Network error during merge", {
        description: err?.message ?? String(err),
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Merge Patients</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="primaryId">Primary Patient ID</Label>
          <Input id="primaryId" value={primaryId} onChange={(e) => setPrimaryId(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Secondary Patient IDs</Label>
          <div className="space-y-2">
            {/* For demo purposes, allow manual entry using an input and add button */}
            <AddSecondary onAdd={(id) => toggleSecondary(id, true)} />
            <div className="space-y-1">
              {secondaryIds.map((id) => (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox checked={true} onCheckedChange={(checked:any) => toggleSecondary(id, !!checked)} />
                  <span>{id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button onClick={onSubmit} disabled={isPending}>
          {isPending ? "Merging…" : "Merge"}
        </Button>

        {state === "loading" && <div className="text-sm text-muted-foreground">Merging…</div>}
        {state === "success" && <div className="text-sm">Merge completed successfully.</div>}
        {state === "error" && <div className="text-sm text-destructive">Merge failed. Check toast for details.</div>}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Merge</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div>Primary ID: {primaryId}</div>
            <div>Secondary IDs: {secondaryIds.join(", ")}</div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onConfirm}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function AddSecondary(props: { onAdd: (id: string) => void }) {
  const [value, setValue] = React.useState("")
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Secondary patient ID"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        variant="outline"
        onClick={() => {
          if (!value) return
          props.onAdd(value)
          setValue("")
        }}
      >
        Add
      </Button>
    </div>
  )
}