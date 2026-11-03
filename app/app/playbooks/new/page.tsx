import { PlaybookBuilder } from "@/components/playbook-builder";

export default function NewPlaybookPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-semibold">New playbook</h1>
      <PlaybookBuilder />
    </div>
  );
}
