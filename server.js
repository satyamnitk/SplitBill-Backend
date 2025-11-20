const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDatabase = require("./database/db");
const userRoutes = require("./routes/userRoutes");

const app = express();
dotenv.config();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser());
connectDatabase();

app.use("/api/users", userRoutes);

if(process.env.MODE == "development") {
  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if(process.env.MODE == "production") {
  module.exports = app;
}
