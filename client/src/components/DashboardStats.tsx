import StatCard from "./StatCard";

type DashboardStatsProps = {
  jobsToday: number;
};

function DashboardStats({ jobsToday }: DashboardStatsProps) {
  return (
    <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
      <StatCard
        title="Today's Jobs"
        value={jobsToday.toString()}
      />

      <StatCard
        title="Customers"
        value="27"
      />

      <StatCard
        title="Revenue"
        value="£8,450"
      />
    </div>
  );
}

export default DashboardStats;