import assert from "node:assert";
import { z } from "zod";

import type { HttpContext } from "@adonisjs/core/http";

import Device from "#models/device";
import Meal from "#models/meal";

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

      const device = await Device.query()
        .where("deviceKey", deviceKey)
        .preload("meals")
        .firstOrFail();

      const meal = await Meal.findOrFail(mealId);
      const existingMealIndex = device.meals.indexOf(meal);
      if (subscribe) {
        const res = response.status(200);
        if (existingMealIndex !== -1) {
          return res.json({ message: "Already subscribed" });
        }
        device.meals.push(meal);
        await device.save();
        return res.json({ message: "Subscribed" });
      } else {
        const res = response.status(200);
        if (existingMealIndex !== -1) {
          device.meals.splice(existingMealIndex, 1);
          await device.save();
          return res.json({ message: "Unsubscribed" });
        }
        return res.json({ message: "Was not subscribed to this meal" });
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
   * @summary Get meals the device is subscribed to
   */
  async listForDevice({ request, response }: HttpContext) {
    try {
      const deviceKey = deviceKeySchema.parse(request.param("deviceKey"));

      const device = await Device.query()
        .where("deviceKey", deviceKey)
        .preload("meals")
        .firstOrFail();

      return response.status(200).json({
        subscriptions: device.meals,
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
