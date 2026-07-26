import { readCloudSession } from '~/shared/cloud/session'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server || to.path !== '/game') return
  if (!readCloudSession(localStorage)) return navigateTo('/')
})
