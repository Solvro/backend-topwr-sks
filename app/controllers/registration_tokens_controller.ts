import vine from "@vinejs/vine";
import { DateTime } from "luxon";

import type { HttpContext } from "@adonisjs/core/http";

import Device, { getTokenExpirationTime } from "#models/device";

const RegistrationTokenPayload = vine.compile(
  vine.object({
    deviceKey: vine.string().minLength(1),
    registrationToken: vine.string().minLength(1).optional().nullable(),
  }),
);

const deviceKeyValidator = vine.compile(vine.string().minLength(1));

export default class RegistrationTokensController {
  /**
   * @hasToken
   * @summary Checks if the device has a token registered to it and if so, for how long will it be valid (in ms)
   * @responseBody 200 - {"currentToken":"string|null","validFor":"number|null"}
   * @responseBody 400 - {"error":"string"}
   */
  async hasToken({ request, response }: HttpContext) {
    const deviceKey = await deviceKeyValidator.validate(
      request.param("deviceKey"),
    );
    const device = await Device.findByOrFail(
      "deviceKey",
      deviceKey,
    ).addErrorContext({
      message: `Device with deviceKey ${deviceKey} not found`,
      status: 404,
      code: "E_NOT_FOUND",
    });
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
    const parsed = await request.validateUsing(RegistrationTokenPayload);

    const { deviceKey, registrationToken } = parsed;

    const shouldRemoveToken = registrationToken === null;

    await Device.updateOrCreate(
      { deviceKey },
      {
        registrationToken,
        tokenTimestamp: shouldRemoveToken ? null : DateTime.now(),
      },
    ).addErrorContext(
      () =>
        `Failed to ${shouldRemoveToken ? "remove" : "update"} token for device ${deviceKey}`,
    );

    return response.status(200).json({
      message: `Token ${shouldRemoveToken ? "removed" : "updated"} successfully`,
    });
  }
}
