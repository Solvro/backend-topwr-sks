import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class SksUser extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare activeUsers: number

  @column()
  declare movingAverage21: number

  @column.dateTime()
  declare externalTimestamp: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
