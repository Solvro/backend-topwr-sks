import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import logger from "@adonisjs/core/services/logger";

import Device, { getTokenExpirationTime } from "#models/device";
import Meal from "#models/meal";

interface FBMessage {
  token: string;
  data: {
    mealId: string;
  };
}

interface FBDebugMessage {
  message: FBMessage;
  deviceKey: string;
}

export async function notifyFavouriteMeal(mealId: number) {
  logger.info(`Processing subscriptions for meal_id=${mealId}...`);
  // Initialize
  let targetMeal;
  try {
    // Boot the database
    if (!Device.booted) {
      Device.boot();
    }
    Device.$relationsDefinitions.forEach((relation) => {
      if (relation.relatedModel() === Device && !relation.booted) {
        relation.boot();
      }
    });
    // Query subscriptions for the meal
    targetMeal = await Meal.query()
      .where("id", mealId)
      .preload("devices")
      .firstOrFail();
  } catch (error) {
    logger.error(
      "Failed to initialize database. Exiting early. Error: ",
      error,
    );
    return;
  }
  // Active tokens
  const tokensToRefresh = new Set<string>();
  // Expired/Invalid tokens
  const tokensToDelete = new Set<string>();
  // Prepare valid messages
  const mealIdString = mealId.toString();
  const now = Date.now();
  const validMessages: FBDebugMessage[] = targetMeal.devices
    .filter((sub) => {
      if (sub.registrationToken === null) {
        // No token - skip
        return false;
      }
      const tokenTimestamp = sub.tokenTimestamp?.toMillis();
      if (
        tokenTimestamp !== undefined &&
        getTokenExpirationTime(tokenTimestamp, now) <= 0
      ) {
        // Expired token
        tokensToDelete.add(sub.deviceKey);
        return false;
      }
      // Token is not expired or we don't know about the expiry
      return true;
    })
    .map((sub): FBDebugMessage => {
      tokensToRefresh.add(sub.deviceKey);
      return {
        deviceKey: sub.deviceKey,
        message: {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          token: sub.registrationToken!,
          data: {
            mealId: mealIdString,
          },
        },
      };
    });

  if (validMessages.length === 0) {
    logger.info("No registration tokens found. Exiting early.");
    return;
  }
  logger.info(`Found ${validMessages.length} subscribed device(s)`);
  // Init FB
  try {
    if (!getApps().length) {
      initializeApp({
        credential: applicationDefault(),
      });
      logger.info("Firebase app initialized.");
    }
  } catch (error) {
    logger.error(
      "Failed to initialize Firebase app. Exiting early. Error: ",
      error,
    );
    return;
  }
  const messagingService = getMessaging();
  let successCount = 0;

  for (const message of validMessages) {
    try {
      await messagingService.send(message.message);
      logger.debug(`Device ${message.deviceKey}: Success`);
      successCount++;
    } catch (error) {
      const fbError = error as { code: string; message: string };
      if (fbError.code === "messaging/registration-token-not-registered") {
        // Token was not expired in our DB but FB deemed it expired
        logger.debug(
          `Device ${message.deviceKey}: Failure - Token expired or not registered in FB`,
        );
        tokensToDelete.add(message.deviceKey);
        tokensToRefresh.delete(message.deviceKey);
      } else if (fbError.code === "messaging/invalid-argument") {
        // Token is not valid because it is simply not - not due to expiry
        logger.debug(
          `Device ${message.deviceKey}: Failure - Token is not valid`,
        );
        tokensToDelete.add(message.deviceKey);
        tokensToRefresh.delete(message.deviceKey);
      } else {
        // Error not related to the token itself
        logger.warn(
          `Device ${message.deviceKey}: Failure - unknown error ${fbError.code}. Error: ${fbError.message}`,
        );
      }
    }
  }
  logger.info(
    `Successfully sent ${successCount} out of possible ${validMessages.length} messages.`,
  );
  await updateTokenState(tokensToDelete, tokensToRefresh);
}

async function updateTokenState(
  tokensToDelete: Set<string>,
  tokensToRefresh: Set<string>,
) {
  logger.info("Updating token state in the database...");
  if (tokensToRefresh.size > 0) {
    try {
      await Device.updateTokenTimestamps([...tokensToRefresh]);
      logger.info(`Refreshed ${tokensToRefresh.size} tokens`);
    } catch (error) {
      logger.warn(`Failed to refresh tokens: `, error);
    }
  }
  if (tokensToDelete.size > 0) {
    try {
      await Device.removeTokens([...tokensToDelete]);
      logger.info(`Removed invalid ${tokensToDelete.size} tokens`);
    } catch (error) {
      logger.warn(`Failed to remove tokens: `, error);
    }
  }
}
