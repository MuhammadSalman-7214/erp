const jwt = require("jsonwebtoken");

require("dotenv").config();

const generateToken = async (user, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error(
        "Secret key is not defined in the environment variables.",
      );
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" },
    );
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: isProduction ? "None" : "Lax",
      secure: isProduction,
      path: "/",
    });
    return token;
  } catch (error) {
    console.error("Error generating token:", error.message);
    throw new Error("Failed to generate token");
  }
};

module.exports = generateToken;
