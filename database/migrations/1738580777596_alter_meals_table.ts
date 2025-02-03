import { BaseSchema } from "@adonisjs/lucid/schema";

import { MealCategory } from "#models/meal";

export default class UpdateMealCategoryEnum extends BaseSchema {
  protected tableName = "meals";

  async up() {
    // Step 1: Create new enum type
    this.schema.raw(
      `CREATE TYPE "new_meal_category" AS ENUM (${Object.values(MealCategory)
        .map((v) => `'${v}'`)
        .join(", ")})`,
    );

    // Step 2: Add new column with the new enum type
    this.schema.alterTable(this.tableName, (table) => {
      table.specificType("new_category", "new_meal_category").notNullable();
    });

    // Step 3: Migrate data from old column to new column
    this.schema.raw(
      'UPDATE "meals" SET "new_category" = category::text::new_meal_category',
    );

    // Step 4: Drop old column and enum
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn("category");
    });
    this.schema.raw('DROP TYPE IF EXISTS "meal_category"');

    // Step 5: Rename new column to match the old one
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn("new_category", "category");
    });
  }

  async down() {
    // Step 1: Recreate the old enum type
    this.schema.raw(
      `CREATE TYPE "meal_category" AS ENUM (${Object.keys(MealCategory)
        .map((k) => `'${k}'`)
        .join(", ")})`,
    );

    // Step 2: Add old column back
    this.schema.alterTable(this.tableName, (table) => {
      table.specificType("old_category", "meal_category").notNullable();
    });

    // Step 3: Migrate data back
    this.schema.raw(
      'UPDATE "meals" SET "old_category" = category::text::meal_category',
    );

    // Step 4: Drop new column and new enum
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn("category");
    });
    this.schema.raw('DROP TYPE IF EXISTS "new_meal_category"');

    // Step 5: Rename old column back to original name
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn("old_category", "category");
    });
  }
}
