import { revalidatePath } from "next/cache";

export function revalidateProjectViews(projectId: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/calendar");
  revalidatePath("/employees");
  revalidatePath("/today");
  revalidatePath(`/projects/${projectId}`);
}
