import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboard } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle, Database, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data, isLoading } = useGetDashboard();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading metrics...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Global dictionary quality metrics and validation status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dictionaries</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalDictionaries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fields</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalFields}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Fields</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.approvedFields}</div>
            <p className="text-xs text-muted-foreground">
              {data.totalFields > 0 ? Math.round((data.approvedFields / data.totalFields) * 100) : 0}% approval rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.globalScore ? data.globalScore.toFixed(1) : "-"}</div>
            <p className="text-xs text-muted-foreground">Across all validated fields</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Dictionaries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentDictionaries.map((dict) => (
                <Link key={dict.id} href={`/dictionaries/${dict.id}`}>
                  <div className="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm">{dict.tabela}</div>
                      <Badge variant="outline">{dict.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{dict.processo} / {dict.categoria}</div>
                    <Progress value={dict.totalFields > 0 ? (dict.approvedFields / dict.totalFields) * 100 : 0} className="h-2 mt-2" />
                  </div>
                </Link>
              ))}
              {data.recentDictionaries.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">No dictionaries imported yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
