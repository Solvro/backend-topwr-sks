import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "subscriptions";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .bigInteger("meal_id")
        .unsigned()
        .primary()
        .references("id")
        .inTable("meals")
        .onDelete("CASCADE");
      table
        .string("device_key")
        .unsigned()
        .primary()
        .references("device_key")
        .inTable("devices")
        .onDelete("CASCADE");

      table.timestamp("created_at");
      table.timestamp("updated_at");
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
