import * as cheerio from "cheerio";
import { DateTime } from "luxon";
import assert from "node:assert";
import { createHash } from "node:crypto";

import logger from "@adonisjs/core/services/logger";
import db from "@adonisjs/lucid/services/db";

import { getMenuHTML } from "#helpers/captcha";
import HashesMeal from "#models/hashes_meal";
import Meal, { MealCategory } from "#models/meal";
import WebsiteHash from "#models/website_hash";

export async function runScrapper() {
  const trx = await db.transaction();

  try {
    const html = await getMenuHTML();

    const newHash = await getHash(html);
    const storedHash = await WebsiteHash.query().where("hash", newHash).first();

    if (storedHash !== null) {
      await storedHash.merge({ updatedAt: DateTime.now() }).save();
      logger.info(
        "Hash already exists in the database. Not proceeding with scraping.",
      );
      await trx.commit();
      return;
    }

    const newWebsiteHash = await WebsiteHash.create(
      { hash: newHash },
      { client: trx },
    );

    const meals = await parseMenu(html);

    for (const meal of meals) {
      if (meal.price === 0) {
        meal.category = MealCategory.TechnicalInfo;
      }
      const newMeal = await checkIfMealExistsOrCreate(meal.name, meal.category);
      if (newMeal !== null) {
        await HashesMeal.create(
          {
            hashFk: newWebsiteHash.hash,
            mealId: newMeal.id,
            size: meal.size,
            price: meal.price,
          },
          { client: trx },
        );
        logger.debug(
          `${meal.name} added as ${newWebsiteHash.hash} connection.`,
        );
      }
    }
    logger.info("Menu updated successfully.");
    await trx.commit();
  } catch (error) {
    assert(error instanceof Error);
    await trx.rollback();
    logger.error(`Failed to update menu: ${error.message}`, error.stack);
  }
}

export async function parseMenu(html: string) {
  const $ = cheerio.load(html);

  return $(".category")
    .map((_, category) => {
      const categoryName = $(category).find(".cat_name h2").text().trim();

      return $(category)
        .find(".pos ul li")
        .map((__, item) => {
          const itemText = $(item).text().trim().replace(/\s+/g, " ");
          const price = $(item).find(".price").text().trim();
          const priceNumeric = Number.parseFloat(price);

          const nameMatch = /[\D\s]+/.exec(itemText);
          const itemName = nameMatch !== null ? nameMatch[0].trim() : itemText;

          const sizeMatch =
            /\d+(?:\s?(?:g|ml))?(?:\/\d+(?:\s?(?:g|ml))?)?\s+(?=\d+(?=\.\d+)?)/.exec(
              itemText,
            );
          const itemSize =
            sizeMatch !== null ? sizeMatch[0].trim().replace(" ", "") : "-";

          return {
            name: itemName,
            size: itemSize,
            price: priceNumeric,
            category: assignCategories(categoryName),
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

async function checkIfMealExistsOrCreate(
  name: string,
  category: MealCategory | null,
) {
  try {
    let mealQuery = Meal.query().where("name", name);

    if (category !== null) {
      mealQuery = mealQuery.where("category", category);
    } else {
      mealQuery = mealQuery.whereNull("category");
    }
    const mealOrNull = await mealQuery.first();
    logger.debug(`Checking if meal ${name} exists in the database.`);

    if (mealOrNull !== null) {
      logger.debug(`Meal ${name} already exists in the database`);
      return mealOrNull;
    }

    logger.debug(
      `Meal ${name} does not exist in the database. Creating a new meal.`,
    );
    return await Meal.create({ name, category });
  } catch (error) {
    assert(error instanceof Error);
    logger.error(
      `Failed to check or create meal ${name}: ${error.message}`,
      error.stack,
    );
    return null;
  }
}
