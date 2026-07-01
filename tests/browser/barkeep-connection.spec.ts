import { expect, test, type Page } from "@playwright/test";

const baseUrl = "http://127.0.0.1:4173";
const statusBody = {
  user: "demo",
  mode: "multi-user",
  counts: {
    characters: 2,
    worlds: 3,
    presets: 4,
    characterChatGroups: 1,
    characterChats: 5,
    groupChats: 1,
    chats: 6,
  },
};

async function openConnectionDrawer(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "settings",
      JSON.stringify({ useNewWelcomePage: true }),
    );
  });
  await page.goto("/");
  await page.getByTestId("open-barkeep-connection").click();
  await expect(page.getByTestId("barkeep-connection-drawer")).toBeVisible();
}

test("logs_in_and_pings_standalone_barkeep", async ({ page }) => {
  let loginBody: unknown;
  let pingAuthorization = "";

  await page.route("**/v1/login", async (route) => {
    loginBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enabled: true,
        token: "standalone-token",
        expiresIn: 3600,
        user: "demo",
      }),
    });
  });
  await page.route("**/v1/demo/status/list", async (route) => {
    pingAuthorization = route.request().headers().authorization ?? "";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(statusBody),
    });
  });

  await openConnectionDrawer(page);
  await page.getByText("独立 HTTP mode", { exact: true }).click();
  await page.getByLabel("Barkeep 服务地址").fill(baseUrl);
  await page.getByLabel("用户 Handle").fill("demo");
  await page.getByLabel("用户密码").fill("secret");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page.getByTestId("barkeep-status")).toContainText("连接正常");
  expect(loginBody).toEqual({ handle: "demo", password: "secret" });
  expect(pingAuthorization).toBe("Bearer standalone-token");
});

test("sends_router_session_csrf_and_basic_auth", async ({ page }) => {
  const requests: Array<{
    path: string;
    authorization?: string;
    csrf?: string;
  }> = [];

  await page.route("**/csrf-token", async (route) => {
    requests.push({
      path: "/csrf-token",
      authorization: route.request().headers().authorization,
    });
    await route.fulfill({
      contentType: "application/json",
      headers: { "set-cookie": "session=test; Path=/; HttpOnly" },
      body: JSON.stringify({ token: "csrf-token" }),
    });
  });
  await page.route("**/api/users/login", async (route) => {
    requests.push({
      path: "/api/users/login",
      authorization: route.request().headers().authorization,
      csrf: route.request().headers()["x-csrf-token"],
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ handle: "demo" }),
    });
  });
  await page.route(
    "**/api/plugins/barkeep/v1/demo/status/list",
    async (route) => {
      requests.push({
        path: "/api/plugins/barkeep/v1/demo/status/list",
        authorization: route.request().headers().authorization,
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(statusBody),
      });
    },
  );

  await openConnectionDrawer(page);
  await page.getByLabel("Barkeep 服务地址").fill(baseUrl);
  await page.getByLabel("HTTP 基础验证").check();
  await page.getByLabel("用户 Handle").fill("demo");
  await page.getByLabel("用户密码").fill("secret");
  await page.getByLabel("HTTP Basic 用户名").fill("http-user");
  await page.getByLabel("HTTP Basic 密码").fill("http-password");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page.getByTestId("barkeep-status")).toBeVisible();
  expect(requests).toEqual([
    {
      path: "/csrf-token",
      authorization: "Basic aHR0cC11c2VyOmh0dHAtcGFzc3dvcmQ=",
    },
    {
      path: "/api/users/login",
      authorization: "Basic aHR0cC11c2VyOmh0dHAtcGFzc3dvcmQ=",
      csrf: "csrf-token",
    },
    {
      path: "/api/plugins/barkeep/v1/demo/status/list",
      authorization: "Basic aHR0cC11c2VyOmh0dHAtcGFzc3dvcmQ=",
    },
  ]);
});

test("removes_passwords_when_save_password_is_disabled", async ({ page }) => {
  await openConnectionDrawer(page);
  await page.getByLabel("用户密码").fill("secret");
  await page.getByLabel("HTTP 基础验证").check();
  await page.getByLabel("HTTP Basic 密码").fill("http-password");
  await page.getByLabel("保存密码").check();

  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("barkeepConfig")!)),
    )
    .toMatchObject({
      password: "secret",
      basicPassword: "http-password",
      savePassword: true,
    });

  await page.getByLabel("保存密码").uncheck();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem("barkeepConfig")!)),
    )
    .toEqual(
      expect.not.objectContaining({
        password: expect.anything(),
        basicPassword: expect.anything(),
      }),
    );
});
