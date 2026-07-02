import {
  HELLO_EMAIL,
  NOREPLY_EMAIL,
  SALES_EMAIL,
  SUPPORT_EMAIL,
} from "./contactEmails";

describe("contactEmails", () => {
  it("exports the official TradeLike addresses", () => {
    expect(SALES_EMAIL).toBe("sales@tradelike.co.uk");
    expect(SUPPORT_EMAIL).toBe("support@tradelike.co.uk");
    expect(HELLO_EMAIL).toBe("hello@tradelike.co.uk");
    expect(NOREPLY_EMAIL).toBe("noreply@tradelike.co.uk");
  });
});
