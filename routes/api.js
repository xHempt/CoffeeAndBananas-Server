const router = require('express').Router()

const post = require('../models/post')
const user = require('../models/user')

const bcrypt = require('bcrypt')
const multer = require('multer')

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname)
    }
})

const upload = multer({ storage: storage })

router.get('/prevposts', async (req, res) => {
    try {
        await post.find({})
                .sort({ date: -1 })
                .limit(5)
                .then((data) => {
                    res.send(data)
                })
                .catch((err) => console.log(err))
    } catch(err) {
        console.log(err)
    }
})

router.post('/post', upload.single('file'), async (req, res) => {
    const postInfo = JSON.parse(req.body.data)

    const date = new Date()
    const time = date.toLocaleDateString() + ' ' + date.toLocaleTimeString()

    const payload = {
        category: postInfo.category,
        date: time,
        headline: postInfo.headline,
        content: postInfo.content,
        background: req.file.path,
        likes: 1
    }
    
    const newPost = new post(payload)
    
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
        op: '1',
        news: req.body.news,
        likedPosts: []
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

    console.log(`--- User ${validUser.name}, ${validUser._id} logged in! ---`)
    res.json({ msg: 'Logged in!', id: validUser._id })
})

router.post('/who', async (req, res) => {
    await user.findOne({ _id: req.body.id })
        .then((data) => {
            res.json({ name: data.name, perm: data.op, likes: data.likedPosts })
        })
        .catch((err) => console.log(err))
})

router.post('/like', async (req, res) => {
    await user.findOne({ _id: req.body.userId })
        .then(async (data) => {
            const likedPost = data.likedPosts.includes(req.body.postId)
            if(!likedPost) {
                data.likedPosts.push(req.body.postId)
                data.save()
                await post.findOne({ _id: req.body.postId })
                    .then((data) => {
                        data.likes = data.likes + 1
                        data.save()
                    })
                    .catch((err) => console.log(err))
                res.json({ msg: 'Post liked!' })
            } else {
                const postIndex = data.likedPosts.indexOf(req.body.postId)
                if(postIndex > -1) {
                    data.likedPosts.splice(postIndex, 1)
                }
                data.save()
                await post.findOne({ _id: req.body.postId })
                    .then((data) => {
                        data.likes = data.likes - 1
                        data.save()
                    })
                    .catch((err) => console.log(err))
                res.json({ msg: 'Post disliked!' })
            }
        })
        .catch((err) => {
            console.log(err)
            res.json({ msg: 'login' })
            return
        })

})

module.exports = router
