import { DateTime } from "luxon";
import { z } from "zod";

import type { HttpContext } from "@adonisjs/core/http";
import logger from "@adonisjs/core/services/logger";
import db from "@adonisjs/lucid/services/db";

import HashesMeal from "#models/hashes_meal";
import Meal from "#models/meal";
import WebsiteHash from "#models/website_hash";

const firstHashWithMealsRawSchema = z.object({
  rows: z
    .array(
      z.object({
        hash: z.string(),
      }),
    )
    .nonempty(),
});

const distinctMealIdsSchema = z.array(
  z.object({
    meal_id: z.coerce.number(),
  }),
);

export default class MealsController {
  /**
   * @current
   * @summary Get current menu items and online status
   * @description Retrieves the most recent menu items from the latest website scrape. If the latest scrape returned no meals, falls back to the previous scrape.
   * @responseBody 200 - {"meals":[{"id":"number","name":"string","category":"SALAD|SOUP|VEGETARIAN_DISH|MEAT_DISH|DESSERT|SIDE_DISH|DRINK|TECHNICAL_INFO","createdAt":"timestamp","updatedAt":"timestamp","description":"string","size":"string","price":"number"}],"isMenuOnline":"boolean","lastUpdate":"timestamp"}
   * @responseBody 500 - {"message":"string","error":"string"}
   */
  async current({ response }: HttpContext) {
    const lastHash = await WebsiteHash.query()
      .orderBy("updatedAt", "desc")
      .first()
      .addErrorContext(
        () => "Failed to fetch the latest menu version from the database",
      );
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
    const firstHashWithMealsRaw = firstHashWithMealsRawSchema.parse(
      await db
        .rawQuery(
          `
          SELECT website_hashes.hash FROM public.website_hashes LEFT JOIN public.hashes_meals ON website_hashes.hash = hashes_meals.hash_fk
          GROUP BY website_hashes.hash
          HAVING COUNT(hashes_meals.*) != 0
          ORDER BY website_hashes.updated_at DESC
          LIMIT 1
        `,
        )
        .addErrorContext(
          () => "Failed to fetch the first hash with meals from the database",
        ),
    ).rows[0].hash;
    const firstHashWithMeals = await WebsiteHash.query()
      .where("hash", firstHashWithMealsRaw)
      .firstOrFail()
      .addErrorContext(
        () =>
          `Failed to fetch the website hash record for hash ${firstHashWithMealsRaw}`,
      );
    todayMeals = await getMealsByHash(firstHashWithMeals.hash);
    logger.debug(`fetched ${todayMeals.length} meals from the database}`);
    return response.status(200).json({
      meals: getMealsDetails(todayMeals),
      isMenuOnline,
      lastUpdate: firstHashWithMeals.updatedAt,
    });
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
    const page = request.input("page", 1) as number;
    const limit = request.input("limit", 10) as number;

    const hashes = await HashesMeal.query()
      .orderBy("createdAt", "desc")
      .preload("websiteHash")
      .paginate(page, limit)
      .addErrorContext(
        () =>
          `Failed to fetch historical menus for page ${page} with limit ${limit}`,
      );

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
  }

  /**
   * @recent
   * @summary Get distinct meals from the last 7 days
   * @description Returns unique meals that appeared on the menu over the previous 7 days. Supports optional case-insensitive name filtering.
   * @paramQuery search - Filter results by meal name - @type(string)
   * @responseBody 200 - {"meals":[{"id":"number","name":"string","category":"SALAD|SOUP|VEGETARIAN_DISH|MEAT_DISH|DESSERT|SIDE_DISH|DRINK|TECHNICAL_INFO","createdAt":"timestamp","updatedAt":"timestamp"}]}
   * @responseBody 500 - {"message":"string","error":"string"}
   */
  async recent({ request, response }: HttpContext) {
    const rawSearch = (request.input("search", "") as string).trim();
    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();

    const mealIdRows = await db
      .from("hashes_meals")
      .innerJoin(
        "website_hashes",
        "hashes_meals.hash_fk",
        "website_hashes.hash",
      )
      .innerJoin("meals", "hashes_meals.meal_id", "meals.id")
      .where("website_hashes.updated_at", ">=", sevenDaysAgo)
      .if(rawSearch !== "", (query) => {
        void query.whereILike("meals.name", `%${rawSearch}%`);
      })
      .select("hashes_meals.meal_id as meal_id")
      .distinct()
      .addErrorContext(() => "Failed to fetch meal IDs from last 7 days");

    const parsedMealIds = distinctMealIdsSchema.parse(mealIdRows);

    const mealIds = parsedMealIds.map((row) => row.meal_id);

    if (mealIds.length === 0) {
      return response.status(200).json({ meals: [] });
    }

    const meals = await Meal.query()
      .whereIn("id", mealIds)
      .orderBy("name", "asc")
      .addErrorContext(
        () =>
          `Failed to fetch meals from the last 7 days with search term '${rawSearch}'`,
      );

    return response
      .status(200)
      .json({ meals: meals.map((meal) => meal.serialize()) });
  }
}

async function getMealsByHash(hash: string) {
  return await HashesMeal.query()
    .where("hashFk", hash)
    .preload("meal")
    .addErrorContext(() => `Failed to fetch meals for hash ${hash}`);
}

function getMealsDetails(todayMeals: HashesMeal[]) {
  return todayMeals.map((singleMeal) => ({
    ...singleMeal.meal.serialize(),
    price: singleMeal.price,
    size: singleMeal.size,
  }));
}
