import router from '@adonisjs/core/services/router'
const MealsController = () => import('#controllers/meals_controller')

router
  .group(() => {
    router.get('/meals', [MealsController, 'index'])
  })
  .prefix('/api/v1')
