"use client"

import { useState } from "react"
import { ProtectedLayout } from "@/components/layout/protected-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { tsr } from "@/lib/api/tsr"
import { toast } from "sonner"
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

export default function FacilitiesPage() {
  const [search, setSearch] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const tsrQueryClient = tsr.useQueryClient()

  const { data, isPending } = tsr.facilities.getAll.useQuery({
    queryKey: ["facilities"],
  })

  const { mutate: deleteFacility } = tsr.facilities.delete.useMutation({
    onMutate: async (variables) => {
      // Get current facilities for rollback
      const lastGoodKnown = tsrQueryClient.facilities.getAll.getQueryData(["facilities"])

      // Optimistically remove the facility
      tsrQueryClient.facilities.getAll.setQueryData(["facilities"], (old) => {
        if (old?.status === 200) {
          return {
            ...old,
            body: old.body.filter((f) => f.id !== variables.params.id),
          }
        }
        return old
      })

      return { lastGoodKnown }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.lastGoodKnown) {
        tsrQueryClient.facilities.getAll.setQueryData(["facilities"], context.lastGoodKnown)
      }
      toast.error("Error", {
        description: "Failed to delete facility",
      })
    },
    onSuccess: () => {
      toast.success("Facility deleted", {
        description: "The facility has been removed successfully",
      })
      setDeleteId(null)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      tsrQueryClient.invalidateQueries({ queryKey: ["facilities"] })
    },
  })

  const facilities = data?.status === 200 ? data.body : []

  const filteredFacilities = facilities?.filter(
    (facility) =>
      facility.name.toLowerCase().includes(search.toLowerCase()) ||
      facility.ehr_type.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Facilities</h1>
            <p className="text-muted-foreground mt-2">Manage healthcare facilities and EHR integrations</p>
          </div>
          <Button asChild>
            <Link href="/facilities/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Facility
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search facilities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>EHR Type</TableHead>
                <TableHead>Email ID</TableHead>
                <TableHead>Unique ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading facilities...
                  </TableCell>
                </TableRow>
              ) : filteredFacilities?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No facilities found
                  </TableCell>
                </TableRow>
              ) : (
                filteredFacilities?.map((facility) => (
                  <TableRow key={facility.id}>
                    <TableCell className="font-medium">{facility.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{facility.ehr_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{facility.email_id || "—"}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {facility.unique_id || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/facilities/${facility.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/facilities/${facility.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(facility.id!)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Facility</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this facility? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteFacility({ params: { id: deleteId }, body: {} })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedLayout>
  )
}
