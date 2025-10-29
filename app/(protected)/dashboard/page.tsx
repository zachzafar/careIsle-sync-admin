"use client"

import { ProtectedLayout } from "@/components/layout/protected-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Users, Activity, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"

export default function DashboardPage() {
  const { data: facilities } = useQuery({
    queryKey: ["facilities"],
    queryFn: async () => {
      const response = await apiClient.facilities.getAll()
      return response.status === 200 ? response.body : []
    },
  })

  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const response = await apiClient.patients.getAll()
      return response.status === 200 ? response.body : []
    },
  })

  const stats = [
    {
      title: "Total Facilities",
      value: facilities?.length || 0,
      icon: Building2,
      href: "/facilities",
      description: "Healthcare facilities",
    },
    {
      title: "Total Patients",
      value: patients?.length || 0,
      icon: Users,
      href: "/patients",
      description: "Patient records",
    },
    {
      title: "System Status",
      value: "Operational",
      icon: Activity,
      href: "#",
      description: "All systems running",
    },
  ]

  return (
    <ProtectedLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Welcome to the Health Portal administration Dashboard</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Facilities Management</CardTitle>
              <CardDescription>Manage healthcare facilities and their EHR integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/facilities">
                  View Facilities
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient Records</CardTitle>
              <CardDescription>View and manage patient records across facilities</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/patients">
                  View Patients
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  )
}
