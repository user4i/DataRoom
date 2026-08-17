import { expect, test, type Page } from "@playwright/test";

type Theme = "light" | "dark" | "medium";
type Locale = "en" | "uk";

const headings: Record<string, string> = {
  "en:/": "A virtual data room for PDFs",
  "uk:/": "Віртуальна кімната даних для PDF",
  "en:/login": "Log in",
  "en:/register": "Create account",
};

async function open(page: Page, path: string, theme: Theme, locale: Locale) {
  await page.addInitScript(
    ({ theme, locale }) => {
      localStorage.setItem("dataroom-theme", theme);
      localStorage.setItem("dataroom-locale", locale);
    },
    { theme, locale },
  );
  await page.emulateMedia({ colorScheme: theme === "dark" ? "dark" : "light" });
  await page.goto(path);
  const heading = headings[`${locale}:${path}`];
  if (heading) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
  await page.evaluate(() => document.fonts.ready);
}

async function shot(page: Page, name: string) {
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
}

test.describe("visual base", () => {
  test("home light en", async ({ page }) => {
    await open(page, "/", "light", "en");
    await shot(page, "home-light-en");
  });

  test("home dark en", async ({ page }) => {
    await open(page, "/", "dark", "en");
    await shot(page, "home-dark-en");
  });

  test("home medium en", async ({ page }) => {
    await open(page, "/", "medium", "en");
    await shot(page, "home-medium-en");
  });

  test("home light uk", async ({ page }) => {
    await open(page, "/", "light", "uk");
    await shot(page, "home-light-uk");
  });

  test("login light en", async ({ page }) => {
    await open(page, "/login", "light", "en");
    await shot(page, "login-light-en");
  });

  test("register light en", async ({ page }) => {
    await open(page, "/register", "light", "en");
    await shot(page, "register-light-en");
  });
});
