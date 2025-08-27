import { credential } from "firebase-admin";
import { getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import assert from "node:assert";

import logger from "@adonisjs/core/services/logger";

import Device from "#models/device";
import Subscription from "#models/subscription";

export async function notifyFavouriteMeal(mealId: number) {
  try {
    const subscriptions = await Subscription.query()
      .where("mealId", mealId)
      .preload("device");

    const validPairs = subscriptions
      .filter(
        (
          sub,
        ): sub is Subscription & {
          device: Device & { registrationToken: string };
        } => {
          return (
            typeof sub.device.registrationToken === "string" &&
            sub.device.registrationToken.trim() !== ""
          );
        },
      )
      .map((sub) => ({
        deviceId: sub.device.id,
        token: sub.device.registrationToken,
      }));

    if (validPairs.length === 0) {
      logger.info(`No registration tokens found for meal_id=${mealId}.`);
      return;
    }

    logger.info(
      `Found ${validPairs.length} subscribed device(s) for meal_id=${mealId}.`,
    );

    if (!getApps().length) {
      initializeApp({
        credential: credential.applicationDefault(),
      });
    }

    for (const { deviceId, token } of validPairs) {
      try {
        const message = {
          data: {
            mealId: mealId.toString(),
          },
          token,
        };

        getMessaging()
          .send(message)
          .then((response) => {
            logger.info("Successfully sent message:", response);
          })
          .catch((error) => {
            logger.info("Error sending message:", error);
          });

        logger.debug(`Notification sent to device ID: ${deviceId}`);
      } catch (error) {
        assert(error instanceof Error);
        logger.error(
          `Failed to notify device ID: ${deviceId} - ${error.message}`,
          error.stack,
        );
      }
    }

    logger.info(`Finished processing subscriptions for meal_id=${mealId}.`);
  } catch (error) {
    assert(error instanceof Error);
    logger.error(
      `Failed to process subscriptions for meal_id=${mealId}: ${error.message}`,
      error.stack,
    );
  }
}
