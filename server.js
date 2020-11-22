const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortId = require('shortid')

const cors = require('cors')

const mongoose = require('mongoose');
mongoose.connect(process.env.DB_URI || 'mongodb://localhost/exercise-track', { useMongoClient: true, useUnifiedTopology: true } );
const db = mongoose.connection;

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const Schema = mongoose.Schema;

const userSchema = new Schema ({
  _id: { type: String, required: true, default: shortId.generate },
  username: { type: String, required: true },
  exercises: [
    {
      description: String,
      duration: Number,
      date: String
    }
  ]
})

let userModel = mongoose.model('user', userSchema);

// Create new user
app.post('/api/exercise/new-user', (req, res) => {
  let newUser = new userModel({ username: req.body.username });
  newUser.save((err, data) => {
    if (err) return console.log(err);
    return res.send(data);
  });
})

app.post('/api/exercise/add', (req, res) => {
  let newDate;
  if (!req.body.date) {
    newDate = new Date().toDateString();
  } else {
    newDate = new Date(req.body.date).toDateString();
  }
  
  const newExercise = { description: req.body.description, duration: parseInt(req.body.duration), date: newDate };
  userModel.findById({ _id: req.body.userId }, (err, user) => {
    if (err) return console.log(err);
    user.exercises.push(newExercise);
    user.save();
    const result = {
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      _id: user.id,
      date: newDate
    }
    return res.send(result);
  });
});

app.get('/api/exercise/users', (req, res) => {
  userModel.find({}, (err, allUsers) => {
    if (err) return res.send(err)
    return res.send(allUsers);
  })
})

app.get('/api/exercise/log', (req, res) => {
  const fromDate = req.query.from;
  const toDate = req.query.to;
  const limit = req.query.limit;
  let exLog = []

  userModel.findById({ _id: req.query.userId}, (err, user) => {
    if (err) return console.log(err);
    user.exercises.forEach((i) => { exLog.push(i) });
    
    if (fromDate !== undefined && toDate !== undefined) {
      exLog = exLog.filter((item) => {
        return new Date(item.date) >= new Date(fromDate) && new Date(item.date) <= new Date(toDate);
      }); 
    }
    if (limit !== undefined) {
      exLog = exLog.slice(0, limit);
    }
    let result = { username: user.username, log: exLog, count: exLog.length }
    return res.send(result);
  })
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})



