var mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    userName:{
        type: String,
        required: true,
        min: 10
    },
    email: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["admin", "manager", "user"],
        default: "user"
    },
    resetOTP: {
        type: String,
        default: null
    },
    otpExpires: {
        type: Date,
        default: null
    }
},{
    timestamps: true
});

module.exports = mongoose.model("User", UserSchema);

