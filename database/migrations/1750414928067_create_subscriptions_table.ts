import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "subscriptions";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id");
      table.bigInteger("meal_id").unsigned();
      table.bigInteger("device_id").unsigned();

      table
        .foreign("meal_id")
        .references("id")
        .inTable("meals")
        .onDelete("CASCADE");

      table
        .foreign("device_id")
        .references("id")
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
