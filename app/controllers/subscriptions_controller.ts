import vine from "@vinejs/vine";

import type { HttpContext } from "@adonisjs/core/http";
import db from "@adonisjs/lucid/services/db";

import Device from "#models/device";

const SubscriptionToggleValidator = vine.compile(
  vine.object({
    deviceKey: vine.string().minLength(1),
    mealId: vine.number(),
    subscribe: vine.boolean(),
  }),
);

interface PgResult {
  rowCount: number;
}

const deviceKeyValidator = vine.compile(vine.string().minLength(1));

export default class SubscriptionsController {
  /**
   * @toggle
   * @summary Toggle subscription
   * @description Subscribes or unsubscribe for a meal - Get a notification if the meal is currently on the menu.
   * @requestBody {"deviceKey":"string","mealId":"integer","subscribe":"boolean"}
   * @responseBody 200 - {"message":"string"}
   * @responseBody 400 - {"message":"string","error":"string"}
   * @responseBody 500 - {"message":"string","error":"string"}
   */
  async toggle({ request, response }: HttpContext) {
    const payload = await request.validateUsing(SubscriptionToggleValidator);
    const { deviceKey, mealId, subscribe } = payload;
    if (subscribe) {
      const res = (await db.rawQuery(
        "INSERT INTO subscriptions (device_key, meal_id, created_at) VALUES (?, ?, NOW()) ON CONFLICT DO NOTHING",
        [deviceKey, mealId],
        { mode: "write" },
      )) as unknown as PgResult;
      if (res.rowCount === 0) {
        return response.ok({ message: "Already subscribed" });
      } else {
        return response.ok({ message: "Subscribed" });
      }
    } else {
      const res = (await db.rawQuery(
        "DELETE FROM subscriptions WHERE device_key = ? AND meal_id = ?",
        [deviceKey, mealId],
        { mode: "write" },
      )) as unknown as PgResult;
      if (res.rowCount === 0) {
        return response.ok({ message: "Was not subscribed" });
      } else {
        return response.ok({ message: "Unsubscribed" });
      }
    }
  }

  /**
   * @current
   * @summary Get meals the device is subscribed to
   */
  async listForDevice({ request, response }: HttpContext) {
    const deviceKey = await deviceKeyValidator.validate(
      request.param("deviceKey"),
    );

    const device = await Device.query()
      .where("deviceKey", deviceKey)
      .preload("meals")
      .first()
      .addErrorContext(`Failed to fetch subscriptions for this device`);

    if (device === null) {
      return response.ok({
        subscriptions: [],
      });
    }

    return response.ok({
      meals: device.meals,
    });
  }
}
