import AutoSwagger from "adonis-autoswagger";

import router from "@adonisjs/core/services/router";

import swagger from "#config/swagger";

const MealsController = () => import("#controllers/meals_controller");
const SksUsersController = () => import("#controllers/sks_users_controller");

router
  .group(() => {
    router.get("/meals", [MealsController, "index"]);
    router.get("/meals/current", [MealsController, "current"]);
    router.get("/sks-users/current", [SksUsersController, "latest"]);
    router.get("/sks-users/today", [SksUsersController, "today"]);

    // returns swagger in YAML
    router.get("/swagger", async () => {
      return AutoSwagger.default.docs(router.toJSON(), swagger);
    });

    // Renders Swagger-UI and passes YAML-output of /swagger
    router.get("/docs", async () => {
      return AutoSwagger.default.ui("/api/v1/swagger", swagger);
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
