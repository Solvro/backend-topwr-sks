import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
        CREATE OR REPLACE FUNCTION get_recent_hashes(
            date_from_ms BIGINT
        )
                RETURNS BIGINT[]
                LANGUAGE PLPGSQL
            AS
            '
                DECLARE
                    since TIMESTAMP := TO_TIMESTAMP(date_from_ms / 1000.0);
                    result BIGINT[];
                BEGIN
                    SELECT array_agg(meal_id)
                    INTO result
                    FROM hashes_meals
                    WHERE created_at > since;
                    RETURN result;
                END;
            ';
    `);
  }

  async down() {
    this.schema.raw("DROP FUNCTION get_recent_hashes(BIGINT)");
  }
}
