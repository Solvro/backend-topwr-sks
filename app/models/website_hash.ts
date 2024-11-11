import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Meal from './meal.js'
import * as relations from '@adonisjs/lucid/types/relations'

export default class WebsiteHash extends BaseModel {
  @column({ isPrimary: true })
  declare hash: string

  @manyToMany(() => Meal, {
    pivotTable: 'hashes_meals',
    pivotColumns: ['size', 'price'],
    pivotForeignKey: 'hash_fk',
    pivotRelatedForeignKey: 'meal_id',
    pivotTimestamps: true,
  })
  declare meals: relations.ManyToMany<typeof Meal>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
