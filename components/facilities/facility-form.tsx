"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { tsr } from "@/lib/api/tsr"
import { toast } from "sonner"
import type { FacilityType } from "@/lib/api/contract"

interface FacilityFormProps {
  facility?: FacilityType
  isEdit?: boolean
}

export function FacilityForm({ facility, isEdit }: FacilityFormProps) {
  const router = useRouter()
  const tsrQueryClient = tsr.useQueryClient()

  const [formData, setFormData] = useState({
    name: facility?.name || "",
    email_id: facility?.email_id || "",
    unique_id: facility?.unique_id || "",
    ehr_type: facility?.ehr_type || "charm",
    credentialType: facility?.api_credentials.type || "oauth2",
    client_id: facility?.api_credentials.client_id || "",
    client_secret: facility?.api_credentials.client_secret || "",
    api_key: facility?.api_credentials.api_key || "",
    token_url: facility?.api_credentials.token_url || "",
    webhook_secret: facility?.webhook_secret || "",
    refresh_token: facility?.api_credentials.refresh_token || "",
  })

  const createMutation = tsr.facilities.create.useMutation({
    onSuccess: (data) => {
      if (data.status === 201) {
        tsrQueryClient.facilities.getAll.setQueryData(["facilities"], (old) => {
          if (old?.status === 200) {
            return {
              ...old,
              body: [...old.body, data.body],
            }
          }
          return old
        })
        toast.success("Facility created", {
          description: "The facility has been created successfully",
        })
        router.push("/facilities")
      }
    },
    onError: () => {
      toast.error("Error", {
        description: "Failed to create facility",
      })
    },
  })

  const updateMutation = tsr.facilities.update.useMutation({
    onSuccess: (data) => {
      if (data.status === 200) {
        tsrQueryClient.facilities.getAll.setQueryData(["facilities"], (old) => {
          if (old?.status === 200) {
            return {
              ...old,
              body: old.body.map((f) => (f.id === data.body.id ? data.body : f)),
            }
          }
          return old
        })
        toast.success("Facility updated", {
          description: "The facility has been updated successfully",
        })
        router.push("/facilities")
      }
    },
    onError: () => {
      toast.error("Error", {
        description: "Failed to update facility",
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const apiCredentials: any = {
      type: formData.credentialType,
    }

    if (formData.credentialType === "oauth2") {
      apiCredentials.client_id = formData.client_id
      apiCredentials.client_secret = formData.client_secret
      apiCredentials.token_url = formData.token_url
      apiCredentials.refresh_token = formData.refresh_token
    } else if (formData.credentialType === "apikey") {
      apiCredentials.api_key = formData.api_key
    }

    const payload = {
      name: formData.name,
      email_id: formData.email_id || undefined,
      unique_id: formData.unique_id || undefined,
      ehr_type: formData.ehr_type,
      api_credentials: apiCredentials,
      webhook_secret: formData.webhook_secret || undefined,
    }

    if (isEdit && facility?.id) {
      updateMutation.mutate({ params: { id: facility.id }, body: payload })
    } else {
      createMutation.mutate({ body: payload })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Facility Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email_id">Email ID</Label>
              <Input
                id="email_id"
                type="email"
                value={formData.email_id}
                onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unique_id">Unique ID</Label>
              <Input
                id="unique_id"
                value={formData.unique_id}
                onChange={(e) => setFormData({ ...formData, unique_id: e.target.value })}
                placeholder="Auto-generated if empty"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ehr_type">EHR Type *</Label>
            <Select value={formData.ehr_type} onValueChange={(value) => setFormData({ ...formData, ehr_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="charm">Charm</SelectItem>
                <SelectItem value="medplum">Medplum</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="credentialType">Credential Type *</Label>
            <Select
              value={formData.credentialType}
              onValueChange={(value) => setFormData({ ...formData, credentialType: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oauth2">OAuth2</SelectItem>
                <SelectItem value="apikey">API Key</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.credentialType === "oauth2" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="client_id">Client ID</Label>
                <Input
                  id="client_id"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_secret">Client Secret</Label>
                <Input
                  id="client_secret"
                  type="password"
                  value={formData.client_secret}
                  onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token_url">Token URL</Label>
                <Input
                  id="token_url"
                  value={formData.token_url}
                  onChange={(e) => setFormData({ ...formData, token_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refresh_token">Refresh Token</Label>
                <Input
                  id="refresh_token"
                  type="password"
                  value={formData.refresh_token}
                  onChange={(e) => setFormData({ ...formData, refresh_token: e.target.value })}
                />
              </div>
            </>
          )}

          {formData.credentialType === "apikey" && (
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="webhook_secret">Webhook Secret</Label>
            <Input
              id="webhook_secret"
              type="password"
              value={formData.webhook_secret}
              onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : isEdit ? "Update Facility" : "Create Facility"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
