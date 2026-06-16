import "./assets/tailwind.css"

import { createApp } from "vue"

import App from "./App.vue"
import { router } from "./routes/index.ts"

const app = createApp(App)
app.use(router)
app.mount("#app")
