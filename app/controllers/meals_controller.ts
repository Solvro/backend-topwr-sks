import Meal from '#models/meal'
import type { HttpContext } from '@adonisjs/core/http'

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
}
