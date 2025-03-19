const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const ejs = require('ejs')
const path = require('path')
const mongoose = require('mongoose')
const session = require('express-session')
const coockieParser = require('cookie-parser')
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Database connection
const url = 'mongodb://localhost/hack36';
mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true});
const connection = mongoose.connection;
connection.once('open', ()=>{
    console.log("Data base connected...");
})

app.use(express.json())
app.use(express.urlencoded({extended:true}))

// Session config
app.use(session({
    secret: "This is the seecretpkjdlknflishoithoe ",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hour
}))

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '/views'))
app.use(express.static(path.join(__dirname, '/public/')))

// Using Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
    user: 'rokda.money.manager@gmail.com',
    pass: 'jkoggojtylmljvvw'
    }
});

// const mailOptions = {
//     from: 'rokda.money.manager@gmail.com',
//     to: '123aggarwalvision@gmail.com',
//     subject: 'Subject of the email',
//     text: 'This is the plain text body of the email'
// };

// transporter.sendMail(mailOptions, function(error, info){
//     if (error) {
//     console.log(error);
//     } else {
//     console.log('Email sent: ' + info.response);
//     }
// });
  

const personSchema = new mongoose.Schema({
    fname : { type: String, required: true},
    lname : { type: String, required: true},
    city : { type: String, required: true},
    State : { type: String, required: true},
    zip : { type: String,  required: true },
    Balance : { type: Number, required: true , default : 0},
    email : { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    // password : { type: String, required: true},
}) 

// Virtual field to set password (unhashed)
personSchema.virtual('password')
    .set(function(value) {
        this._password = value;
        this.passwordHash = bcrypt.hashSync(value, 10);
    })
    .get(function () {
        return this._password;
    });

// Middleware to hash password before saving
personSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
      return next();
    }
  
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(this._password, salt);
  
    this.passwordHash = hash;
    next();
});
  
// Method to verify password
personSchema.methods.verifyPassword = async function(password) {
    return await bcrypt.compare(password, this.passwordHash);
}

const User = mongoose.model("User", personSchema);

const transactionSchema = new mongoose.Schema({
    email : {type : String},
    type : {type : String},
    amount : {type : Number},
    from : {type : String},
    to : {type : String},
}, {timestamps: true})

const Transaction = mongoose.model("Transaction",transactionSchema);


// Expenses

const ExpenseSchema = new mongoose.Schema({
    email : {type : String},
    Housing :{type : Number, default:0},
    Food :{type : Number,default:0},
    Transportation :{type : Number, default:0},
    Entertainment :{type : Number, default:0},
    Healthcare :{type : Number,default:0},
    Insurance :{type : Number,default:0},
    Invest : {type:Number,default:0}
})
const Expense=mongoose.model("Expense",ExpenseSchema)

// Expense.updateOne({email : loggedInUser.email}, {req.body.category: });



var loggedInUser;
var currentExpense;

var sumOfExpenses;

var investing;
var spending;
var saving;
var totalmoney;

//################################  ROUTES ###############################################
app.post("/signup", async(req, res)=>{
    console.log(req.body)
    // await User.insertMany({fname : req.body.fname, lname : req.body.lname, city:req.body.city,State :req.body.state, zip: req.body.zip , Balance: 0,email :req.body.email,password:req.body.password}).then((insertedData) => loggedInUser=insertedData);
    const user = new User({
        fname: req.body.fname,
        lname: req.body.lname,
        city: req.body.city,
        State: req.body.state,
        zip: req.body.zip,
        Balance: 0,
        email: req.body.email,
        password: req.body.password
    });

    const requiredFields = ['fname', 'city', 'state', 'zip', 'email', 'password'];
    for (let field of requiredFields) {
        if (!req.body[field]) {
            res.render('auth/signup', {error: 'Please fill out all required fields.'});
            return;
        }
    }
      
    await user.save();
    await Expense.insertMany({email:req.body.email}).then((expense)=>{
        currentExpense=expense;
    })

    const mailOptions = {
        from: 'rokda.money.manager@gmail.com',
        to: req.body.email,
        subject: 'New Account Sign Up',
        text: 'Congratulation! Your account have recently been signed up on our Website Rokda.'
    };
    
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
        console.log(error);
        } else {
        console.log('Email sent: ' + info.response);
        }
    });

    res.render('auth/login', {error:"Successfully signed up, login now"})
})

app.post("/login", async (req,res)=>{
    const query = User.findOne({ email: req.body.email });
    const query2 = Expense.findOne({email : req.body.email});
    // execute the query at a later time
    query.exec(async function (err, person) {
        if (err) {
            console.log("error1")
            return res.render('auth/login',{error : "Something Went Wrong!"})
        }
        if(!person){
            return res.render('auth/login', {error : "User not found"})
        }
        const isMatch = await person.verifyPassword(req.body.password);
        if(!isMatch){
            return res.render('auth/login', {error : "Password not matched"})
        }
        loggedInUser=person;
        query2.exec(function(err,amt){
            currentExpense=amt;
        })
         console.log(currentExpense)

        
        
        return res.redirect("/")
    });

})






app.post('/profile', async (req,res)=>{
    if(!loggedInUser){
        return res.redirect("/login")
    }
    const isMatch = await user.verifyPassword(req.body.password);
    if (!isMatch) {
        res.render('profile', {user:loggedInUser, message:"Password did not matched"})
        // console.log(req.body);
    }
    else{
        //updating the profile
        await User.updateOne({email : loggedInUser.email}, {$set: {fname : req.body.fname, lname : req.body.lname, city:req.body.city, State :req.body.state, zip: req.body.zip , Balance: loggedInUser.Balance,email: loggedInUser.email, password:loggedInUser.password}});
        const query = User.findOne({ email: loggedInUser.email });
        query.exec(function (err, person) {
            loggedInUser=person;
            res.render('profile', {user : loggedInUser, message:"Data successfully Updated"});
        });
    }
})


// app.post("/addMoney", async (req, res)=>{
//     if(!loggedInUser){
//         return res.redirect("/login")
//     }
//     loggedInUser.Balance = loggedInUser.Balance + Number(req.body.amount);
//     await User.updateOne({email : loggedInUser.email}, {Balance: loggedInUser.Balance});
//     await Transaction.insertMany({email : loggedInUser.email, to : (loggedInUser.fname + " " + loggedInUser.lname), type: "credited", from : req.body.name, amount : Number(req.body.amount)});
//     res.render('payments', {user: loggedInUser, message:"Amount of ₹" + req.body.amount + " is succesfully added in wallet!"})
// })

app.post("/bankTransfer", async (req, res)=>{
    if(!loggedInUser){
        return res.redirect("/login")
    }
    var Transactions = await Transaction.find({email : loggedInUser.email})

    if(loggedInUser.Balance<Number(req.body.amount)){
        return res.render('payments', {user: loggedInUser, message: "You do not have sufficient balance in your wallet!", Transactions: Transactions})
    }
    
    if(req.body.category == 'Housing'){
        currentExpense.Housing = currentExpense.Housing + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
       await Expense.updateOne({email : loggedInUser.email},{Housing: currentExpense.Housing})
    }
    if(req.body.category == 'Food'){
        currentExpense.Food = currentExpense.Food + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
        await Expense.updateOne({email : loggedInUser.email},{Food: currentExpense.Food})
    }
    if(req.body.category == 'Transportation'){
        currentExpense.Transportation = currentExpense.Transportation + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
       await Expense.updateOne({email : loggedInUser.email},{Transportation: currentExpense.Transportation})
    }
    if(req.body.category == 'Entertainment'){
        console.log("Yahaan Aa gaya hoon")
        currentExpense.Entertainment = currentExpense.Entertainment + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
        await Expense.updateOne({email : loggedInUser.email},{Entertainment: currentExpense.Entertainment})
    }
    if(req.body.category == 'Healthcare'){
        currentExpense.Healthcare = currentExpense.Healthcare + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
        await Expense.updateOne({email : loggedInUser.email},{Healthcare: currentExpense.Healthcare})
    }
    if(req.body.category == 'Invest'){
        currentExpense.Invest = currentExpense.Invest + Number(req.body.amount)
        investing = investing + Number(req.body.amount)
        await Expense.updateOne({email : loggedInUser.email},{Invest: currentExpense.Invest})
    }
    if(req.body.category == 'Insurance'){
        currentExpense.Insurance = currentExpense.Insurance + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
        await awaitExpense.updateOne({email : loggedInUser.email},{Invest: currentExpense.Insurance})
    }
    loggedInUser.Balance = loggedInUser.Balance - Number(req.body.amount);
    saving = loggedInUser.Balance
    await User.updateOne({email : loggedInUser.email}, {Balance: loggedInUser.Balance});
    await Transaction.insertMany({email : loggedInUser.email, to : req.body.name, type: "debited", from : (loggedInUser.fname+" "+loggedInUser.lname), amount : Number(req.body.amount)});
    Transactions = await Transaction.find({email : loggedInUser.email})
    res.render('payments', {user: loggedInUser, message:"Amount of ₹" + req.body.amount + " is succesfully transffered!", Transactions: Transactions})
})

app.post('/investment', async (req, res)=>{
    currentExpense.Invest = currentExpense.Invest + Number(req.body.amount)
    investing = investing + Number(req.body.amount)
    await Expense.updateOne({email : loggedInUser.email},{Invest: currentExpense.Invest})
})

app.post("/upiTransfer", async (req, res)=>{
    if(!loggedInUser){
        return res.redirect("/login")
    }
    var Transactions = await Transaction.find({email : loggedInUser.email})
    // console.log(req.body.category)
    // console.log(req.body.category=='Entertainment')
    // console.log(typeof(req.body.category))
    if(loggedInUser.Balance<Number(req.body.amount)){
        return res.render('payments', {user: loggedInUser, message: "You do not have sufficient balance in your wallet!", Transactions: Transactions})
    }
    if(req.body.category == 'Housing'){
        currentExpense.Housing = currentExpense.Housing + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
       await Expense.updateOne({email : loggedInUser.email},{Housing: currentExpense.Housing})
    }
    if(req.body.category == 'Food'){
        currentExpense.Food = currentExpense.Food + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
        await Expense.updateOne({email : loggedInUser.email},{Food: currentExpense.Food})
    }
    if(req.body.category == 'Transportation'){
        currentExpense.Transportation = currentExpense.Transportation + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
       await Expense.updateOne({email : loggedInUser.email},{Transportation: currentExpense.Transportation})
    }
    if(req.body.category == 'Entertainment'){
        console.log("Yahaan Aa gaya hoon")
        currentExpense.Entertainment = currentExpense.Entertainment + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
        await Expense.updateOne({email : loggedInUser.email},{Entertainment: currentExpense.Entertainment})
    }
    if(req.body.category == 'Healthcare'){
        currentExpense.Healthcare = currentExpense.Healthcare + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
        await Expense.updateOne({email : loggedInUser.email},{Healthcare: currentExpense.Healthcare})
    }
    if(req.body.category == 'Invest'){
        currentExpense.Invest = currentExpense.Invest + Number(req.body.amount)
        investing = investing + Number(req.body.amount)
        await Expense.updateOne({email : loggedInUser.email},{Invest: currentExpense.Invest})
    }
    if(req.body.category == 'Insurance'){
        currentExpense.Insurance = currentExpense.Insurance + Number(req.body.amount)
        spending = spending + Number(req.body.amount)
        await awaitExpense.updateOne({email : loggedInUser.email},{Invest: currentExpense.Insurance})
    }
    loggedInUser.Balance = loggedInUser.Balance - Number(Number(req.body.amount));
    saving = loggedInUser.Balance

    await User.updateOne({email : loggedInUser.email}, {Balance: loggedInUser.Balance});
    await Transaction.insertMany({email : loggedInUser.email, to : req.body.name, type: "debited", from : (loggedInUser.fname+" "+loggedInUser.lname), amount : Number(req.body.amount)});
    Transactions = await Transaction.find({email : loggedInUser.email})
    res.render('payments', {user: loggedInUser, message:"Amount of ₹" + req.body.amount + " is succesfully transffered!", Transactions: Transactions})
})

app.post("/addMoney", async (req, res)=>{
    if(!loggedInUser){
        return res.redirect("/login")
    }
    totalmoney = totalmoney + Number(req.body.amount);
    loggedInUser.Balance = loggedInUser.Balance + Number(req.body.amount);
    saving = loggedInUser.Balance
    await User.updateOne({email : loggedInUser.email}, {Balance: loggedInUser.Balance});
    await Transaction.insertMany({email : loggedInUser.email, to : (loggedInUser.fname + " " + loggedInUser.lname), type: "credited", from : req.body.name, amount : Number(req.body.amount)});
    const Transactions = await Transaction.find({email : loggedInUser.email})
    console.log(Transactions);
    res.render('payments', {user: loggedInUser, message:("Amount of ₹" + req.body.amount + " is succesfully added in wallet!"), Transactions : Transactions })
    // res.render('payments', {user: loggedInUser, message:, Transactions: Transactions})
})
app.get("/", (req, res)=>{
    if(!loggedInUser){
        return res.redirect("/login")
    }
    res.render('home',{user:loggedInUser, expenses: currentExpense });
})
app.get("/emi", (req, res)=>{
    res.render('emi')
})
app.get("/payments", async (req, res)=>{
    if(!loggedInUser){
        return res.redirect("/login")
    }
    const Transactions = await Transaction.find({email : loggedInUser.email})
    console.log(Transactions);
    res.render('payments', {user: loggedInUser, message:"", Transactions : Transactions })
})
app.get("/profile", (req, res)=>{
    if(!loggedInUser){
        return res.redirect("/login")
    }
    res.render('profile', {user: loggedInUser, message: ""})
})
app.get("/login", (req, res)=>{
    res.render('auth/login', {error:""})
})
app.get("/signup", (req, res)=>{
    res.render('auth/signup')
})
app.get("/logout", (req, res)=>{
    loggedInUser=null;
    res.render('auth/login', {error:"Successfully logged out"})
})



// app.post('/trial', (req, res)=>{
//     console.log(req.body.name=="amit")

//     res.redirect("emi")
// })


const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log(`App started at port ${PORT}`);
})