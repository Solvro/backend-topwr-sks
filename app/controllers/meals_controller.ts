import HashesMeal from '#models/hashes_meal'
import Meal from '#models/meal'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

export default class MealsController {
  /**
   * Display a list of resource
   */
  async index({ response }: HttpContext) {
    try {
      const meals = await Meal.all()
      return response.status(200).json(meals)
    } catch (error) {
      return response.status(500).json({ message: 'Failed to fetch meals', error: error.message })
    }
  }

  async history({ request, response }: HttpContext) {
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
    const hashesMeals = await HashesMeal.query().where('hashFk', hash).preload('meal')
    return hashesMeals
  } catch (error) {
    logger.error(`Failed to fetch meals for hash ${hash}`, error)
    return []
  }
}
