import HashesMeal from '#models/hashes_meal'
import WebsiteHash from '#models/website_hash'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

export default class MealsController {
  /**
   * @index
   * @summary Retrieves a list of all menu items.
   * @description Retrieves a list of all menu items, including dish names, sizes, and prices.
   * @responseBody 200 - <Meal[]>
   * @responseBody 500 - {"message": "Failed to fetch meals", "error": "Some error message"}
   */
  async current({ response }: HttpContext) {
    try {
      const lastHash = await WebsiteHash.query().orderBy('createdAt', 'desc').first()
      if (!lastHash) {
        return response.status(200).json({ meals: [], isMenuOnline: false })
      }
      let isMenuOnline = true
      let todayMeals = await getMealsByHash(lastHash.hash)

      if (todayMeals.length === 0) {
        const secondLastHash = await WebsiteHash.query()
          .orderBy('createdAt', 'desc')
          .offset(1)
          .first()
        isMenuOnline = false
        if (!secondLastHash) {
          return response.status(200).json({ meals: [], isMenuOnline })
        }
        todayMeals = await getMealsByHash(secondLastHash.hash)
      }

      const meals = todayMeals.map((singleMeal) => ({
        ...singleMeal.meal.serialize(),
        price: singleMeal.price,
        size: singleMeal.size,
      }))

      return response.status(200).json({ meals, isMenuOnline })
    } catch (error) {
      return response.status(500).json({ message: 'Failed to fetch meals', error: error.message })
    }
  }

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
