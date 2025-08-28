import { credential } from "firebase-admin";
import { getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import assert from "node:assert";

import logger from "@adonisjs/core/services/logger";

import Device, { getTokenExpirationTime } from "#models/device";
import Subscription from "#models/subscription";

type SubscriptionWithDevice = Subscription & {
  device: Device;
};

interface FBMessage {
  token: string;
  data: {
    mealId: string;
  };
}

interface FBDebugMessage {
  message: FBMessage;
  deviceId: number;
}

export async function notifyFavouriteMeal(mealId: number) {
  try {
    // Boot the database
    if (!Subscription.booted) {
      Subscription.boot();
    }
    if (!Device.booted) {
      Device.boot();
    }
    Subscription.$relationsDefinitions.forEach((relation) => {
      if (relation.relatedModel() === Device && !relation.booted) {
        relation.boot();
      }
    });
    // Active tokens
    const tokenTimestampsToRefresh = new Set<number>();
    // Expired tokens
    const tokenTimestampsToDelete = new Set<number>();
    // Query subscriptions for the meal
    const subscriptions = (await Subscription.query()
      .where("mealId", mealId)
      .preload("device")) as SubscriptionWithDevice[];
    const mealIdString = mealId.toString();
    // Prepare valid messages
    const now = Date.now();
    const validMessages: FBDebugMessage[] = subscriptions
      .filter((sub) => {
        if (sub.device.registrationToken !== null) {
          return true;
        }
        const tokenTimestamp = sub.device.tokenTimestamp?.toMillis();
        if (
          tokenTimestamp !== undefined &&
          getTokenExpirationTime(tokenTimestamp, now) <= 0
        ) {
          // Token has expired
          tokenTimestampsToDelete.add(sub.device.id);
          return false;
        }
        // Token is not expired or we don't know about the expiry - let FB handle it
        return true;
      })
      .map((sub): FBDebugMessage => {
        tokenTimestampsToRefresh.add(sub.device.id);
        return {
          deviceId: sub.device.id,
          message: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            token: sub.device.registrationToken!,
            data: {
              mealId: mealIdString,
            },
          },
        };
      });

    if (validMessages.length === 0) {
      logger.info(`No registration tokens found for meal_id=${mealId}.`);
      return;
    }

    logger.info(
      `Found ${validMessages.length} subscribed device(s) for meal_id=${mealId}.`,
    );
    // Init FB
    if (!getApps().length) {
      initializeApp({
        credential: credential.applicationDefault(),
      });
    }
    validMessages.forEach((message) => {
      try {
        getMessaging()
          .send(message.message)
          .then((response) => {
            logger.info("Successfully sent message:", response);
          })
          .catch((error) => {
            logger.info("Error sending message:", error);
            const fbError = error as { errorCode: string };
            if (
              fbError.errorCode ===
              "messaging/registration-token-not-registered"
            ) {
              logger.info(
                "Device token expired or not registered anymore - will remove from the database.",
              );
              // Token was not expired in our DB but FB deemed it invalid
              tokenTimestampsToDelete.add(message.deviceId);
              tokenTimestampsToRefresh.delete(message.deviceId);
            }
          });
        logger.debug(`Notification sent to device ID: ${message.deviceId}`);
      } catch (error) {
        assert(error instanceof Error);
        logger.error(
          `Failed to notify device ID: ${message.deviceId} - ${error.message}`,
          error.stack,
        );
      }
    });
    logger.info(`Finished processing subscriptions for meal_id=${mealId}.`);
    // Update token timestamps
    logger.info("Updating token state in the database...");
    await Device.refreshTokenTimestamps([...tokenTimestampsToRefresh]);
    logger.info(`Refreshed ${tokenTimestampsToRefresh.size} tokens`);
    await Device.removeTokens([...tokenTimestampsToDelete]);
    logger.info(`Removed invalid ${tokenTimestampsToDelete.size} tokens`);
  } catch (error) {
    assert(error instanceof Error);
    logger.error(
      `Failed to process subscriptions for meal_id=${mealId}: ${error.message}`,
      error.stack,
    );
  }
}
