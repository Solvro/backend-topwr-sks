import { BaseSchema } from "@adonisjs/lucid/schema";

import { MealCategory } from "#models/meal";

export default class extends BaseSchema {
  protected tableName = "meals";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements("id");

      table.text("name").notNullable();
      table.enum("category", Object.keys(MealCategory), {
        useNative: true,
        enumName: "meal_category",
        existingType: false,
      });

      table.timestamp("created_at");
      table.timestamp("updated_at");
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
    this.schema.raw('DROP TYPE IF EXISTS "meal_category"');
  }
}
