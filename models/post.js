const mongoose = require('mongoose')

const { Schema } = mongoose

const postSchema = new Schema({
    category: String,
    date: String,
    headline: String,
    content: String,
    background: String,
    likes: Number
})

const post = mongoose.model('post', postSchema)

module.exports = post