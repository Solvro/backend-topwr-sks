import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'hashes_meals'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.text('hash_fk').references('hash').inTable('website_hashes').onDelete('CASCADE')
      table.bigint('meal_id').references('id').inTable('meals').onDelete('CASCADE')

      table.text('size')
      table.decimal('price', 4, 2).notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
