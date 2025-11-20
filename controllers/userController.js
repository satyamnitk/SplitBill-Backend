const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/userModel");
const Otp = require("../models/otpModel");
const JWT = require("../models/jwtModel");
const AddExpense = require("../models/addExpenseModel");
const Group = require("../models/groupModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const convertDate = (date) => {
  const utcDate = new Date(date);
  const indianDate = utcDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return indianDate;
};

const getUsers = async (req, res) => {};

const sendOTP = async (req, res) => {
  const { email } = req.body;

  const otp = generateOTP();

  try {
    await Otp.updateOne(
      { email },
      { $push: { otps: { code: otp } } },
      { upsert: true }
    );

    const mailOptions = {
      from: "satyamanand180@gmail.com",
      to: email,
      subject: "🔐 Your One-Time Password (OTP) for Secure Verification",
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <p>Dear User,</p>
      <p>Your OTP for verification is:</p>
      <h2 style="color: #4CAF50; background-color: #f2f2f2; padding: 10px; display: inline-block; border-radius: 5px;">${otp}</h2>
      <p>Please note that this OTP is valid for only <strong style="color: #FF0000;">5 minutes</strong>. Use it quickly to complete your verification process.</p>
      <p>Thank you for using our service!</p>
      <p>Best Regards,<br>SplitBill</p>
    </div>
  `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord) {
      return res
        .status(404)
        .json({ message: "OTP record not found for the email" });
    }

    await Otp.updateOne(
      { email },
      {
        $pull: {
          otps: { createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } },
        },
      }
    );

    const matchedOTP = await Otp.findOne({
      email,
      "otps.code": otp,
    });
    if (!matchedOTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const mailOptions = {
      from: "satyamanand180@gmail.com",
      to: email,
      subject: "✅ OTP Verification Successful - Proceed to Account Creation",
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <p>Dear User,</p>
      <p>We are pleased to inform you that your OTP verification was successful!</p>
      <p>You can now create your account to use our services.</p>
      <p>If you have any questions or need further assistance, please do not hesitate to contact our support team.</p>
      <p>Thank you for verifying your account!</p>
      <p>Best Regards,<br>SplitBill</p>
      <hr>
      <p style="font-size: 0.9em; color: #888;">If you did not attempt to verify your account, please contact our support team immediately at support@splitbill.com.</p>
    </div>
  `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP" });
  }
};

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashPassword,
    });

    await Group.updateMany(
      {
        "members.email": email,
        "members.userId": null,
      },
      {
        $set: {
          "members.$[elem].userId": newUser._id,
          "members.$[elem].name": newUser.name, 
        },
      },
      {
        arrayFilters: [
          { "elem.email": email, "elem.userId": null },
        ],
      }
    );

    const mailOptions = {
      from: "satyamanand180@gmail.com",
      to: email,
      subject: "🎉 Account Created - Welcome to SplitBill!",
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hi ${name},</p>
        <p>Your SplitBill account has been successfully created!</p>
        <p>You can now log in and manage your expense groups.</p>
        <br/>
        <p>Best Regards,<br>SplitBill Team</p>
      </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    await JWT.updateOne(
      { email },
      {
        $pull: {
          tokens: { createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } },
        },
      }
    );

    await JWT.updateOne(
      { email },
      { $push: { tokens: { token } } },
      { upsert: true }
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      maxAge: 3600000,
      secure: true,
    });

    return res.status(200).json({ message: "User login successful.", user });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

const forgotPasswordUser = async (req, res) => {
  const { email, newPassword } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const hashPassword = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { email },
      { $set: { password: hashPassword } }
    );

    return res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

const checkAuth = async (req, res) => {
  const token = req.cookies.jwt;
  if (!token) {
    return res.status(401).json({
      isAuthenticated: false,
      message: "No token found, authentication required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).json({
        isAuthenticated: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      isAuthenticated: true,
      message: "User authenticated",
      user,
    });
  } catch (error) {
    res.status(401).json({
      isAuthenticated: false,
      message: "Invalid or expired token",
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    res.clearCookie("jwt");
    res.status(200).json({ message: "Logout successfully" });
  } catch (error) {
    res.status(500).json({ message: "Unable to logout" });
  }
};

const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const deletedDocument = await User.findByIdAndDelete(userId);
    if (!deletedDocument) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const createGroup = async (req, res) => {
  const { groupName, createdBy, members } = req.body;

  if (!groupName || !createdBy || !Array.isArray(members) || members.length === 0) {
    return res
      .status(400)
      .json({ message: "groupName, createdBy and members are required." });
  }

  try {
    const populatedMembers = await Promise.all(
      members.map(async (member) => {
        const { name, email } = member || {};

        if (!name || !email) {
          throw new Error("Each member must include name and email.");
        }

        const user = await User.findOne({ email });

        return {
          name,
          email,
          userId: user ? user._id : null,
        };
      })
    );

    const newGroup = await Group.create({
      groupName,
      createdBy,
      members: populatedMembers,
    });

    res.status(201).json({
      message: "Group created successfully",
      group: newGroup,
    });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const sendInvite = async (req, res) => {
  const { email, name, inviterId, groupName } = req.body;
  

  if (!email || !name || !inviterId || !groupName) {
    return res.status(400).json({
      message: "email, name, inviterId and groupName are required.",
    });
  }

  try {
    const inviter = await User.findById(inviterId);
    
    if (!inviter) {
      return res.status(404).json({ message: "Inviter not found." });
    }

    const registerUrl = "http://localhost:3000/users/register";

    const mailOptions = {
      from: "satyamanand180@gmail.com",
      to: email,
      subject: `You're invited to join ${groupName} on SplitBill!`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #333; padding: 20px;">
        <h2 style="font-weight: 600; margin-bottom: 10px;">You're Invited to SplitBill 🎉</h2>
        <p>Hi ${name},</p>
        <p><strong>${inviter.name}</strong> has invited you to join the group <strong>${groupName}</strong> on SplitBill!</p>
        <p>
          SplitBill helps you easily track shared expenses, settle balances, and stay organized with friends and groups.
        </p>
        <p style="margin-top: 18px;">
          To access the group and unlock transaction features, create your account below:
        </p>
        <a href="${registerUrl}"
          style="display: inline-block; background: #4a6cf7; color: #fff; padding: 12px 22px; border-radius: 8px; 
          margin: 18px 0; text-decoration: none; font-weight: 600;">
          Create Account
        </a>
        <p>If you already have an account, you can ignore this email.</p>
        <br/>
        <p style="font-size: 12px; color: #777; margin-top: 40px;">
          This email was sent because someone added you to their group on SplitBill.
        </p>
      </div>
      `,
    };

    // console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS);
    
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message: "Invitation email sent successfully",
    });
  } catch (error) {
    console.error("Error sending invite:", error);
    return res.status(500).json({
      message: "Error sending invite email.",
    });
  }
};

const findUser = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "Friend found successfully.",
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};

const groups = async (req, res) => {
  const { _id, email } = req.body; 

  try {
    const userGroups = await Group.find({
      $or: [
        { "members.userId": _id },
        { "members.email": email },
      ],
    })
      .populate("createdBy", "name email")
      .populate("members.userId", "name email");

    const result = userGroups.map((group) => ({
      _id: group._id,
      groupName: group.groupName,
      createdBy: group.createdBy,
      members: group.members.map((member) => ({
        _id: member._id,
        userId: member.userId ? member.userId._id : null,
        name: member.userId ? member.userId.name : member.name,
        email: member.userId ? member.userId.email : member.email,
      })),
    }));

    res.status(200).json({
      message: "Groups found successfully.",
      groups: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};

const addExpense = async (req, res) => {
  const { groupId, paidBy, total, splits } = req.body;
  console.log(req.body);
  

  try {
    const newExpense = await AddExpense.create({
      groupId,
      paidBy,
      total,
      splits,
    });

    res.status(201).json({
      message: "Expense added successfully.",
      expense: newExpense,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};

const viewExpense = async (req, res) => {
  const { groupId } = req.body;

  try {
    const expenses = await AddExpense.find({ groupId })
      .populate("groupId", "groupName")
      .populate("paidBy", "name email")
      .populate("splits.userId", "name email")
      .sort({ createdAt: -1 });

    const result = expenses.map((expense) => ({
      _id: expense._id,
      groupId: expense.groupId,
      paidBy: expense.paidBy,
      total: expense.total,
      splits: expense.splits.map((split) => ({
        _id: split._id,
        userId: split.userId._id,
        name: split.userId.name,
        email: split.userId.email,
        bill: split.bill,
      })),
      createdAt: convertDate(expense.createdAt),
    }));

    res.status(200).json({
      message: "Expenses found successfully.",
      expenses: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};

const notifyFriends = async (req, res) => {
  const { userName, userTotals } = req.body;

  try {
    const emailPromises = userTotals
      .filter((obj) => obj.bill !== 0)
      .map((obj) => {
        let message;

        if (obj.bill > 0) {
          message = `
            <p>You have a new bill of <span style="font-weight: bold;">₹${obj.bill}</span> from ${userName}.</p>
          `;
        } else {
          message = `
            <p>You need to collect <span style="font-weight: bold;">₹${Math.abs(
              obj.bill
            )}</span> from ${userName}.</p>
          `;
        }

        const mailOptions = {
          from: "satyamanand180@gmail.com",
          to: obj.email,
          subject: `💸 Bill Notification from ${userName}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2>Hello ${obj.name},</h2>
              ${message}
              <p>Best regards,<br>SplitBill</p>
              <hr>
              <p style="font-size: 0.9em; color: #888;">
                If you have any questions or need further assistance, please contact our support team at support@splitbill.com.
              </p>
            </div>
          `,
        };

        return transporter.sendMail(mailOptions);
      });

    await Promise.all(emailPromises);

    res.status(200).json({ message: "Emails sent successfully." });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while sending emails." });
  }
};

module.exports = {
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
};
