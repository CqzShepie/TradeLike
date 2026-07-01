import { CalendarDays, Route } from "lucide-react";

import WeekCalendar from "../components/calendar/WeekCalendar";
import {
  ProductPage,
  ProductPageHeader,
  ProductPanel,
  ProductStat,
} from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { canUseStaffScheduling } from "../routes/planEntitlements";

export default function CalendarPage() {
  const { user } = useAuth();
  const showStaffScheduling = canUseStaffScheduling(user);

  return (
    <ProductPage maxWidth="full">
      <ProductPageHeader
        eyebrow="Dispatch board"
        title="Calendar"
        description="Plan the working week, move jobs between days, and view team availability in one responsive schedule."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ProductStat label="Week view" value="7 days" helper="Monday to Sunday planning" icon={<CalendarDays className="h-5 w-5" />} />
        <ProductStat
          label="Route tools"
          value={showStaffScheduling ? "Ready" : "Team+"}
          helper={showStaffScheduling ? "available from the dispatch board" : "staff scheduling unlocks on Team"}
          icon={<Route className="h-5 w-5" />}
        />
      </section>

      <ProductPanel className="overflow-hidden p-0">
        <WeekCalendar />
      </ProductPanel>
    </ProductPage>
  );
}
