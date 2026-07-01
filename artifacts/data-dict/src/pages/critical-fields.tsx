import React from "react";
import { useGetCriticalFields } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function CriticalFields() {
  const { data, isLoading } = useGetCriticalFields();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading critical fields...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-destructive">
        <AlertTriangle className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Critical Fields</h1>
          <p className="text-muted-foreground">Fields with a validation score below 60.</p>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field</TableHead>
              <TableHead>Dictionary ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((field) => (
              <TableRow key={field.id}>
                <TableCell className="font-medium text-destructive">{field.campoOrigem}</TableCell>
                <TableCell>
                  <Link href={`/dictionaries/${field.dictionaryId}`} className="text-primary hover:underline">
                    #{field.dictionaryId}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[300px] truncate">{field.descricao}</TableCell>
                <TableCell>
                  <Badge variant="destructive">{field.summary?.score ?? "-"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/dictionaries/${field.dictionaryId}`} className="text-sm font-medium text-primary hover:underline">
                    View Dictionary
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {(!data || data.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No critical fields found. Good job!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
