import { DateTime } from "luxon";
import assert from "node:assert";

import type { HttpContext } from "@adonisjs/core/http";
import logger from "@adonisjs/core/services/logger";

import HashesMeal from "#models/hashes_meal";
import WebsiteHash from "#models/website_hash";

export default class MealsController {
  /**
   * @current
   * @summary Get current menu items and online status
   * @description Retrieves the most recent menu items from the latest website scrape. If the latest scrape returned no meals, falls back to the previous scrape.
   * @responseBody 200 - {"meals":[{"id":"number","name":"string","category":"SALAD|SOUP|VEGETARIAN_DISH|MEAT_DISH|DESSERT|SIDE_DISH|DRINK|TECHNICAL_INFO","createdAt":"timestamp","updatedAt":"timestamp","description":"string","size":"string","price":"number"}],"isMenuOnline":"boolean","lastUpdate":"timestamp"}
   * @responseBody 500 - {"message":"string","error":"string"}
   */
  async current({ response }: HttpContext) {
    try {
      const lastHash = await WebsiteHash.query()
        .orderBy("updatedAt", "desc")
        .first();
      if (lastHash === null) {
        logger.debug("No records in the database - run scrapper");
        return response
          .status(200)
          .json({ meals: [], isMenuOnline: false, lastUpdate: DateTime.now() });
      }
      let isMenuOnline = true;
      let todayMeals = await getMealsByHash(lastHash.hash);
      logger.debug(`fetched ${todayMeals.length} meals from the database}`);

      if (todayMeals.length !== 0) {
        return response.status(200).json({
          meals: getMealsDetails(todayMeals),
          isMenuOnline,
          lastUpdate: lastHash.updatedAt,
        });
      }

      isMenuOnline = false;
      logger.debug(
        "No meals found in the latest hash - fetching the previous one",
      );

      const secondLastHash = await WebsiteHash.query()
        .orderBy("updatedAt", "desc")
        .offset(1)
        .first();
      if (secondLastHash === null) {
        return response
          .status(200)
          .json({ meals: [], isMenuOnline, lastUpdate: lastHash.updatedAt });
      }
      todayMeals = await getMealsByHash(secondLastHash.hash);
      logger.debug(`fetched ${todayMeals.length} meals from the database}`);

      return response.status(200).json({
        meals: getMealsDetails(todayMeals),
        isMenuOnline,
        lastUpdate: secondLastHash.updatedAt,
      });
    } catch (error) {
      assert(error instanceof Error);
      return response
        .status(500)
        .json({ message: "Failed to fetch meals", error: error.message });
    }
  }

  /**
   * @index
   * @summary Get paginated historical menus
   * @description Retrieves a paginated list of historical menus grouped by their scrape hash. Each group includes the menu items and metadata about when the scrape occurred.
   * @paramQuery page - Page number for pagination - @type(integer) @minimum(1) @default(1)
   * @paramQuery limit - Number of records per page - @type(integer) @minimum(1) @default(10)
   * @responseBody 200 - [{"hash":"string","createdAt":"string","updatedAt":"string","meals":[{"id":"number","name":"string","category":"SALAD|SOUP|VEGETARIAN_DISH|MEAT_DISH|DESSERT|SIDE_DISH|DRINK|TECHNICAL_INFO","createdAt":"timestamp","updatedAt":"timestamp","description":"string","size":"string","price":"number"}]}]
   * @responseBody 500 - {"message":"string","error":"string"}
   */
  async index({ request, response }: HttpContext) {
    try {
      const page = request.input("page", 1) as number;
      const limit = request.input("limit", 10) as number;

      const hashes = await HashesMeal.query()
        .orderBy("createdAt", "desc")
        .preload("websiteHash")
        .paginate(page, limit);

      const meals = await Promise.all(
        hashes.map(async (hash) => ({
          hash: hash.hashFk,
          createdAt: hash.websiteHash.createdAt,
          updatedAt: hash.websiteHash.updatedAt,
          meals: await getMealsByHash(hash.hashFk).then((hashedMeals) =>
            hashedMeals.map((singleMeal) => ({
              ...singleMeal.meal.serialize(),
              price: singleMeal.price,
              size: singleMeal.size,
            })),
          ),
        })),
      );

      return response.status(200).json(meals);
    } catch (error) {
      assert(error instanceof Error);
      return response
        .status(500)
        .json({ message: "Failed to fetch meals", error: error.message });
    }
  }
}

async function getMealsByHash(hash: string) {
  try {
    return await HashesMeal.query().where("hashFk", hash).preload("meal");
  } catch (error) {
    logger.error(`Failed to fetch meals for hash ${hash}`, error);
    return [];
  }
}

function getMealsDetails(todayMeals: HashesMeal[]) {
  return todayMeals.map((singleMeal) => ({
    ...singleMeal.meal.serialize(),
    price: singleMeal.price,
    size: singleMeal.size,
  }));
}
