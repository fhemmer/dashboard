import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addDemoRecord } from "./actions";

export default async function Home() {
  const { data: records, error } = await supabase
    .from("demo")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) console.error("Error fetching records:", error);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 font-sans dark:bg-black sm:p-24">
      <main className="flex w-full max-w-4xl flex-col gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Add Demo Record</CardTitle>
            <CardDescription>Enter a name to add a new record to Supabase.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addDemoRecord} className="flex gap-4">
              <Input name="name" placeholder="Record name..." required className="max-w-sm" />
              <Button type="submit">Add Record</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo Records</CardTitle>
            <CardDescription>Records fetched from the `demo` table.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.id.split("-")[0]}...</TableCell>
                    <TableCell>{record.name}</TableCell>
                    <TableCell className="text-right">{new Date(record.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
