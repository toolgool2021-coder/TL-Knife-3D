const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { mkdirSync } = require("node:fs");

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--no-sandbox",
    ],
  });
  const errors = [];
  mkdirSync("captures", { recursive: true });
  try {
    for (const touch of [false, true]) {
      const page = await browser.newPage({
        viewport: touch
          ? { width: 740, height: 360 }
          : { width: 960, height: 540 },
        hasTouch: touch,
        isMobile: touch,
      });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error" && !message.text().includes("404"))
          errors.push(message.text());
      });
      await page.goto("http://127.0.0.1:8111");
      await page.waitForFunction(
        () => document.querySelector("#name").textContent === "Butterfly Knife",
      );
      await page.click('[data-tab="inventory"]');
      assert.equal(await page.locator("#cards button").count(), 16);
      for (const card of await page.locator("#cards button").all()) {
        await card.click();
        assert.equal(
          await page.locator("#name").innerText(),
          await card.locator("b").innerText(),
        );
      }
      await page.locator("#cards button").first().click();
      await page.click("#resume");
      if (!touch) {
        await page.keyboard.press("CapsLock");
        await page.keyboard.down("w");
        await page.waitForFunction(
          () => Number(document.querySelector("#speed").innerText) > 380,
        );
        await page.keyboard.down("Space");
        await page.waitForFunction(
          () => document.querySelector("#state").textContent === "AIR",
        );
        await page.keyboard.up("Space");
        await page.keyboard.up("w");
        await page.keyboard.press("Digit2");
        await page.waitForFunction(
          () => document.querySelector("#name").textContent === "Karambit",
        );
        await page.waitForTimeout(1400);
        await page.keyboard.press("f");
      } else {
        const cdp = await page.context().newCDPSession(page);
        const center = async (selector) => {
          const r = await page.locator(selector).boundingBox();
          assert(r);
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        };
        const stick = await center("#stick"),
          jump = await center('[data-act="jump"]');
        const look = { x: 420, y: 100, id: 2 };
        const send = (type, touchPoints) =>
          cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
        await send("touchStart", [{ ...stick, id: 1 }, look]);
        await send("touchMove", [
          { x: stick.x, y: stick.y - 32, id: 1 },
          { ...look, x: 450 },
        ]);
        await send("touchStart", [
          { x: stick.x, y: stick.y - 32, id: 1 },
          { ...look, x: 450 },
          { ...jump, id: 3 },
        ]);
        await page.waitForFunction(
          () =>
            Number(document.querySelector("#speed").innerText) > 10 &&
            document.querySelector("#state").textContent === "AIR",
        );
        await send("touchEnd", []);
        await page.tap('[data-act="trick"]');
      }
      await page.waitForTimeout(380);
      await page.screenshot({
        path: "captures/" + (touch ? "mobile" : "desktop") + ".png",
      });
      console.log(
        touch
          ? "Multitouch movement, look input and jump passed"
          : "Inventory, pointer lock entry, sprint, jump, slots and inspect passed",
      );
      await page.close();
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
