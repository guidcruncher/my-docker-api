import { createRouter, createWebHistory } from "vue-router"

import ComposeView from "../views/ComposeView.vue"
import HomeView from "../views/HomeView.vue"

const routes = [
  { path: "/", component: HomeView },
  { path: "/compose", component: ComposeView },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
