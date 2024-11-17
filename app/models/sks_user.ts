import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class SksUser extends BaseModel {
  @column.dateTime({ isPrimary: true })
  declare externalTimestamp: DateTime

  @column()
  // @example(21)
  declare activeUsers: number

  @column()
  // @example(37)
  declare movingAverage21: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
