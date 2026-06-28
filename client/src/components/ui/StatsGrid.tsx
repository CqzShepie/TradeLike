import StatCard from "./StatCard";

type StatsItem = {
  title: string;
  value: string | number;
};

type StatsGridProps = {
  stats: StatsItem[];
};

function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value.toString()}
        />
      ))}
    </div>
  );
}

export default StatsGrid;