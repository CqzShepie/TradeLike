import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { I18nProvider, useI18n } from "../../i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

function DashboardLabel() {
  const { t } = useI18n();

  return <h1>{t("dashboard.label")}</h1>;
}

describe("LanguageSwitcher", () => {
  it("switches dashboard label to French", async () => {
    render(
      <I18nProvider>
        <LanguageSwitcher />
        <DashboardLabel />
      </I18nProvider>
    );

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "fr-FR" } });

    expect(screen.getByRole("heading", { name: "Tableau de bord" })).toBeInTheDocument();
  });
});
