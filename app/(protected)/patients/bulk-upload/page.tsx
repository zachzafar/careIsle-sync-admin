"use client"

import type React from "react"

import { useState } from "react"
import { ProtectedLayout } from "@/components/layout/protected-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { tsr } from "@/lib/api/tsr"

interface UploadResult {
  row: number
  success: boolean
  error?: string
  data?: any
}

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<UploadResult[]>([])

  const tsrQueryClient = tsr.useQueryClient()

  const { mutateAsync: createPatient } = tsr.patients.create.useMutation()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResults([])
    }
  }

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n").filter((line) => line.trim())
    const headers = lines[0].split(",").map((h) => h.trim())

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim())
      const obj: any = {}
      headers.forEach((header, index) => {
        obj[header] = values[index]
      })
      return obj
    })
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setResults([])

    try {
      const text = await file.text()
      const records = file.name.endsWith(".json") ? JSON.parse(text) : parseCSV(text)

      const uploadResults: UploadResult[] = []

      for (let i = 0; i < records.length; i++) {
        const record = records[i]

        try {
          const payload = {
            first_name: record.first_name || record.firstName,
            last_name: record.last_name || record.lastName,
            dob: record.dob,
            gender: record.gender,
            email_id: record.email_id || record.email,
            origin_facility_id: record.origin_facility_id || record.facilityId,
            patient_identifiers: [
              {
                type: record.identifier_type || "NATIONAL_ID",
                value: record.identifier_value || record.identifier,
              },
            ],
            demographics: {},
          }

          const response = await createPatient({ body: payload })

          if (response.status === 201) {
            uploadResults.push({ row: i + 1, success: true, data: response.body })
          } else {
            uploadResults.push({ row: i + 1, success: false, error: "Failed to create" })
          }
        } catch (error: any) {
          uploadResults.push({ row: i + 1, success: false, error: error.message })
        }

        setProgress(((i + 1) / records.length) * 100)
        setResults([...uploadResults])
      }

      tsrQueryClient.invalidateQueries({ queryKey: ["patients"] })

      const successCount = uploadResults.filter((r) => r.success).length
      toast.success("Upload complete", {
        description: `Successfully created ${successCount} of ${records.length} patients`,
      })
    } catch (error) {
      console.error("[v0] Bulk upload error:", error)
      toast.error("Upload failed", {
        description: "Failed to process file",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <ProtectedLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Upload Patients</h1>
          <p className="text-muted-foreground mt-2">Upload multiple patient records from CSV or JSON files</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>
              Select a CSV or JSON file containing patient records. Required fields: first_name, last_name, dob, gender,
              origin_facility_id, identifier_value
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input id="file" type="file" accept=".csv,.json" onChange={handleFileChange} disabled={uploading} />
            </div>

            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <span>({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}

            <Button onClick={handleUpload} disabled={!file || uploading}>
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Patients"}
            </Button>
          </CardContent>
        </Card>

        {uploading && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}% complete</p>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
              <CardDescription>
                {results.filter((r) => r.success).length} successful, {results.filter((r) => !r.success).length} failed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result) => (
                  <div key={result.row} className="flex items-center gap-2 text-sm p-2 rounded border">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-medium">Row {result.row}:</span>
                    <span className={result.success ? "text-muted-foreground" : "text-destructive"}>
                      {result.success ? "Success" : result.error}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedLayout>
  )
}
