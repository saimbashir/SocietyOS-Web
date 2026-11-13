import { app } from "./app.js";
import { local } from "./config/db.js";
import { migrate } from "./migrate.js";
import { seed } from "./seed.js";
if (local) await migrate();
await seed();
const port = Number(process.env.PORT || 4000);
app.listen(
  port,
  process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
  () => console.log("SocietyOS API: http://localhost:" + port),
);
