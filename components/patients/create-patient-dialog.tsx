"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { tsr } from "@/lib/api/tsr"
import { toast } from "sonner"

interface CreatePatientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePatientDialog({ open, onOpenChange }: CreatePatientDialogProps) {
  const tsrQueryClient = tsr.useQueryClient()

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    dob: "",
    gender: "male",
    email_id: "",
    origin_facility_id: "",
    identifier_type: "NATIONAL_ID" as const,
    identifier_value: "",
  })

  const { data: facilitiesData } = tsr.facilities.getAll.useQuery({
    queryKey: ["facilities"],
  })

  const facilities = facilitiesData?.status === 200 ? facilitiesData.body : []

  const { mutate, isPending } = tsr.patients.create.useMutation({
    onSuccess: (data) => {
      if (data.status === 201) {
        tsrQueryClient.patients.getAll.setQueryData(["patients"], (old) => {
          if (old?.status === 200) {
            return {
              ...old,
              body: [...old.body, data.body],
            }
          }
          return old
        })
        toast.success("Patient created", {
          description: "The patient record has been created successfully",
        })
        onOpenChange(false)
        setFormData({
          first_name: "",
          last_name: "",
          dob: "",
          gender: "male",
          email_id: "",
          origin_facility_id: "",
          identifier_type: "NATIONAL_ID",
          identifier_value: "",
        })
      }
    },
    onError: () => {
      toast.error("Error", {
        description: "Failed to create patient",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      dob: formData.dob,
      gender: formData.gender,
      email_id: formData.email_id || undefined,
      origin_facility_id: formData.origin_facility_id,
      patient_identifiers: [
        {
          type: formData.identifier_type,
          value: formData.identifier_value,
        },
      ],
      demographics: {},
    }

    mutate({ body: payload })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Patient</DialogTitle>
          <DialogDescription>Add a new patient record to the system</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_id">Email</Label>
            <Input
              id="email_id"
              type="email"
              value={formData.email_id}
              onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="origin_facility_id">Origin Facility *</Label>
            <Select
              value={formData.origin_facility_id}
              onValueChange={(value) => setFormData({ ...formData, origin_facility_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                {facilities?.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id!}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="identifier_type">Identifier Type *</Label>
              <Select
                value={formData.identifier_type}
                onValueChange={(value: any) => setFormData({ ...formData, identifier_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATIONAL_ID">National ID</SelectItem>
                  <SelectItem value="PASSPORT">Passport</SelectItem>
                  <SelectItem value="SYSTEM_ID">System ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="identifier_value">Identifier Value *</Label>
              <Input
                id="identifier_value"
                value={formData.identifier_value}
                onChange={(e) => setFormData({ ...formData, identifier_value: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Patient"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
