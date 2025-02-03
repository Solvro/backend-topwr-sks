import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "meals";
  protected readonly mealCategories = [
    "SALAD",
    "SOUP",
    "VEGETARIAN_DISH",
    "MEAT_DISH",
    "DESSERT",
    "SIDE_DISH",
    "DRINK",
    "TECHNICAL_INFO",
  ];

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements("id");

      table.text("name").notNullable();
      table.enum("category", this.mealCategories, {
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
