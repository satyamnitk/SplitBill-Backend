const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: [
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
  ],
});

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
