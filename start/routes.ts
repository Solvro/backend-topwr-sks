import router from '@adonisjs/core/services/router'

const MealsController = () => import('#controllers/meals_controller')
const SksUsersController = () => import('#controllers/sks_users_controller')

router
  .group(() => {
    router.get('/meals', [MealsController, 'index'])
    router.get('/meals/history', [MealsController, 'history'])
    router.get('/sks-users/current', [SksUsersController, 'latest'])
    router.get('/sks-users/today', [SksUsersController, 'today'])
  })
  .prefix('/api/v1')
