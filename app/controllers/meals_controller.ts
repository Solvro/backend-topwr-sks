import vine from "@vinejs/vine";
import { DateTime } from "luxon";

import type { HttpContext } from "@adonisjs/core/http";
import logger from "@adonisjs/core/services/logger";
import db from "@adonisjs/lucid/services/db";

import HashesMeal from "#models/hashes_meal";
import Meal from "#models/meal";

const paginationValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).optional(),
  }),
);

const recentSearchValidator = vine.compile(
  vine.object({
    search: vine.string().trim().optional(),
  }),
);

interface WebsiteHashIsOnlineResponse {
  hash: string;
  is_online: boolean;
  updated_at: Date;
}

export default class MealsController {
  /**
   * @current
   * @summary Get current menu items and online status
   * @description Retrieves the most recent menu items from the latest website scrape. If the latest scrape returned no meals, falls back to the previous scrape.
   * @responseBody 200 - {"meals":[{"id":"number","name":"string","category":"SALAD|SOUP|VEGETARIAN_DISH|MEAT_DISH|DESSERT|SIDE_DISH|DRINK|TECHNICAL_INFO","createdAt":"timestamp","updatedAt":"timestamp","description":"string","size":"string","price":"number"}],"isMenuOnline":"boolean","lastUpdate":"timestamp"}
   * @responseBody 500 - {"message":"string","error":"string"}
   */
  async current({ response }: HttpContext) {
    const data = await db.rawQuery<{
      rows: WebsiteHashIsOnlineResponse[];
    }>(
      `WITH latest_hash AS (
        SELECT hash FROM website_hashes
        ORDER BY updated_at DESC
        LIMIT 1
      )
      SELECT website_hashes.*, website_hashes.hash IN (SELECT hash FROM latest_hash) AS is_online
        FROM public.website_hashes LEFT JOIN public.hashes_meals ON website_hashes.hash = hashes_meals.hash_fk
      GROUP BY website_hashes.hash
      HAVING COUNT(hashes_meals.*) != 0
      ORDER BY website_hashes.updated_at DESC
      LIMIT 1`,
    );
    const lastHash = data.rows.at(0);

    if (lastHash === undefined) {
      logger.debug("No records in the database - run scrapper");
      return response
        .status(200)
        .json({ meals: [], isMenuOnline: false, lastUpdate: DateTime.now() });
    }
    const todayMeals = await getMealsByHash(lastHash.hash);
    logger.debug(`fetched ${todayMeals.length} meals from the database`);
    return response.status(200).json({
      meals: getMealsDetails(todayMeals),
      isMenuOnline: lastHash.is_online,
      lastUpdate: lastHash.updated_at,
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
    const payload = await request.validateUsing(paginationValidator);

    const page = payload.page ?? 1;
    const limit = payload.limit ?? 10;

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
    const payload = await request.validateUsing(recentSearchValidator);
    const rawSearch = payload.search ?? "";
    const sevenDaysAgo = DateTime.now().minus({ days: 7 }).toJSDate();

    const meals = await Meal.query()
      .select("meals.*")
      .innerJoin("hashes_meals", "hashes_meals.meal_id", "meals.id")
      .innerJoin(
        "website_hashes",
        "website_hashes.hash",
        "hashes_meals.hash_fk",
      )
      .where("website_hashes.updated_at", ">=", sevenDaysAgo)
      .if(rawSearch, (query) => {
        void query.whereILike("meals.name", `%${rawSearch}%`);
      })
      .orderBy("meals.name", "asc")
      .distinct("meals.id")
      .exec()
      .addErrorContext(
        () =>
          `Failed to fetch distinct meals from the last 7 days with search term "${rawSearch}"`,
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
    .exec()
    .addErrorContext(() => `Failed to fetch meals for hash ${hash}`);
}

function getMealsDetails(todayMeals: HashesMeal[]) {
  return todayMeals.map((singleMeal) => ({
    ...singleMeal.meal.serialize(),
    price: singleMeal.price,
    size: singleMeal.size,
  }));
}
