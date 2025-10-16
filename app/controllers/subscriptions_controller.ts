import { z } from "zod";

import type { HttpContext } from "@adonisjs/core/http";
import db from "@adonisjs/lucid/services/db";

import { handleError } from "#exceptions/handler";
import Device from "#models/device";

const SubscriptionToggleSchema = z.object({
  deviceKey: z.string().min(1),
  mealId: z.number(),
  subscribe: z.boolean(),
});

interface RawSubscriptionToggleInput {
  deviceKey: unknown;
  mealId: unknown;
  subscribe: unknown;
}

interface PgResult {
  rowCount: number;
}

const deviceKeySchema = z.string().min(1, "deviceKey param is required");

export default class SubscriptionsController {
  /**
   * @toggle
   * @summary Toggle subscription
   * @description Subscribes or unsubscribe for a meal - Get a notification if the meal is currently on the menu.
   * @requestBody {"device_key":"string","meal_id":"integer","subscribe":"boolean"}
   * @responseBody 200 - {"message":"string"}
   * @responseBody 400 - {"message":"string","error":"string"}
   * @responseBody 500 - {"message":"string","error":"string"}
   */
  async toggle({ request, response }: HttpContext) {
    try {
      const raw = request.body() as RawSubscriptionToggleInput;

      const parsed = SubscriptionToggleSchema.parse({
        deviceKey: raw.deviceKey,
        mealId: raw.mealId,
        subscribe: raw.subscribe,
      });
      const { deviceKey, mealId, subscribe } = parsed;

      if (subscribe) {
        const res: PgResult = await db.rawQuery(
          "INSERT INTO subscriptions (device_key, meal_id, created_at) VALUES (?, ?, NOW()) ON CONFLICT DO NOTHING",
          [deviceKey, mealId],
          { mode: "write" },
        );
        if (res.rowCount === 0) {
          return response.ok({ message: "Already subscribed" });
        } else {
          return response.ok({ message: "Subscribed" });
        }
      } else {
        const res: PgResult = await db.rawQuery(
          "DELETE FROM subscriptions WHERE device_key = ? AND meal_id = ?",
          [deviceKey, mealId],
          { mode: "write" },
        );
        if (res.rowCount === 0) {
          return response.ok({ message: "Was not subscribed" });
        } else {
          return response.ok({ message: "Unsubscribed" });
        }
      }
    } catch (error) {
      return handleError(error, response);
    }
  }

  /**
   * @current
   * @summary Get meals the device is subscribed to
   */
  async listForDevice({ request, response }: HttpContext) {
    try {
      const deviceKey = deviceKeySchema.parse(request.param("deviceKey"));

      const device = await Device.query()
        .where("deviceKey", deviceKey)
        .preload("meals")
        .first();

      if (device === null) {
        return response.ok({
          subscriptions: [],
        });
      }

      return response.ok({
        subscriptions: device.meals,
      });
    } catch (error) {
      return handleError(error, response);
    }
  }
}
