import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import HashesMeal from './hashes_meal.js'

export default class WebsiteHash extends BaseModel {
  @column({ isPrimary: true })
  declare hash: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => HashesMeal)
  declare meals: HasMany<typeof HashesMeal>
}
