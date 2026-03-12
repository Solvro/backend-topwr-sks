import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import type { FirebaseAppError } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

import { BaseCommand, args, flags } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

export default class PushTest extends BaseCommand {
  static commandName = "push:test";
  static description =
    "Send a test FCM push notification directly to a specific device token";

  static options: CommandOptions = {
    startApp: true,
  };

  @args.string({
    argumentName: "token",
    description: "FCM device token to send the notification to",
  })
  declare token: string;

  @flags.string({
    flagName: "title",
    description: "Notification title",
    default: "Test notification",
  })
  declare title: string;

  @flags.string({
    flagName: "body",
    description: "Notification body",
    default: "Push notification test from ACE",
  })
  declare body: string;

  async run() {
    try {
      if (getApps().length === 0) {
        initializeApp({ credential: applicationDefault() });
        this.logger.info("Firebase app initialized.");
      }
    } catch (error) {
      this.logger.error(
        `Failed to initialize Firebase: ${(error as FirebaseAppError).message}`,
      );
      this.exitCode = 1;
      return;
    }

    this.logger.info(
      `Sending test notification to token: ${this.token.substring(0, 20)}...`,
    );
    this.logger.info(`Title: "${this.title}"`);
    this.logger.info(`Body:  "${this.body}"`);

    try {
      const messageId = await getMessaging().send({
        token: this.token,
        notification: {
          title: this.title,
          body: this.body,
        },
      });
      this.logger.success(
        `Notification sent successfully. Message ID: ${messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification: ${(error as Error).message}`,
      );
      this.exitCode = 1;
    }
  }
}
