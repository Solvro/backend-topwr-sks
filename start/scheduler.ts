import scheduler from "adonisjs-scheduler/services/main";

import logger from "@adonisjs/core/services/logger";

import { runScrapper as runMenuScrapper } from "../scripts/menu_scrapper.js";
import { runScrapper as runUsersScrapper } from "../scripts/users_scrapper.js";
import env from "./env.js";

scheduler
  .call(() => {
    if (env.get("RUN_MENU_SCRAPPER")) {
      logger.info("Running menu scraper.");
      void runMenuScrapper();
    } else {
      logger.info(
        "Menu scrapper is disabled by the RUN_MENU_SCRAPPER env flag.",
      );
    }
  })
  .immediate()
  .everyFifteenMinutes();
// JDI
// .everyFiveMinutes();

scheduler
  .call(() => {
    if (env.get("RUN_USERS_SCRAPPER")) {
      logger.info("Running users scraper.");
      void runUsersScrapper();
    } else {
      logger.info(
        "Users scrapper is disabled by the RUN_USERS_SCRAPPER env flag.",
      );
    }
  })
  .immediate()
  .everyMinute();
