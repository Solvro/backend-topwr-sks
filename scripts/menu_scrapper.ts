import * as cheerio from "cheerio";
import { ElementType } from "domelementtype";
import { DateTime } from "luxon";
import assert from "node:assert";
import { createHash } from "node:crypto";

import logger from "@adonisjs/core/services/logger";
import db from "@adonisjs/lucid/services/db";

import HashesMeal from "#models/hashes_meal";
import Meal, { MealCategory } from "#models/meal";
import WebsiteHash from "#models/website_hash";
import Env from "#start/env";

import { notifyFavouriteMeal } from "./favourite_meal_notifier.js";

// this regex is barely readable
// number, then optionally "g" or "ml", then optionally "/" + number + "g" or "ml", end of string
const SIZE_REGEX = /\d+(?:\s?(?:g|ml))?(?:\/\d+(?:\s?(?:g|ml))?)?$/;

async function getMenuHTMLOrFail() {
  const response = await fetch(Env.get("MENU_URL"));
  if (!response.ok) {
    throw new Error(
      `Failed to fetch menu data: ${response.status} - ${response.statusText}`,
    );
  }
  return await response.text();
}

export async function runScrapper() {
  const trx = await db.transaction();
  try {
    const html = await getMenuHTMLOrFail();
    // Extract hash
    const newHash = await getHash(html);
    const storedHash = await WebsiteHash.query().where("hash", newHash).first();
    // Compare to existing
    if (storedHash !== null) {
      await storedHash.merge({ updatedAt: DateTime.now() }).save();
      logger.info(
        "Hash already exists in the database. Not proceeding with scraping.",
      );
      await trx.commit();
      return;
    }
    // Create the new hash
    const newWebsiteHash = await WebsiteHash.create(
      { hash: newHash },
      { client: trx },
    );
    // Parse the menu
    const meals = await parseMenu(html);
    // Get hashes of meals that were notified recently
    const recentlyNotifiedMealsSet = await getRecentHashes();
    for (const meal of meals) {
      const mealEntity = await addMealToDb(meal.name, meal.category);
      if (mealEntity === null) {
        continue; // Failed to add, skip
      }
      // Add as hash entry
      await HashesMeal.create(
        {
          hashFk: newWebsiteHash.hash,
          mealId: mealEntity.id,
          size: meal.size,
          price: meal.price,
        },
        { client: trx },
      );
      logger.debug(`${meal.name} added as ${newWebsiteHash.hash} connection.`);
      // Check if meal was notified recently
      if (!recentlyNotifiedMealsSet.has(mealEntity.id)) {
        // If not, notify
        logger.info(
          `Meal ${meal.name} has not been notified about recently. Sending notification...`,
        );
        await notifyFavouriteMeal(mealEntity.id);
      }
      recentlyNotifiedMealsSet.add(mealEntity.id);
    }
    logger.info("Menu updated successfully.");
    await trx.commit();
  } catch (error) {
    assert(error instanceof Error);
    await trx.rollback();
    logger.error(`Failed to update menu: ${error.message}`, error.stack);
  }
}

/**
 * Gets the ids of the meals that have been notified since the current day began (that is, since 00:00:00)
 */
async function getRecentHashes(): Promise<Set<number>> {
  const since = DateTime.now().startOf("day");
  const recentHashes = await HashesMeal.query()
    .select("meal_id")
    .where("created_at", ">", since.toJSDate());
  return new Set<number>(recentHashes.map((hash) => hash.mealId));
}

export async function parseMenu(html: string) {
  const $ = cheerio.load(html);

  return $(".category")
    .map((_, category) => {
      const categoryName = $(category).find(".cat_name h2").text().trim();
      const categoryEnum = assignCategories(categoryName);

      return $(category)
        .find(".pos ul li")
        .map((__, item) => {
          const itemText = item.children
            .find((el) => el.type === ElementType.Text)
            ?.data.trim()
            .replace(/\s+/g, " ");

          // failed to extract only the text field
          // return empty array to have .flat() skip this iteration
          if (itemText === undefined) {
            return [];
          }

          const price = $(item).find(".price").text().trim();
          const priceNumeric = Number.parseFloat(price);

          if (
            categoryEnum === MealCategory.TechnicalInfo ||
            priceNumeric === 0
          ) {
            return {
              name: itemText,
              size: "-",
              price: 0,
              category: MealCategory.TechnicalInfo,
            };
          }

          const sizeMatch = SIZE_REGEX.exec(itemText);
          const itemSize =
            sizeMatch !== null ? sizeMatch[0].trim().replace(" ", "") : "-";
          const itemName = itemText.replace(SIZE_REGEX, "").trim();

          return {
            name: itemName,
            size: itemSize,
            price: priceNumeric,
            category: categoryEnum,
          };
        })
        .get();
    })
    .get()
    .flat();
}

export async function getHash(html: string) {
  return createHash("sha256").update(html).digest("hex");
}

function assignCategories(category: string) {
  switch (category.toLowerCase()) {
    case "surówki":
      return MealCategory.Salad;
    case "zupy":
      return MealCategory.Soup;
    case "dania jarskie":
      return MealCategory.VegetarianDish;
    case "dania mięsne":
      return MealCategory.MeatDish;
    case "dodatki":
      return MealCategory.SideDish;
    case "desery":
      return MealCategory.Dessert;
    case "kompoty i napoje":
      return MealCategory.Drink;
    default:
      return MealCategory.TechnicalInfo;
  }
}

async function addMealToDb(
  name: string,
  category: MealCategory | null,
): Promise<Meal | null> {
  try {
    let mealQuery = Meal.query().where("name", name);
    if (category !== null) {
      mealQuery = mealQuery.where("category", category);
    } else {
      mealQuery = mealQuery.whereNull("category");
    }
    const existingMeal = await mealQuery.first();
    if (existingMeal !== null) {
      logger.debug(`Meal ${name} already exists in the database`);
      return existingMeal;
    } else {
      logger.debug(`Meal ${name} does not exist in the database. Creating...`);
      return await Meal.create({ name, category });
    }
  } catch (error) {
    assert(error instanceof Error);
    logger.error(
      `Failed to check or create meal ${name}: ${error.message}`,
      error.stack,
    );
    return null;
  }
}
