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
    router
      .group(() => {
        router.get("/", [MealsController, "index"]);
        router.get("/recent", [MealsController, "recent"]);
        router.get("/current", [MealsController, "current"]);
      })
      .prefix("/meals");

    router
      .group(() => {
        router.get("/current", [SksUsersController, "latest"]);
        router.get("/today", [SksUsersController, "today"]);
      })
      .prefix("/sks-users");

    router.get("/info", [InfoController, "openingHours"]);

    router
      .group(() => {
        router.put("/", [RegistrationTokensController, "updateOrCreate"]);
        router.get("/:deviceKey", [RegistrationTokensController, "hasToken"]);
      })
      .prefix("/device/registration-token");

    router
      .group(() => {
        router.post("/toggle", [SubscriptionsController, "toggle"]);
        router.get("/:deviceKey", [SubscriptionsController, "listForDevice"]);
      })
      .prefix("/subscriptions");

    // returns swagger in YAML
    router.get("/swagger", () => {
      return AutoSwagger.default.docs(router.toJSON(), swagger);
    });

    // Renders Swagger-UI and passes YAML-output of /swagger
    router.get("/docs", () => {
      return AutoSwagger.default.ui("/api/v1/swagger", swagger);
    });

    router.get("/healthcheck", () => {
      return "elo żelo";
    });
  })
  .prefix("/api/v1");

router.get("/metrics", [
  () => import("@solvro/solvronis-metrics"),
  "emitMetrics",
]);

// Reroute some paths to docs
const redirectPaths = ["/", "/api", "/api/v1", "/api/docs", "/docs"];
redirectPaths.forEach((path) => {
  router.on(path).redirectToPath("/api/v1/docs");
});

router.get("/health", () => {
  return { elo: "żelo" };
});
