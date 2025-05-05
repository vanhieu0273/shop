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
        enum: ["admin", "user"],
        default: "user"
    }
},{
    timestamps: true
});

module.exports = mongoose.model("User", UserSchema);

