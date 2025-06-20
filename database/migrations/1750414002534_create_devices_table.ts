import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "devices";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements("id");
      table.text("device_key").notNullable();
      table.text("registration_token").nullable();
      table.timestamp("token_timestamp").nullable();

      table.timestamp("created_at");
      table.timestamp("updated_at");
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
