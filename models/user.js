const mongoose = require('mongoose')

const { Schema } = mongoose

const userSchema = new Schema({
    name: String,
    email: String,
    pass: String,
    op: String,
    news: String,
    likedPosts: [String]
})

const user = mongoose.model('user', userSchema)

module.exports = user