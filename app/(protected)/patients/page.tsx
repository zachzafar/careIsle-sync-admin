"use client"

// import { useState } from "react"
// import { ProtectedLayout } from "@/components/layout/protected-layout"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Badge } from "@/components/ui/badge"
// import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
// import { Spinner } from "@/components/ui/spinner"
// import { Plus, Search, Upload, Copy } from "lucide-react"
// import Link from "next/link"
// import { tsr } from "@/lib/api/tsr"
// import { CreatePatientDialog } from "@/components/patients/create-patient-dialog"
// import { useAuth } from "@/lib/hooks/use-auth"
  import { useEffect, useMemo, useState } from "react"
  import { useRouter, usePathname, useSearchParams } from "next/navigation"
  import { ProtectedLayout } from "@/components/layout/protected-layout"
  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
  import { Badge } from "@/components/ui/badge"
  import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "@/components/ui/pagination"
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
  import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
  import { Spinner } from "@/components/ui/spinner"
  import { Plus, Search, Upload, Copy } from "lucide-react"
  import Link from "next/link"
  import { tsr } from "@/lib/api/tsr"
  import { CreatePatientDialog } from "@/components/patients/create-patient-dialog"
  import { useAuth } from "@/lib/hooks/use-auth"


export default function PatientsPage() {

  function useDebouncedValue<T>(value: T, delay = 200) {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
      const t = setTimeout(() => setDebounced(value), delay)
      return () => clearTimeout(t)
    }, [value, delay])
    return debounced
  }

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { logout } = useAuth()

  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  // Read initial state from URL with defaults
  const initialPage = Number(searchParams.get("page") || 1)
  const initialLimit = Number(searchParams.get("limit") || 20)
  const initialSort = (searchParams.get("sort") || "createdAt") as "createdAt" | "updatedAt" | "first_name" | "last_name" | "dob" | "system_id"
  const initialOrder = (searchParams.get("order") || "desc") as "asc" | "desc"

  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [sort, setSort] = useState(initialSort)
  const [order, setOrder] = useState(initialOrder)

  // Debounce param changes to avoid rapid refetches
  const debouncedParams = useDebouncedValue({ page, limit, sort, order }, 200)

  // Push state changes to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", String(page))
    params.set("limit", String(limit))
    params.set("sort", sort)
    params.set("order", order)
    router.replace(`${pathname}?${params.toString()}`)
  }, [page, limit, sort, order, router, pathname]) // keep search query local; not in URL

  // Fetch patients with query params
  const { data, isPending, error } = tsr.patients.getAll.useQuery({
    queryKey: ["patients", debouncedParams],
    queryData: {
      query: debouncedParams,
    },
  })

  // Handle 401 unauthorized: axios interceptor already refreshes once; if still 401, redirect to login
  useEffect(() => {
    const anyError = error as any
    const status = anyError?.response?.status || anyError?.status
    if (status === 401) {
      logout()
    }
  }, [error, logout])

  const patients = data?.status === 200 ? data.body.data : []
  const meta = data?.status === 200 ? data.body.meta : undefined

  const filteredPatients = useMemo(() => {
    if (!patients) return []
    const q = search.trim().toLowerCase()
    if (!q) return patients
    return patients.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        (p.email_id?.toLowerCase().includes(q) ?? false),
    )
  }, [patients, search])

  const formatDate = (iso?: string) => {
    if (!iso) return "-"
    // Show YYYY-MM-DD; guard against non-ISO by substring
    return iso.length >= 10 ? iso.substring(0, 10) : iso
  }

  const getIdentifier = (p: any, type: "SYSTEM_ID" | "NATIONAL_ID") =>
    p.patient_identifiers?.find((id: any) => id.type === type)?.value || null

  const syncStatus = (p: any) => (Array.isArray(p.synced_facilities) && p.synced_facilities.length > 0 ? "Synced" : "Not Synced")

  const onPrev = () => setPage((prev) => Math.max(1, prev - 1))
  const onNext = () => setPage((prev) => Math.min(Math.max(prev + 1, 1), meta?.totalPages ?? prev + 1))
  const onLimitChange = (value: string) => {
    setLimit(Number(value))
    setPage(1)
  }
  const onSortClick = (col: typeof sort) => {
    if (sort === col) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSort(col)
      setOrder("asc")
    }
  }

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
            <Button variant="outline" asChild>
              <Link href="/patients/duplicates">
                <Copy className="mr-2 h-4 w-4" />
                Duplicates
              </Link>
            </Button>
             <Button variant="outline" asChild>
              <Link href="/patients/ehr-bulk-upload">
                <Copy className="mr-2 h-4 w-4" />
                Bulk upload from EHR
              </Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Patient
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              aria-label="Search patients"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Page size</span>
            <Select value={String(limit)} onValueChange={onLimitChange}>
              <SelectTrigger aria-label="Select page size" className="w-[100px]">
                <SelectValue placeholder="20" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertTitle>Failed to load patients</AlertTitle>
            <AlertDescription>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.refresh()}>
                  Retry
                </Button>
                <span className="text-muted-foreground text-xs">
                  {typeof (error as any)?.message === "string" ? (error as any).message : "Network or API error"}
                </span>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  role="button"
                  aria-sort={sort === "system_id" ? (order === "asc" ? "ascending" : "descending") : "none"}
                  onClick={() => onSortClick("system_id")}
                >
                  System ID
                </TableHead>
                <TableHead
                  role="button"
                  aria-sort={sort === "first_name" ? (order === "asc" ? "ascending" : "descending") : "none"}
                  onClick={() => onSortClick("first_name")}
                >
                  First Name
                </TableHead>
                <TableHead
                  role="button"
                  aria-sort={sort === "last_name" ? (order === "asc" ? "ascending" : "descending") : "none"}
                  onClick={() => onSortClick("last_name")}
                >
                  Last Name
                </TableHead>
                <TableHead
                  role="button"
                  aria-sort={sort === "dob" ? (order === "asc" ? "ascending" : "descending") : "none"}
                  onClick={() => onSortClick("dob")}
                >
                  DOB
                </TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Origin Facility</TableHead>
                <TableHead>Sync Status</TableHead>
                <TableHead>Has National ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <div className="inline-flex items-center gap-2 justify-center">
                      <Spinner className="size-5" />
                      Loading patients...
                    </div>
                  </TableCell>
                </TableRow>
              ) : (meta?.total ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No patients found. Try creating a new patient or adjusting filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients?.map((p) => {
                  const sysId = getIdentifier(p, "SYSTEM_ID")
                  const hasNatId = !!getIdentifier(p, "NATIONAL_ID")
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{sysId ?? "-"}</TableCell>
                      <TableCell>{p.first_name}</TableCell>
                      <TableCell>{p.last_name}</TableCell>
                      <TableCell>{formatDate(p.dob)}</TableCell>
                      <TableCell>{p.gender || "-"}</TableCell>
                      <TableCell>{p.origin_facility_id || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={syncStatus(p) === "Synced" ? "default" : "secondary"}>{syncStatus(p)}</Badge>
                      </TableCell>
                      <TableCell>{hasNatId ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <div aria-live="polite" className="text-sm text-muted-foreground">
            {meta ? `Page ${meta.page} of ${meta.totalPages} • ${meta.total} total` : ""}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    onPrev()
                  }}
                  aria-disabled={!meta?.hasPrevPage}
                  data-disabled={!meta?.hasPrevPage}
                  className={!meta?.hasPrevPage ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    onNext()
                  }}
                  aria-disabled={!meta?.hasNextPage}
                  data-disabled={!meta?.hasNextPage}
                  className={!meta?.hasNextPage ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>

        <CreatePatientDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </ProtectedLayout>
  )
}
