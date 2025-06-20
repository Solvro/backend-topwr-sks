import { DateTime } from "luxon";
import assert from "node:assert";
import { z } from "zod";

import type { HttpContext } from "@adonisjs/core/http";
import logger from "@adonisjs/core/services/logger";

import Device from "#models/device";

const RegistrationTokenPayload = z.object({
  deviceKey: z.string().min(1),
  registrationToken: z.string().min(1),
});

interface RegistrationTokenInput {
  device_key: unknown;
  registration_token: unknown;
}

export default class RegistrationTokensController {
  /**
   * @update
   * @summary Register or update FCM registration token
   * @description Stores or updates the registration token for a device.
   * @requestBody {"device_key":"string", "registration_token":"string"}
   * @responseBody 200 - {"message":"string"}
   * @responseBody 400 - {"message":"string","error":"string"}
   * @responseBody 500 - {"message":"string","error":"string"}
   */
  async update({ request, response }: HttpContext) {
    try {
      const raw = request.body() as RegistrationTokenInput;

      // Convert from snake_case to camelCase and validate
      const parsed = RegistrationTokenPayload.parse({
        deviceKey: raw.device_key,
        registrationToken: raw.registration_token,
      });

      const { deviceKey, registrationToken } = parsed;

      const device = await Device.firstOrCreate(
        { deviceKey },
        {
          registrationToken,
          tokenTimestamp: DateTime.now(),
        },
      );

      if (device.registrationToken !== registrationToken) {
        device.registrationToken = registrationToken;
        device.tokenTimestamp = DateTime.now();
        await device.save();
      }

      return response
        .status(200)
        .json({ message: "Token updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return response.status(400).json({
          message: "Invalid input",
          error: error.message,
        });
      }

      assert(error instanceof Error);
      logger.error("Failed to update registration token", error);
      return response.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
}
