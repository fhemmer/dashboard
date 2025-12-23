"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  ExpenditureSource,
  ExpenditureSourceInput,
  FetchExpendituresResult,
  UpdateResult,
} from "./types";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

export async function getExpenditures(): Promise<FetchExpendituresResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { sources: [], error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("expenditure_sources")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching expenditures:", error);
    return { sources: [], error: error.message };
  }

  const sources: ExpenditureSource[] = (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    baseCost: Number(row.base_cost),
    billingCycle: row.billing_cycle as "monthly" | "yearly",
    billingDayOfMonth: row.billing_day_of_month,
    billingMonth: row.billing_month,
    consumptionCost: Number(row.consumption_cost),
    detailsUrl: row.details_url,
    notes: row.notes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));

  return { sources };
}

export async function createExpenditureSource(
  input: ExpenditureSourceInput
): Promise<UpdateResult & { id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("expenditure_sources")
    .insert({
      user_id: user.id,
      name: input.name,
      base_cost: input.baseCost,
      billing_cycle: input.billingCycle,
      billing_day_of_month: input.billingDayOfMonth,
      billing_month: input.billingMonth ?? null,
      consumption_cost: input.consumptionCost ?? 0,
      details_url: input.detailsUrl ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating expenditure source:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/expenditures");
  revalidatePath("/");
  return { success: true, id: data.id };
}

export async function updateExpenditureSource(
  id: string,
  input: Partial<ExpenditureSourceInput>
): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.baseCost !== undefined) updateData.base_cost = input.baseCost;
  if (input.billingCycle !== undefined) updateData.billing_cycle = input.billingCycle;
  if (input.billingDayOfMonth !== undefined)
    updateData.billing_day_of_month = input.billingDayOfMonth;
  if (input.billingMonth !== undefined)
    updateData.billing_month = input.billingMonth;
  if (input.consumptionCost !== undefined)
    updateData.consumption_cost = input.consumptionCost;
  if (input.detailsUrl !== undefined) updateData.details_url = input.detailsUrl;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const { error } = await supabase
    .from("expenditure_sources")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating expenditure source:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/expenditures");
  revalidatePath("/");
  return { success: true };
}

export async function updateConsumptionCost(
  id: string,
  consumptionCost: number
): Promise<UpdateResult> {
  return updateExpenditureSource(id, { consumptionCost });
}

export async function deleteExpenditureSource(id: string): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("expenditure_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting expenditure source:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/expenditures");
  revalidatePath("/");
  return { success: true };
}
