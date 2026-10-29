require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");
const seedAdmin = require("./src/utils/seedAdmin");

const cron = require("node-cron");
const backupMongoDB = require("./src/utils/backup");
const PORT = process.env.PORT;
// Auto Backup Every 1 Hour (Disabled in local dev unless ENABLE_BACKUP=true)
if (process.env.NODE_ENV === "production" || process.env.ENABLE_BACKUP === "true") {
  cron.schedule("0 * * * *", () => {
    console.log("Running hourly MongoDB backup...");
    backupMongoDB();
  });
}
// Allow app to start even if DB fails
connectDB()
  .then(() => {
    console.log("MongoDB Connected");
    seedAdmin();
  })
  .catch((err) => {
    console.error("DB Failed:", err.message);
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
