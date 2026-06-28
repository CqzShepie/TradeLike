import { useEffect, useState } from "react";

import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";

import type { Job } from "../../types/job";

type EditJobModalProps = {
  open: boolean;
  job: Job;
  onClose: () => void;
  onSave: (job: Job) => Promise<void>;
};

function EditJobModal({
  open,
  job,
  onClose,
  onSave,
}: EditJobModalProps) {
  const [form, setForm] = useState(job);

  useEffect(() => {
    setForm(job);
  }, [job]);

  async function handleSubmit() {
    await onSave(form);
    onClose();
  }

  if (!open) return null;

  return (
    <Modal title="Edit Job" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            Customer
          </label>

          <Input
            value={form.customer}
            onChange={(e) =>
              setForm({
                ...form,
                customer: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            Job Title
          </label>

          <Input
            value={form.jobTitle}
            onChange={(e) =>
              setForm({
                ...form,
                jobTitle: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            Address
          </label>

          <Input
            value={form.address}
            onChange={(e) =>
              setForm({
                ...form,
                address: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            Phone
          </label>

          <Input
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value,
              })
            }
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button onClick={onClose}>
            Cancel
          </Button>

          <Button onClick={handleSubmit}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default EditJobModal;