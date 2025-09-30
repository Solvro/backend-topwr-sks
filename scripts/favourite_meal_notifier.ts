import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import logger from "@adonisjs/core/services/logger";
import db from "@adonisjs/lucid/services/db";

import Device, { TOKEN_EXPIRATION_TIME_MS } from "#models/device";
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

interface FetchValidTokensQueryReturnValue {
  device_key: string;
  registration_token: string;
}

export async function notifyFavouriteMeal(mealId: number) {
  logger.info(`Processing subscriptions for meal_id=${mealId}...`);
  // Initialize
  let validTokens: FetchValidTokensQueryReturnValue[] = [];
  try {
    // Boot the database
    if (!Device.booted) {
      Device.boot();
    }
    if (!Meal.booted) {
      Meal.boot();
    }
    Device.$relationsDefinitions.forEach((relation) => {
      if (relation.relatedModel() === Device && !relation.booted) {
        relation.boot();
      }
    });
    // Expire old tokens
    await db.rawQuery(
      "UPDATE devices d SET registration_token = NULL, token_timestamp = NULL " +
        "FROM subscriptions s WHERE d.device_key = s.device_key " +
        "AND s.meal_id = ? " +
        "AND d.registration_token IS NOT NULL " +
        "AND d.token_timestamp IS NOT NULL " +
        "AND (EXTRACT(EPOCH FROM NOW()) - EXTRACT(EPOCH FROM d.token_timestamp)) * 1000 > ?;",
      [mealId, TOKEN_EXPIRATION_TIME_MS],
      { mode: "write" },
    );
    // Fetch valid tokens
    const queryRes: {
      rows: { device_key: string; registration_token: string }[];
    } = await db.rawQuery(
      "SELECT d.device_key, d.registration_token FROM devices d " +
        "JOIN subscriptions s ON d.device_key = s.device_key " +
        "WHERE s.meal_id = ? " +
        "AND d.registration_token IS NOT NULL;",
      [mealId],
      { mode: "read" },
    );
    validTokens = queryRes.rows;
  } catch (error) {
    logger.error(
      "Failed to initialize database. Exiting early. Error: ",
      error,
    );
    return;
  }
  if (validTokens.length === 0) {
    logger.info("No registration tokens found. Exiting early.");
    return;
  }
  logger.info(`Found ${validTokens.length} subscribed device(s)`);
  // Map tokens to messages
  const mealIdString = mealId.toString();
  const validMessages: FBDebugMessage[] = validTokens.map((token) => {
    return {
      deviceKey: token.device_key,
      message: {
        token: token.registration_token,
        data: {
          mealId: mealIdString,
        },
      },
    };
  });
  // Active tokens
  const tokensToRefresh = new Set<string>();
  // Expired/Invalid tokens
  const tokensToDelete = new Set<string>();
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
      tokensToRefresh.add(message.deviceKey); // Token state was refresh in FB, so it should be refreshed on our end
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
      } else if (fbError.code === "messaging/invalid-argument") {
        // Token is not valid because it is simply not - not due to expiry
        logger.debug(
          `Device ${message.deviceKey}: Failure - Token is not valid`,
        );
        tokensToDelete.add(message.deviceKey);
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
