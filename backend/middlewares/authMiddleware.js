const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, "s3cR3tK3y@2024!example#", (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Forbidden: Invalid token" });
        }

        req.user = user;
        next();
    });
};

module.exports = authMiddleware;
