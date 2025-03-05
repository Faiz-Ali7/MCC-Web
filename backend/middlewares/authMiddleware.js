const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    console.log("Received Authorization Header:", authHeader); // ✅ Debugging log

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.error("No Bearer token provided!");
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Extracted Token:", token); // ✅ Debugging log

    jwt.verify(token, "s3cR3tK3y@2024!example#", (err, user) => {
        if (err) {
            console.error("JWT Verification Failed:", err.message);
            return res.status(403).json({ error: "Forbidden: Invalid token" });
        }

        console.log("Decoded User:", user); // ✅ Log decoded token payload
        req.user = user;
        next();
    });
};

module.exports = authMiddleware;
