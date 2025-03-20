const bcrypt = require('bcryptjs');

exports.hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

exports.comparePasswords = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};
