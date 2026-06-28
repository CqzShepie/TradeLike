import Card from "../ui/Card";
import SectionHeader from "../ui/SectionHeader";

const activities = [
  {
    id: 1,
    text: "Quote created",
    time: "10 mins ago",
  },
  {
    id: 2,
    text: "Customer added",
    time: "45 mins ago",
  },
  {
    id: 3,
    text: "Job completed",
    time: "1 hour ago",
  },
  {
    id: 4,
    text: "Invoice paid",
    time: "2 hours ago",
  },
];

function RecentActivity() {
  return (
    <Card>
      <SectionHeader title="Recent Activity" />

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
          >
            <p className="font-medium text-slate-700">
              ✓ {activity.text}
            </p>

            <span className="text-sm text-slate-500">
              {activity.time}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default RecentActivity;