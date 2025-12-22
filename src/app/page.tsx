import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { PRWidget } from "@/modules/github-prs";
import { NewsWidget } from "@/modules/news";
import { Activity, Clock, Download, MoreHorizontal, Plus, Users } from "lucide-react";
import { addDemoRecord } from "./actions";

export default async function Home() {
  const supabase = await createClient();
  const { data: records, error } = await supabase
    .from("demo")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching records:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  const totalRecords = records?.length || 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your demo records and monitor system activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords}</div>
            <p className="text-xs text-muted-foreground">+1 from last hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2 since last sync</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2m ago</div>
            <p className="text-xs text-muted-foreground">System is healthy</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-7">
        <div className="lg:col-span-3 space-y-8">
          <PRWidget />
          <NewsWidget />
        </div>

        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Records</CardTitle>
              <CardDescription>The latest entries from your `demo` table.</CardDescription>
            </div>
            <Button variant="ghost" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {record.id.split("-")[0]}
                    </TableCell>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.created_at ? new Date(record.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Record</CardTitle>
          <CardDescription>Create a new entry in the Supabase database.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addDemoRecord} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Record Name</label>
              <Input id="name" name="name" placeholder="Enter record name..." required />
            </div>
            <Button type="submit" className="w-full">Create Record</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
