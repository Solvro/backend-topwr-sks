import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export enum MealCategory {
  SALAD = 'SALAD',
  SOUP = 'SOUP',
  VEGETARIAN_DISH = 'VEGETARIAN_DISH',
  MEAT_DISH = 'MEAT_DISH',
  DESSERT = 'DESSERT',
  SIDE_DISH = 'SIDE_DISH',
  DRINK = 'DRINK',
}

export default class Meal extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare category: MealCategory | null

  @column()
  declare size: string | null

  @column()
  declare price: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
