import { Accessibility, Eye, Keyboard } from "lucide-react";

import {
  EmptyState,
  ProductPage,
  ProductPageHeader,
  ProductPanel,
  ProductStat,
} from "../components/ui";

export default function AccessibilitySettings() {
  return (
    <ProductPage maxWidth="6xl">
      <ProductPageHeader
        eyebrow="Settings"
        title="Accessibility"
        description="Display, keyboard and interaction preferences will live here as the accessibility module grows."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <ProductStat label="Display" value="Ready" helper="contrast and motion preferences" icon={<Eye className="h-5 w-5" />} />
        <ProductStat label="Keyboard" value="Ready" helper="shortcut and focus preferences" icon={<Keyboard className="h-5 w-5" />} />
        <ProductStat label="Access" value="Included" helper="available to all users" icon={<Accessibility className="h-5 w-5" />} />
      </section>

      <ProductPanel>
        <EmptyState
          title="Accessibility settings are being added"
          description="This area is ready in the settings structure and will hold user-level display and interaction controls."
        />
      </ProductPanel>
    </ProductPage>
  );
}
