const jwtUtils = require('../utils/jwtUtils');

exports.authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const result = jwtUtils.verifyToken(token);

    if (!result.valid) {
        return res.status(401).json({ 
            error: result.expired ? 'Token expired' : 'Invalid token' 
        });
    }

    req.user = result.decoded;
    next();
};

exports.authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient Privileges' });
        }
        next();
    };
};
