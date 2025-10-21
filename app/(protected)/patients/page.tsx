"use client"

import { useState } from "react"
import { ProtectedLayout } from "@/components/layout/protected-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Upload } from "lucide-react"
import Link from "next/link"
import { tsr } from "@/lib/api/tsr"
import { CreatePatientDialog } from "@/components/patients/create-patient-dialog"

export default function PatientsPage() {
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isPending } = tsr.patients.getAll.useQuery({
    queryKey: ["patients"],
  })

  const patients = data?.status === 200 ? data.body : []

  const filteredPatients = patients?.filter(
    (patient) =>
      patient.first_name.toLowerCase().includes(search.toLowerCase()) ||
      patient.last_name.toLowerCase().includes(search.toLowerCase()) ||
      patient.email_id?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
            <p className="text-muted-foreground mt-2">Manage patient records across facilities</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/patients/bulk-upload">
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Patient
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
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
                <TableHead>Date of Birth</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Origin Facility</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading patients...
                  </TableCell>
                </TableRow>
              ) : filteredPatients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No patients found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients?.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">
                      {patient.first_name} {patient.last_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{patient.dob}</TableCell>
                    <TableCell className="text-muted-foreground">{patient.gender}</TableCell>
                    <TableCell className="text-muted-foreground">{patient.email_id || "—"}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {patient.origin_facility_id}
                    </TableCell>
                    <TableCell>
                      {patient.isDuplicate && <Badge variant="destructive">Duplicate</Badge>}
                      {patient.synced_facilities && patient.synced_facilities.length > 0 && (
                        <Badge variant="secondary">Synced ({patient.synced_facilities.length})</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreatePatientDialog open={createOpen} onOpenChange={setCreateOpen} />
    </ProtectedLayout>
  )
}
