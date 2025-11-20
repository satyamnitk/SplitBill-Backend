const mongoose = require("mongoose");

const jwtSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  tokens: [
    {
      token: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const JWT = mongoose.model("JWT", jwtSchema);

module.exports = JWT;
