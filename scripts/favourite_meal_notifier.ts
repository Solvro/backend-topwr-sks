import { toIBaseError } from "@solvro/error-handling/base";
import {
  analyzeErrorStack,
  prepareReportForLogging,
} from "@solvro/error-handling/reporting";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import logger from "@adonisjs/core/services/logger";
import type { TransactionClientContract } from "@adonisjs/lucid/types/database";

import Device, { TOKEN_EXPIRATION_TIME_MS } from "#models/device";
import Meal from "#models/meal";

interface FBMessage {
  token: string;
  notification: {
    title: string;
    body: string;
  };
  data: {
    mealId: string;
    route: string;
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

export async function notifyFavouriteMeal(
  mealId: number,
  mealName: string,
  trx: TransactionClientContract,
) {
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
    await trx.rawQuery(
      "UPDATE devices d SET registration_token = NULL, token_timestamp = NULL " +
        "FROM subscriptions s WHERE d.device_key = s.device_key " +
        "AND s.meal_id = ? " +
        "AND d.registration_token IS NOT NULL " +
        "AND d.token_timestamp IS NOT NULL " +
        "AND (EXTRACT(EPOCH FROM NOW()) - EXTRACT(EPOCH FROM d.token_timestamp)) * 1000 > ?;",
      [mealId, TOKEN_EXPIRATION_TIME_MS],
    );
    // Fetch valid tokens
    const queryRes: {
      rows: { device_key: string; registration_token: string }[];
    } = await trx.rawQuery(
      "SELECT d.device_key, d.registration_token FROM devices d " +
        "JOIN subscriptions s ON d.device_key = s.device_key " +
        "WHERE s.meal_id = ? " +
        "AND d.registration_token IS NOT NULL;",
      [mealId],
    );
    validTokens = queryRes.rows;
  } catch (error) {
    logger.error(
      "Failed to initialize database. Exiting early. Error: ",
      error,
    );
    throw error;
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
        notification: {
          title: "Twoje ulubione danie jest dostępne!",
          body: mealName,
        },
        data: {
          mealId: mealIdString,
          route: "https://topwr.solvro.pl/sks-menu",
        },
      },
    };
  });

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
    throw error;
  }

  //Notify
  const { tokensToDelete, tokensToRefresh, successCount } =
    await firebaseNotify(validMessages);

  logger.info(
    `Succesfully sent ${successCount} notifications to subscribed devices`,
  );

  await updateTokenState(tokensToDelete, tokensToRefresh, trx);
}

async function firebaseNotify(validMessages: FBDebugMessage[]) {
  const messagingService = getMessaging();

  // Active tokens
  const tokensToRefresh = new Set<string>();
  // Expired/Invalid tokens
  const tokensToDelete = new Set<string>();

  let successCount = 0;

  const messages = validMessages.map((message) => message.message);

  const batchResponse = await messagingService.sendEach(messages);

  batchResponse.responses.forEach((response, index) => {
    const deviceKey = validMessages[index].deviceKey;

    if (response.success) {
      tokensToRefresh.add(deviceKey);
      successCount++;
    } else {
      const fbError = response.error as { code: string; message: string };
      if (fbError.code === "messaging/registration-token-not-registered") {
        // Token was not expired in our DB but FB deemed it expired
        logger.debug(
          `Device ${deviceKey}: Failure - Token expired or not registered in FB`,
        );
        tokensToDelete.add(deviceKey);
      } else if (fbError.code === "messaging/invalid-argument") {
        // Token is not valid because it is simply not - not due to expiry
        logger.debug(`Device ${deviceKey}: Failure - Token is not valid`);
        tokensToDelete.add(deviceKey);
      } else {
        // Error not related to the token itself
        logger.warn(
          `Device ${deviceKey}: Failure - unknown error ${fbError.code}. Error: ${fbError.message}`,
        );
      }
    }
  });

  return { tokensToDelete, tokensToRefresh, successCount };
}

async function updateTokenState(
  tokensToDelete: Set<string>,
  tokensToRefresh: Set<string>,
  trx: TransactionClientContract,
) {
  logger.info("Updating token state in the database...");
  try {
    if (tokensToRefresh.size > 0) {
      await Device.updateTokenTimestamps([...tokensToRefresh], trx);
      logger.info(`Refreshed ${tokensToRefresh.size} tokens`);
    }
    if (tokensToDelete.size > 0) {
      await Device.removeTokens([...tokensToDelete], trx);
      logger.info(`Removed invalid ${tokensToDelete.size} tokens`);
    }
  } catch (error) {
    const report = analyzeErrorStack(toIBaseError(error));
    logger.error(
      `Failed to update token state in database: ${prepareReportForLogging(report)}`,
    );
    throw error;
  }
}
