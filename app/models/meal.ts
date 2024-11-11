import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import WebsiteHash from './website_hash.js'
import * as relations from '@adonisjs/lucid/types/relations'

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
  declare id: bigint

  @column()
  declare name: string

  @column()
  declare category: MealCategory | null

  @manyToMany(() => WebsiteHash, {
    pivotTable: 'hashes_meals',
    pivotColumns: ['size', 'price'],
    pivotForeignKey: 'meal_id',
    pivotRelatedForeignKey: 'hash_fk',
    pivotTimestamps: true,
  })
  declare hashes: relations.ManyToMany<typeof WebsiteHash>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
