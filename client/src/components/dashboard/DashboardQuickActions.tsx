import ActionButton from "../ui/ActionButton";

function DashboardQuickActions() {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-semibold">
        Quick Actions
      </h2>

      <div className="flex flex-wrap gap-4">
        <ActionButton
          title="New Job"
          icon="➕"
        />

        <ActionButton
          title="New Quote"
          icon="📄"
        />

        <ActionButton
          title="New Invoice"
          icon="🧾"
        />
      </div>
    </section>
  );
}

export default DashboardQuickActions;