const router = require('express').Router()
const post = require('../models/post')
const user = require('../models/user')
const bcrypt = require('bcrypt')

router.get('/prevposts', async (req, res) => {
    try {
        await post.find({}).sort({ date: -1 }).limit(5).then((data) => res.send(data)).catch((err) => console.log(err))
    } catch(err) {
        console.log(err)
    }
})

router.get('/post', async (req, res) => {
    const date = new Date()
    const time = date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    const data = {
        category: 'Time management',
        date: time,
        headline: 'Gówno',
        content: 'Lorem ipsum chuje muje'
    }
    
    const newPost = new post(data)
    try {
        await newPost.save()
        res.send('Post added!')
    } catch(err) {
        console.log(err)
    }
})

router.post('/register', async (req, res) => {
    const userExists = await user.findOne({ email: req.body.email })
    if(userExists) {
        res.json({ msg: 'Email already in use!' })
        console.log('Email already in use!')
        return 
    }

    const salt = await bcrypt.genSalt(10)
    const hashPass = await bcrypt.hash(req.body.pass, salt)

    const data = {
        name: req.body.name,
        email: req.body.email,
        pass: hashPass,
        news: req.body.news
    }

    const newUser = new user(data)
    try{
        await newUser.save()
        res.send('User registered')
    } catch(err) {
        console.error(err);
    }
})

router.post('/login', async (req, res) => {
    const validUser = await user.findOne({ email: req.body.email })
    if(!validUser) return res.json({ msg: 'Invalid email or password!' })

    const validPass = await bcrypt.compare(req.body.pass, validUser.pass)
    if(!validPass) return res.json({ msg: 'Invalid email or password!' })

    console.log(`User ${validUser.name}, ${validUser._id} logged in!`)
    res.json({ msg: 'Logged in!', id: validUser._id })
})

router.post('/who', async (req, res) => {
    await user.findOne({ _id: req.body.id })
    .then((data) => {
        res.json({ name: data.name })
    })
    .catch((err) => console.log(err))
})

module.exports = router
