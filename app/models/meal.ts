import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export enum MealCategory {
  SALAD = 'salad',
  SOUP = 'soup',
  VEGETARIAN_DISH = 'vegetarian_dish',
  MEAT_DISH = 'meat_dish',
  DESSERT = 'dessert',
  SIDE_DISH = 'side_dish',
}

export default class Meal extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare category: MealCategory

  @column()
  declare size: string

  @column()
  declare price: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
