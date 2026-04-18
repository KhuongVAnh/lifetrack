const bcrypt = require("bcrypt")

exports.hashPass = async (password) => {
    try {
        const saltRounds = 10
        const password_hash = await bcrypt.hash(password, saltRounds)
        return password_hash;
    } catch (error) {
        console.log("hashpass error: ", error);
        return error;
    }
}