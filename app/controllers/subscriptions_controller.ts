import assert from "node:assert";
import { z } from "zod";

import type { HttpContext } from "@adonisjs/core/http";

import Device from "#models/device";
import Meal from "#models/meal";
import Subscription from "#models/subscription";

const SubscriptionToggleSchema = z.object({
  deviceKey: z.string().min(1),
  mealId: z.number(),
  subscribe: z.boolean(),
});

interface RawSubscriptionToggleInput {
  device_key: unknown;
  meal_id: unknown;
  subscribe: unknown;
}

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
        deviceKey: raw.device_key,
        mealId: raw.meal_id,
        subscribe: raw.subscribe,
      });

      const { deviceKey, mealId, subscribe } = parsed;

      const device = await Device.findByOrFail("deviceKey", deviceKey);
      const meal = await Meal.findOrFail(mealId);

      const existing = await Subscription.query()
        .where("deviceId", device.id)
        .andWhere("mealId", meal.id)
        .first();

      if (subscribe) {
        if (existing === null) {
          await Subscription.create({ deviceId: device.id, mealId: meal.id });
        }
        return response.status(200).json({ message: "Subscribed" });
      } else {
        if (existing !== null) {
          await existing.delete();
        }
        return response.status(200).json({ message: "Unsubscribed" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({
          message: "Invalid input",
          error: error.message,
        });
      }

      assert(error instanceof Error);
      return response.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }

  /**
   * @current
   * @summary Get current menu items and online status
   * @description Retrieves the most recent menu items from the latest website scrape. If the latest scrape returned no meals, falls back to the previous scrape.
   * @responseBody 200 - {"meals":[{"id":"number","name":"string","category":"SALAD|SOUP|VEGETARIAN_DISH|MEAT_DISH|DESSERT|SIDE_DISH|DRINK|TECHNICAL_INFO","createdAt":"timestamp","updatedAt":"timestamp","description":"string","size":"string","price":"number"}],"isMenuOnline":"boolean","lastUpdate":"timestamp"}
   * @responseBody 500 - {"message":"string","error":"string"}
   */
  async listForDevice({ request, response }: HttpContext) {
    try {
      const deviceKey = request.param("device_key") as string;

      const device = await Device.findByOrFail("deviceKey", deviceKey);

      const subscriptions = await Subscription.query()
        .where("deviceId", device.id)
        .preload("meal");

      return response.status(200).json({
        subscriptions: subscriptions.map((sub) => ({
          id: sub.id,
          meal: sub.meal.serialize(),
          subscribedAt: sub.createdAt,
        })),
      });
    } catch (error) {
      assert(error instanceof Error);
      return response.status(500).json({
        message: "Failed to list subscriptions",
        error: error.message,
      });
    }
  }
}
