const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const session = require("express-session");
const mongosession = require("connect-mongodb-session")(session);
const {cleanUpAndValidate, jwtSign ,sendVerificationEmail,validateEmail} = require("./utils/AuthUtils")
const jwt =require("jsonwebtoken");
const bcrypt = require("bcrypt");
const userSchema = require("./models/UserSchema");
const validator = require("validator");
const isAuth = require("./middleware/isAuth");





const app = express();
const PORT = process.env.PORT;

// database connect 
mongoose.set("strictQuery",false);
mongoose.connect(process.env.MONGO_URL,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then((res)=>{
    console.log("Connect to DB successfuliy")
})
.catch((err)=>{
    console.log("failed connect",err);
})

const store = new mongosession({
    uri: process.env.MONGO_URL,
    collection:"sessions"
})

app.use(session({
    secret:"hello",
    resave: false,
    saveUninitiaiized: false,
    store: store
}));





app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static("public"));

app.get("/",(req,res)=>{
    res.render("home");
})
app.get("/register",(req,res)=>{
    res.render("register");
})
app.get("/login",(req,res)=>{
    res.render("login");
})


app.post("/register",async(req,res)=>{
    console.log(req.body);
    const{name,email,username,phonenumber,password} = req.body;
    const phoneNumber = phonenumber.toString();
    try{

        await cleanUpAndValidate({name,email,username,password,phoneNumber});
        // console.log("validate");
    }catch(err){
        return res.send({status:400,message:err})
    }

    const hashedPassword = await bcrypt.hash(password,7);
    console.log(hashedPassword);

    let user = new userSchema({
        name: name,
        username:username,
        password: hashedPassword,
        phoneNumber: phoneNumber,
        email:email,
        emailAuthenticated: false,
    });


    let userExists;
    try{
        userExists = await userSchema.findOne({email});
    }catch(err){
        return res.send({
            status: 400,
            message: "Internal error",
            error: err
        })
    }

    if(userExists){
        return res.send({
            status:400,
            message:"user already exists"
        })
    }

    const verificationToken = jwtSign(email);

    console.log("verificationTOken  : ",verificationToken);
    try{
        const userDB = await user.save();
        console.log(userDB);
        sendVerificationEmail(email,verificationToken);
        return res.send({
            status: 200,
            message:"verification mail is sent in your mail id",
            data:{
                _id: userDB._id,
                username: userDB.username,
                email:userDB.email,
            }
        })
    }
    catch(err){
        return res.send({
            status:400,
            message:"server error",
            error:err,
        })
    }

})

app.get("/verifyEmail/:id",(req,res)=>{
    const token = req.params.id;
    jwt.verify(token,"hellobuddy",async(err,verifiedJwt)=>{

        if(err) res.send(err);

        const userDb = await userSchema.findOneAndUpdate(
            {email: verifiedJwt.email}
            ,{emailAuthenticated: true}
        )

        if(userDb){
            return res.status(200).redirect("/login")

        }else{
            return res.send({
                status: 400,
                message: "invalide session link"
            })
        }
    })
    return res.status(200);
})

app.get("/forget_password",(req,res)=>{
    res.render("forgetPassword");
})
app.get("/forgetPassword/:id",(req,res)=>{
    const token = req.params.id;
    jwt.verify(token,"hellobuddy",async(err,verifiedJwt)=>{

        if(err) res.send(err);

        const userDb = await userSchema.findOneAndUpdate(
            {email: verifiedJwt.email}
            ,{emailAuthenticated: true}
        )

        if(userDb){
            return res.status(200).redirect("/profile")

        }else{
            return res.send({
                status: 400,
                message: "invalide session link"
            })
        }
    })
    return res.status(200);
})


app.post("/login",async(req,res)=>{
    // console.log(req);
    const {loginId,password} = req.body;

    if(typeof loginId !== "string" ||
    typeof password !== "string" ||
    !loginId ||
    !password){
        return res.send({
            status: 400,
            message: "Invaide data"
        })
    }

    let userDB;
    try{
        if(validator.isEmail(loginId)){
            userDB = await userSchema.findOne({email: loginId});
        }else{
           userDB = await userSchema.findOne({username: loginId}) ;
        }
        
        if(!userDB){
            return res.send({
                status: 400,
                message:"user not found"
            })
        }
        
        
        if(userDB.emailAuthenticated === false){
            return res.send({
                status: 400,
                message: "please verrify"
            })
        }
        
        const isMatch = await bcrypt.compare(password,userDB.password);
        if(!isMatch){
            return res.send({
                status: 400,
                message:"Invalide Password",
                data: req.body
            })
        }
        
        req.session.isAuth = true;
        req.session.user = {
            username: userDB.username,
            email:userDB.email,
            userId: userDB._id,
        }
        console.log("hello")
        
        res.redirect("/profile")
    }
    catch(err){
        return res.send({
            status: 400,
            message: "internal server error",
            error:err,
        })
    }
})

app.post("/forget_password",async(req,res)=>{
    console.log("hello");
    console.log(req.body);
    const{emailId}= req.body;

    try{
        await validateEmail(emailId);
    }catch(err){
        return res.send({
            status:400,
            message:err
        })
    }

    let userExists;
    try{
        userExists = await userSchema.findOne({email:emailId});
    }catch(err){
        return res.send({
            status: 400,
            message: "Internal error",
            error: err
        })
    }
    console.log(userExists)

    if(!userExists){
        return res.send({
            status:400,
            message:"user not exists"
        })
    }
    
    const verificationToken = jwtSign(emailId);
    
    console.log("verificationTOken  : ",verificationToken);
    try{
        console.log("hello")
        sendVerificationEmail(emailId,verificationToken);
        return res.send({
            status: 200,
            message:"verification mail is sent in your mail id",
            
        })
    }
    catch(err){
        return res.send({
            status:400,
            message:"server error",
            error:err,
        })
    }



})

app.get("/profile",isAuth,async(req,res)=>{
    const userId = req.session.user.userId;
    const userdata = await userSchema.findOne({_id:userId})
    console.log(userdata)

    res.render("profile",{
        a: userdata
    })
})
app.post("/profile",isAuth,(req,res)=>{
    console.log(req.session.user)
})

app.get("./newPassword",(req,res)=>{
    res.render("inputpassword")
})







app.listen(PORT,()=>{
    console.log(`My server is ${PORT}`)
})