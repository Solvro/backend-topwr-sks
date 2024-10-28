import {BaseSchema} from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'meals'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.text('name')
      table.enum('type', ['SALAD', 'SOUP', 'VEGETARIAN_DISH', 'MEAT_DISH', 'DESSERT', 'SIDE_DISH'])
      table.text('size')
      table.decimal('price', 4, 2)

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.raw('DROP TYPE IF EXISTS "type"')
    this.schema.dropTable(this.tableName)
  }
}
