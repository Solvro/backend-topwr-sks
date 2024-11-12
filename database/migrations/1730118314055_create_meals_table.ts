import { BaseSchema } from '@adonisjs/lucid/schema'
import { MealCategory } from '#models/meal'

export default class extends BaseSchema {
  protected tableName = 'meals'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id').primary()

      table.text('name').notNullable()
      table.enum('category', Object.keys(MealCategory))

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.raw('DROP TYPE IF EXISTS "type"')
    this.schema.dropTable(this.tableName)
  }
}
