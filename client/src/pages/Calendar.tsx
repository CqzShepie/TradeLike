import { CalendarDays, Route } from "lucide-react";

import WeekCalendar from "../components/calendar/WeekCalendar";
import {
  ProductPage,
  ProductPageHeader,
  ProductPanel,
  ProductStat,
} from "../components/ui";

export default function CalendarPage() {
  return (
    <ProductPage maxWidth="full">
      <ProductPageHeader
        eyebrow="Dispatch board"
        title="Calendar"
        description="Plan the working week, move jobs between days, and view team availability in one responsive schedule."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ProductStat label="Week view" value="7 days" helper="Monday to Sunday planning" icon={<CalendarDays className="h-5 w-5" />} />
        <ProductStat label="Route tools" value="Ready" helper="available from the dispatch board" icon={<Route className="h-5 w-5" />} />
      </section>

      <ProductPanel className="overflow-hidden p-0">
        <WeekCalendar />
      </ProductPanel>
    </ProductPage>
  );
}
