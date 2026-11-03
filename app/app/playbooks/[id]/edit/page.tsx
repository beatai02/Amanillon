import { notFound } from "next/navigation";
import { PlaybookBuilder } from "@/components/playbook-builder";
import { getPlaybook } from "@/lib/data/repository";

export default async function EditPlaybookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playbook = await getPlaybook(id);
  if (!playbook) notFound();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">Edit playbook</h1>
      <PlaybookBuilder playbook={playbook} />
    </div>
  );
}
