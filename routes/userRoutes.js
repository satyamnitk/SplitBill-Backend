const express = require("express");
const router = express.Router();
const {
  getUsers,
  sendOTP,
  verifyOTP,
  registerUser,
  loginUser,
  forgotPasswordUser,
  checkAuth,
  logoutUser,
  deleteUser,
  createGroup,
  sendInvite,
  findUser,
  groups,
  addExpense,
  viewExpense,
  notifyFriends,
} = require("../controllers/userController");

router.route("/").get(getUsers);
router.route("/send-otp").post(sendOTP);
router.route("/verify-otp").post(verifyOTP);
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/forgot-password").post(forgotPasswordUser);
router.route("/check-auth").get(checkAuth);
router.route("/logout").get(logoutUser);
router.route("/delete/:id").delete(deleteUser);
router.route("/create-group").post(createGroup);
router.route("/send-invite").post(sendInvite);
router.route("/find-user").post(findUser);
router.route("/groups").post(groups);
router.route("/groups/add-expense").post(addExpense);
router.route("/groups/view-expense").post(viewExpense);
router.route("/groups/notify-friends").post(notifyFriends);

module.exports = router;
