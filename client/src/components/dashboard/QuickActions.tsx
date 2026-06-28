import { Link } from "react-router-dom";

import Card from "../ui/Card";
import SectionHeader from "../ui/SectionHeader";
import Button from "../ui/Button";

function QuickActions() {
  return (
    <Card>
      <SectionHeader title="Quick Actions" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/jobs">
          <Button className="w-full">
            + New Job
          </Button>
        </Link>

        <Link to="/customers">
          <Button className="w-full" variant="secondary">
            + New Customer
          </Button>
        </Link>

        <Link to="/quotes">
          <Button className="w-full" variant="secondary">
            + New Quote
          </Button>
        </Link>

        <Link to="/invoices">
          <Button className="w-full" variant="secondary">
            + New Invoice
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export default QuickActions;