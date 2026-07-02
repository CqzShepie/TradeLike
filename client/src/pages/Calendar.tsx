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
        eyebrow="Schedule"
        title="Calendar"
        description="Plan the working week, move jobs between days, and keep the schedule clear."
      />

      <ProductPanel className="overflow-hidden p-0">
        <WeekCalendar />
      </ProductPanel>
    </ProductPage>
  );
}
