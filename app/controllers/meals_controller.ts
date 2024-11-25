import HashesMeal from '#models/hashes_meal'
import WebsiteHash from '#models/website_hash'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

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
      const lastHash = await WebsiteHash.query().orderBy('updatedAt', 'desc').first()
      if (!lastHash) {
        return response
          .status(200)
          .json({ meals: [], isMenuOnline: false, lastUpdate: DateTime.now() })
      }
      let isMenuOnline = true
      let todayMeals = await getMealsByHash(lastHash.hash)

      if (todayMeals.length === 0) {
        const secondLastHash = await WebsiteHash.query()
          .orderBy('updatedAt', 'desc')
          .offset(1)
          .first()
        isMenuOnline = false
        if (!secondLastHash) {
          return response
            .status(200)
            .json({ meals: [], isMenuOnline, lastUpdate: lastHash.updatedAt })
        }
        todayMeals = await getMealsByHash(secondLastHash.hash)
      }

      const meals = todayMeals.map((singleMeal) => ({
        ...singleMeal.meal.serialize(),
        price: singleMeal.price,
        size: singleMeal.size,
      }))

      return response.status(200).json({ meals, isMenuOnline, lastUpdate: lastHash.updatedAt })
    } catch (error) {
      return response.status(500).json({ message: 'Failed to fetch meals', error: error.message })
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
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)

      const hashes = await HashesMeal.query()
        .distinct('hashFk')
        .preload('websiteHash')
        .paginate(page, limit)

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
            }))
          ),
        }))
      )

      return response.status(200).json(meals)
    } catch (error) {
      return response.status(500).json({ message: 'Failed to fetch meals', error: error.message })
    }
  }
}

async function getMealsByHash(hash: string) {
  try {
    return await HashesMeal.query().where('hashFk', hash).preload('meal')
  } catch (error) {
    logger.error(`Failed to fetch meals for hash ${hash}`, error)
    return []
  }
}
