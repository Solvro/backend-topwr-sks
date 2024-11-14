import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Meal from './meal.js'
import WebsiteHash from './website_hash.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class HashesMeal extends BaseModel {
  @column({ isPrimary: true })
  declare hashFk: string

  @column({ isPrimary: true })
  declare mealId: number

  @column()
  declare size: string | null

  @column()
  declare price: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Meal)
  declare meal: BelongsTo<typeof Meal>

  @belongsTo(() => WebsiteHash, { foreignKey: 'hashFk' })
  declare websiteHash: BelongsTo<typeof WebsiteHash>
}
