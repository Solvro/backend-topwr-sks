import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class SksUser extends BaseModel {
  @column.dateTime({ isPrimary: true })
  declare externalTimestamp: DateTime

  @column()
  declare activeUsers: number

  @column()
  declare movingAverage21: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
