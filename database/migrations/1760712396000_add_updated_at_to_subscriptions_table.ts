import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "subscriptions";

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp("updated_at").notNullable().defaultTo(this.now());
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn("updated_at");
    });
  }
}
