const mongoose = require("mongoose");
const { boolean } = require("webidl-conversions");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name:{
        type:String,
        required: true,
    },
    username:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
        unique:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    phoneNumber:{
        type:String,
        required:true,
    },
    emailAuthenticated:{
        type:Boolean,
        required: true,
    },
    picture: String,
    country: String,
    college: String,
    state: String
})

module.exports = mongoose.model("user",UserSchema);