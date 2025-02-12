import { DateTime } from "luxon";
import assert from "node:assert";

import logger from "@adonisjs/core/services/logger";
import db from "@adonisjs/lucid/services/db";

import env from "#start/env";

const url = env.get("USERS_URL");

export async function runScrapper() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.error(
        `Failed to fetch data: ${response.status} ${response.statusText}`,
      );
      return;
    }

    const usersData = await response.text();
    const currentDateTime = DateTime.now().setZone("Europe/Warsaw");

    const rows = usersData.trim().split("\n");

    const values = rows.map((row) => {
      const [time, movingAverage21, activeUsers] = row.split(";");
      const timestamp = currentDateTime.set({
        hour: Number.parseInt(time.split(":")[0], 10),
        minute: Number.parseInt(time.split(":")[1], 10),
        second: 0,
        millisecond: 0,
      });

      return {
        timestamp,
        activeUsers: Number(activeUsers),
        movingAverage21: Number(movingAverage21),
      };
    });

    const query = `
      INSERT INTO sks_users (external_timestamp, active_users, moving_average_21, created_at, updated_at)
      VALUES ${values.map(() => "(?, ?, ?, NOW(), NOW())").join(", ")}
      ON CONFLICT (external_timestamp) DO UPDATE SET
        active_users = EXCLUDED.active_users,
        moving_average_21 = EXCLUDED.moving_average_21,
        updated_at = NOW()
    `;

    const parameters = values.flatMap(
      ({ timestamp, activeUsers, movingAverage21 }) => [
        timestamp,
        activeUsers,
        movingAverage21,
      ],
    );

    await db.rawQuery(query, parameters);
    logger.info(`SKS users data updated successfully.`);
  } catch (error) {
    assert(error instanceof Error);
    logger.error(
      `Failed to update sks_users data: ${error.message}`,
      error.stack,
    );
  }
}
