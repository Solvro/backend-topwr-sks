import { connect } from "puppeteer-real-browser";

import logger from "@adonisjs/core/services/logger";

import env from "#start/env";

import { getProxyConfig } from "./proxy.js";

type PageWithCursor = Awaited<ReturnType<typeof connect>>["page"];

async function unlockCaptcha(page: PageWithCursor, url: string) {
  await page.goto(url, {
    waitUntil: "networkidle0",
  });
  const captcha = await page.$("#captcha");
  if (captcha !== null) {
    logger.info("Captcha required");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    logger.info("Clicking captcha");
    await page.click("#captcha");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const captchaSecondCheck = await page.$("#captcha");
    if (captchaSecondCheck !== null) {
      logger.info("Captcha still found");
      await page.screenshot({ path: "debug.png" });
    } else {
      logger.info("Captcha solved");
    }
  } else {
    logger.info("No captcha required");
  }
}

export async function getMenuHTML(): Promise<string> {
  const proxy = getProxyConfig();

  const url = env.get("MENU_URL");
  const { page, browser } = await connect({
    proxy,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  await unlockCaptcha(page, url);

  await page.setUserAgent(getRandomUserAgent());

  const pageContent = await page.goto(env.get("MENU_URL"));
  const html = await pageContent?.text();
  await browser.close();

  if (html === undefined) {
    throw new Error("Failed to get the page content. HTML is undefined");
  }

  return html;
}

const userAgents = [
  // Chrome (Windows, Mac, Linux)
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

  // Firefox (Windows, Mac, Linux)
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:119.0) Gecko/20100101 Firefox/119.0",

  // Edge (Windows, Mac)
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",

  // Safari (Mac, iOS)
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.2 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/537.36",
  "Mozilla/5.0 (iPad; CPU OS 16_1 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/537.36",

  // Android Devices
  "Mozilla/5.0 (Linux; Android 14; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 12; SM-G998U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",

  // Older Browsers
  "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.3; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0",
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}
