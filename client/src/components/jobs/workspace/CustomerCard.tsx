import Card from "../../ui/Card";
import Button from "../../ui/Button";

import type { Job } from "../../../types/job";

type CustomerCardProps = {
  job: Job;
};

function CustomerCard({ job }: CustomerCardProps) {
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">
        Customer
      </h2>

      <div className="space-y-3">
        <p>👤 {job.customer}</p>
        <p>📞 {job.phone || "No phone number"}</p>
        <p>📍 {job.address}</p>
      </div>

      <div className="mt-6">
        <Button>View Customer</Button>
      </div>
    </Card>
  );
}

export default CustomerCard;