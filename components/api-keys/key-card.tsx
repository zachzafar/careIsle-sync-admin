"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import type { ApiKey } from "@/lib/api/contract"
import { tsr } from "@/lib/api/tsr"
import { toast } from "sonner"

interface KeyCardProps {
  keyDoc: ApiKey
  facilityUniqueId: string
  onDeleted: (id: string) => void
}

export function KeyCard({ keyDoc, facilityUniqueId, onDeleted }: KeyCardProps) {
  const [open, setOpen] = useState(false)

  const deleteMutation = tsr.keys.delete.useMutation({
    onSuccess: (data) => {
      if (data.status === 200 && data.body?.deleted) {
        onDeleted(keyDoc._id)
        toast.success("API key deleted", {
          description: `Key "${keyDoc.name}" removed`,
        })
      } 
       else {
        toast.error("Unexpected error; try again")
      }
    },
    onError: (error: any) => {
      const status = error?.status
      if (status === 404) {
        const msg = error?.body?.message || "Key not found"
        toast.error(msg)
      } else {
        toast.error("Unexpected error; try again")
      }
    },
  })

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(keyDoc.key)
      toast.success("Key copied")
    } catch {
      toast.error("Failed to copy key")
    }
  }

  const onConfirmDelete = () => {
    deleteMutation.mutate({
        params: { id: keyDoc._id },
        query: { facilityUniqueId },
        body: {},
    })
    setOpen(false)
  }

  const disabled = !facilityUniqueId.trim() || deleteMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{keyDoc.name}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCopy}>
              Copy key
            </Button>
            <Button
              variant="destructive"
              onClick={() => setOpen(true)}
              disabled={disabled}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-muted-foreground">ID: {keyDoc._id}</div>
        <div className="text-sm">Facility: {keyDoc.facility_unique_id}</div>
        <div className="text-sm">Active: {keyDoc.active ? "Yes" : "No"}</div>
        <div className="text-sm">Created: {new Date(keyDoc.createdAt).toLocaleString()}</div>
        <div className="text-sm">Updated: {new Date(keyDoc.updatedAt).toLocaleString()}</div>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this key?</AlertDialogTitle>
              <AlertDialogDescription>
                Delete this key? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}