type DashboardHeaderProps = {
  title: string;
  subtitle: string;
};

function DashboardHeader({
  title,
  subtitle,
}: DashboardHeaderProps) {
  return (
    <>
      <h1 className="text-4xl font-bold">{title}</h1>

      <p className="mt-2 text-slate-600">
        {subtitle}
      </p>
    </>
  );
}

export default DashboardHeader;