import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "devices";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.text("device_key").primary();
      table.text("registration_token").nullable();
      table.timestamp("token_timestamp").nullable();

      table.timestamp("created_at").notNullable();
      table.timestamp("updated_at").notNullable();
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
