import WeekCalendar from "../components/calendar/WeekCalendar";
import {
  ProductPage,
  ProductPageHeader,
  ProductPanel,
} from "../components/ui";

export default function CalendarPage() {
  return (
    <ProductPage maxWidth="full">
      <ProductPageHeader
        eyebrow="Dispatch board"
        title="Calendar"
        description="Plan the working week, move jobs between days, and view team availability in one responsive schedule."
      />

      <ProductPanel className="overflow-hidden p-0">
        <WeekCalendar />
      </ProductPanel>
    </ProductPage>
  );
}
