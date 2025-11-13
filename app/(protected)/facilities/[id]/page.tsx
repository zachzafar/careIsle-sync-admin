"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ProtectedLayout } from "@/components/layout/protected-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { tsr } from "@/lib/api/tsr"
import { maskApiKey } from "@/lib/utils"
import { toast } from "sonner"

export default function FacilityDetailsPage() {
  // ... existing code ...
  const params = useParams()
  const facilityId = params?.id as string

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState("")
  const [newKeyModal, setNewKeyModal] = useState<{
    visible: boolean
    name: string
    key: string
  } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const tsrQueryClient = tsr.useQueryClient()

  const { data: facilityResp, isPending, error } = tsr.facilities.getOne.useQuery({
    queryKey: ["facility", facilityId],
    queryData: {
      params: { id: facilityId },
    },
  })

  useEffect(() => {
    const status = (error as any)?.status
    if (status && status !== 401) {
      toast.error("Failed to load facility details")
    }
  }, [error])

  const facility = useMemo(() => {
    return facilityResp?.status === 200 ? facilityResp.body : undefined
  }, [facilityResp])

  const apiKeys = useMemo(() => {
    return facility?.api_keys ?? []
  }, [facility])

  const facilityUniqueId = facility?.unique_id ?? ""

  const createMutation = tsr.keys.create.useMutation({
    onSuccess: (data) => {
      if (data.status === 201) {
        const created = data.body
        setNewKeyModal({ visible: true, name: created.name, key: created.key })
        toast.success("API key created", { description: `Key "${created.name}" created` })
        tsrQueryClient.invalidateQueries({ queryKey: ["facility", facilityId] })
      } else {
        toast.error("Failed to create key")
      }
    },
    onError: (err: any) => {
      const status = err?.status
      if (status === 400) {
        toast.error("Failed to create key", { description: "Facility is required." })
      } else if (status === 404) {
        const msg = err?.body?.message || "Facility not found"
        toast.error("Failed to create key", { description: msg })
      } else {
        toast.error("Failed to create key")
      }
    },
  })

  const deleteMutation = tsr.keys.delete.useMutation({
    onSuccess: (data) => {
      if (data.status === 200 && data.body?.deleted) {
        toast.success("API key deleted")
        tsrQueryClient.invalidateQueries({ queryKey: ["facility", facilityId] })
      } else {
        toast.error("Failed to delete key")
      }
    },
    onError: (err: any) => {
      const status = err?.status
      if (status === 404) {
        const msg = err?.body?.message || "Key not found"
        toast.error("Failed to delete key", { description: msg })
      } else {
        toast.error("Failed to delete key")
      }
    },
  })

  const onSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedFacility = facilityUniqueId.trim()
    const finalName = name.trim() || "API Key"
    if (!trimmedFacility) {
      toast.error("Facility unique ID is missing; cannot create a key.")
      return
    }
    createMutation.mutate({
      body: { facilityUniqueId: trimmedFacility, name: finalName },
    })
  }

  const onCopyFullKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      toast.success("Key copied")
    } catch {
      toast.error("Failed to copy key")
    }
  }

  const onCopyLast4 = async (key: string) => {
    try {
      const last4 = key.slice(-4)
      await navigator.clipboard.writeText(last4)
      toast.success("Last 4 copied")
    } catch {
      toast.error("Failed to copy")
    }
  }

  const onConfirmDelete = () => {
    if (!pendingDelete) return
    deleteMutation.mutate({
      params: { id: pendingDelete }, // backend expects the actual key string as id
      query: { facilityUniqueId },
      body: {},
    })
    setPendingDelete(null)
  }

  const disabled = !facilityUniqueId.trim()

  return (
    <ProtectedLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facility Details</h1>
          <p className="text-muted-foreground mt-2">View facility information and manage API keys</p>
        </div>
        <Button asChild>
          <Link href="/facilities">Back to Facilities</Link>
        </Button>
      </div>

      {/* Facility Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isPending ? (
            <div className="text-muted-foreground">Loading facility...</div>
          ) : facility ? (
            <>
              <div className="flex gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="text-sm">{facility.name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">EHR Type</div>
                  <Badge variant="secondary">{facility.ehr_type}</Badge>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="text-sm">{facility.email_id || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Unique ID</div>
                  <div className="font-mono text-sm text-muted-foreground">{facility.unique_id || "—"}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">Facility not found.</div>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!facilityUniqueId.trim() && (
            <div className="text-muted-foreground">
              Facility unique ID is missing; key actions are disabled.
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowCreateForm((v) => !v)}
              disabled={disabled}
            >
              {showCreateForm ? "Close" : "Create Key"}
            </Button>
          </div>

          {showCreateForm && (
            <form onSubmit={onSubmitCreate} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Key Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="API Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={disabled || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create API Key"}
              </Button>
            </form>
          )}

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Loading keys...
                    </TableCell>
                  </TableRow>
                ) : apiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No API keys yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeys.map((k) => (
                    <TableRow key={`${k.name}-${k.key.slice(-4)}`}>
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell className="font-mono text-sm">{maskApiKey(k.key)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" onClick={() => onCopyLast4(k.key)}>
                            Copy last 4
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => setPendingDelete(k.key)}
                            disabled={deleteMutation.isPending || disabled}
                          >
                            {deleteMutation.isPending && pendingDelete === k.key ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Success modal: shows the full key ONCE */}
      <Dialog open={!!newKeyModal?.visible} onOpenChange={(open: any) => !open && setNewKeyModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>Save this key now; it won’t be shown again.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label>Key Name</Label>
              <div className="text-sm">{newKeyModal?.name}</div>
            </div>
            <div className="space-y-1">
              <Label>Full Key</Label>
              <div className="font-mono text-sm break-all">{newKeyModal?.key}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onCopyFullKey(newKeyModal?.key || "")}>
              Copy key
            </Button>
            <Button onClick={() => setNewKeyModal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this key?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedLayout>
  )
}