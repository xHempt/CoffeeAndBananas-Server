const express = require('express')
const mongoose = require('mongoose')
const morgan = require('morgan')
require('dotenv').config()

const routes = require('./routes/api')

const app = express()
const PORT = process.env.PORT || 8080

const uri = process.env.DB

mongoose.connect(
    uri, 
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }, 
    console.log('Connected to the database!')
)
app.use(express.json())
app.use('/uploads', express.static('uploads'))
app.use(morgan('tiny'))
app.use('/api', routes)

app.listen(PORT, console.log(`Server is up and running! Listening at port ${PORT}!`))