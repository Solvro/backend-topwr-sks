import { DateTime } from "luxon";
import { z, null as zodNull } from "zod";

import type { HttpContext } from "@adonisjs/core/http";

import { handleError } from "#exceptions/handler";
import Device, { getTokenExpirationTime } from "#models/device";

const RegistrationTokenPayload = z.object({
  deviceKey: z.string().min(1),
  registrationToken: z.string().min(1).or(zodNull()),
});

interface RegistrationTokenInput {
  deviceKey: unknown;
  registrationToken: unknown;
}

const deviceKeySchema = z.string().min(1, "deviceKey param is required");

export default class RegistrationTokensController {
  /**
   * @hasToken
   * @summary Checks if the device has a token registered to it and if so, for how long will it be valid (in ms)
   * @responseBody 200 - {"currentToken":"string|null","validFor":"number|null"}
   * @responseBody 400 - {"error":"string"}
   */
  async hasToken({ request, response }: HttpContext) {
    try {
      const deviceKey = deviceKeySchema.parse(request.param("deviceKey"));
      const device = await Device.findByOrFail("deviceKey", deviceKey);
      if (device.registrationToken === null) {
        return response
          .status(200)
          .json({ currentToken: null, validFor: null });
      }
      const tokenTimestamp = device.tokenTimestamp?.toMillis();
      const now = Date.now();
      let validFor: number | null = null;
      if (tokenTimestamp !== undefined) {
        const expiration = getTokenExpirationTime(tokenTimestamp, now);
        if (expiration > 0) {
          validFor = expiration;
        }
      }
      return response
        .status(200)
        .json({ currentToken: device.registrationToken, validFor });
    } catch (error) {
      return handleError(error, response);
    }
  }

  /**
   * @updateOrCreate
   * @summary Register or update FCM registration token. If new token is null, removes the current token
   * @description Stores or updates the registration token for a device.
   * @requestBody {"deviceKey":"string","registrationToken":"string|null"}
   * @responseBody 200 - {"message":"string"}
   * @responseBody 400 - {"message":"string","error":"string"}
   * @responseBody 500 - {"message":"string","error":"string"}
   */
  async updateOrCreate({ request, response }: HttpContext) {
    try {
      const raw = request.body() as RegistrationTokenInput;

      const parsed = RegistrationTokenPayload.parse({
        deviceKey: raw.deviceKey,
        registrationToken: raw.registrationToken,
      });

      const { deviceKey, registrationToken } = parsed;
      const shouldRemoveToken = registrationToken === null;
      await Device.updateOrCreate(
        { deviceKey },
        {
          registrationToken,
          tokenTimestamp: shouldRemoveToken ? null : DateTime.now(),
        },
      );

      return response.status(200).json({
        message: `Token ${shouldRemoveToken ? "removed" : "updated"} successfully`,
      });
    } catch (error) {
      return handleError(error, response);
    }
  }
}
