import AutoSwagger from "adonis-autoswagger";

import router from "@adonisjs/core/services/router";

import swagger from "#config/swagger";

const MealsController = () => import("#controllers/meals_controller");
const SksUsersController = () => import("#controllers/sks_users_controller");
const InfoController = () => import("#controllers/info_controller");
const RegistrationTokensController = () =>
  import("#controllers/registration_tokens_controller");
const SubscriptionsController = () =>
  import("#controllers/subscriptions_controller");

router
  .group(() => {
    router.get("/meals", [MealsController, "index"]);
    router.get("/meals/current", [MealsController, "current"]);

    router.get("/sks-users/current", [SksUsersController, "latest"]);
    router.get("/sks-users/today", [SksUsersController, "today"]);

    router.get("/info", [InfoController, "openingHours"]);

    router.put("/device/registration-token", [
      RegistrationTokensController,
      "update",
    ]);
    router.get("/device/registration-token/:device_key", [
      RegistrationTokensController,
      "hasToken",
    ]);

    router.post("/subscriptions/toggle", [SubscriptionsController, "toggle"]);
    router.get("/subscriptions/:device_key", [
      SubscriptionsController,
      "listForDevice",
    ]);

    // returns swagger in YAML
    router.get("/swagger", async () => {
      return AutoSwagger.default.docs(router.toJSON(), swagger);
    });

    // Renders Swagger-UI and passes YAML-output of /swagger
    router.get("/docs", async () => {
      return AutoSwagger.default.ui("/api/v1/swagger", swagger);
    });

    router.get("/healthcheck", async () => {
      return "elo żelo";
    });
  })
  .prefix("/api/v1");

// Reroute some paths to docs
const redirectPaths = ["/", "/api", "/api/v1", "/api/docs", "/docs"];
redirectPaths.forEach((path) => {
  router.get(path, async ({ response }) => {
    return response.redirect("/api/v1/docs");
  });
});
