import Card from "../../ui/Card";

function TimelineCard() {
  return (
    <Card>
      <h2 className="mb-5 text-xl font-semibold">
        Timeline
      </h2>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-green-500" />

          <div>
            <p className="font-medium">
              Job Created
            </p>

            <p className="text-sm text-slate-500">
              Today
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default TimelineCard;