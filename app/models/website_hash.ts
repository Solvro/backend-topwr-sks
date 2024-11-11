import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import HashesMeal from './hashes_meal.js'

export default class WebsiteHash extends BaseModel {
  @column({ isPrimary: true })
  // @example(80845fe1a68deadbb4febc3f6dbae98b64a3df7a1648edd417a8ece3164182f4)
  declare hash: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => HashesMeal)
  declare meals: HasMany<typeof HashesMeal>
}
