import React from "react";
import { useListDictionaries } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, BookOpen, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DictionariesList() {
  const { data, isLoading } = useListDictionaries();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading dictionaries...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dictionaries</h1>
          <p className="text-muted-foreground">Manage and validate data dictionaries.</p>
        </div>
        <Button asChild>
          <Link href="/dictionaries/new">
            <Plus className="mr-2 h-4 w-4" /> Import Dictionary
          </Link>
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table</TableHead>
              <TableHead>Process</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Avg Score</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((dict) => {
              const progress = dict.totalFields > 0 ? (dict.approvedFields / dict.totalFields) * 100 : 0;
              return (
                <TableRow key={dict.id}>
                  <TableCell className="font-medium">{dict.tabela}</TableCell>
                  <TableCell>{dict.processo}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{dict.status}</Badge>
                  </TableCell>
                  <TableCell className="w-[200px]">
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{Math.round(progress)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {dict.avgScore ? dict.avgScore.toFixed(1) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dictionaries/${dict.id}`}>Validate</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!data || data.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No dictionaries found. Import one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
