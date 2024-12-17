import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "sks_users";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.timestamp("external_timestamp").primary();
      table.integer("active_users").notNullable();
      table.integer("moving_average_21").notNullable();

      table.timestamp("created_at");
      table.timestamp("updated_at");
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
