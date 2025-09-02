import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.raw(`
            CREATE FUNCTION clean_tokens_and_fetch_valid(
                meal_id_value BIGINT,
                token_expiration_time_ms BIGINT
            )
                RETURNS TABLE
                        (
                            device_key         TEXT,
                            registration_token TEXT
                        )
                LANGUAGE PLPGSQL
            AS
            '
                DECLARE
                    now_ms BIGINT := EXTRACT(EPOCH FROM NOW()) * 1000;
                BEGIN
                    -- null expired tokens
                    UPDATE devices d
                    SET registration_token = NULL,
                        token_timestamp    = NULL
                    FROM subscriptions s
                    WHERE d.device_key = s.device_key
                      AND s.meal_id = meal_id_value
                      AND d.registration_token IS NOT NULL
                      AND d.token_timestamp IS NOT NULL
                      AND (now_ms - EXTRACT(EPOCH FROM d.token_timestamp) * 1000) > token_expiration_time_ms;
                    -- return valid tokens. Every token that is not null is either valid or of unknown validity
                    RETURN QUERY
                        SELECT d.device_key,
                               d.registration_token
                        FROM devices d
                                 JOIN subscriptions s ON d.device_key = s.device_key
                        WHERE s.meal_id = meal_id_value
                          AND d.registration_token IS NOT NULL;
                END;
            ';
    `);
  }

  async down() {
    this.schema.raw(`DROP FUNCTION IF EXISTS clean_tokens_and_fetch_valid`);
  }
}
