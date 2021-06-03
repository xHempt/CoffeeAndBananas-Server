const router = require('express').Router()

const post = require('../models/post')
const user = require('../models/user')

const bcrypt = require('bcrypt')
const multer = require('multer')
const nodemailer = require('nodemailer')

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname)
    }
})

const upload = multer({ storage: storage })

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^&|#\s]/g, "\\$&")
}

router.get('/prevposts', async (req, res) => {
    try {
        await post.find({})
                .sort({ date: 'desc' })
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

    async function actualPost() {
        const date = new Date()
        const time = date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    
        const payload = {
            category: postInfo.category,
            date: time,
            headline: postInfo.headline,
            content: postInfo.content,
            background: `uploads/${req.file.originalname}`,
            likes: 1,
            comments: []
        }
        
        const newPost = new post(payload)
        
        try {
            await newPost.save()
        } catch(err) {
            console.log(err)
        }
    }

    async function sendMail() {
        await user.find({ news: true })
        .then((data) => {
            const users = data.splice('')
            users.forEach((user) => {
                let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.MAIL_FROM,
                        pass: process.env.MAIL_PASS
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                })
                    
                let mailOptions = {
                    from: 'coffeeandbananas.blog10@gmail.com',
                    to: user.email,
                    subject: 'NEW POST ON "COFFEE AND BANANAS" BLOG',
                    text: `Hi ${user.name}! David just posted a new post called "${postInfo.headline}" in "${postInfo.category}" category! Go check it out and thanks for signing up! ^^`
                }
            
                transporter.sendMail(mailOptions, (err, data) => {
                    if(err) {
                        console.log('There was an error while trying to send emails', err)
                    } else {
                        console.log('Email sent to ', user.email, '!')
                    }
                })
            })
        })
        .catch((err) => console.log(err))
    }

    if(postInfo.selectedDate === 'now') {
        console.log('Instant post')
        res.send('Post added!')
        actualPost()
        sendMail()
    } else {
        console.log('Planned post')
        res.send('Post planned!')
        setTimeout(() => {
            actualPost()
            sendMail()
        }, postInfo.timeoutValue)
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
        op: '0',
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

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MAIL_FROM,
            pass: process.env.MAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    })
        
    let mailOptions = {
        from: 'coffeeandbananas.blog10@gmail.com',
        to: req.body.email,
        subject: 'Registration Confirmation',
        html: `<h1>Welcome to the "Coffee and Bananas" Gang ${req.body.name}!</h1>`
    }

    transporter.sendMail(mailOptions, (err, data) => {
        if(err) {
            console.log('There was an error while trying to send emails', err)
        } else {
            console.log('Registration confirmation email sent to ', req.body.email, '!')
        }
    })
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

router.post('/addcomment', async (req, res) => {
    const date = new Date()
    const time = date.toLocaleDateString() + ' ' + date.toLocaleTimeString()

    await user.findOne({ _id: req.body.userID })
        .then((data) => {
            const newComment = {
                name: data.name,
                date: time,
                content: req.body.content
            }
            post.findOne({ _id: req.body.postID })
                .then((data) => {
                    data.comments.push(newComment)
                    data.save()
                    res.send('Comment added!')
                })
                .catch((err) => console.log(err))
        })
        .catch((err) => {
            console.log(err)
            res.json({ msg: 'login' })
        })
})

router.post('/getpost', async (req, res) => {
    await post.findOne({ _id: req.body.id })
        .then((data) => res.send(data))
        .catch((err) => console.log(err))
})

router.post('/getpostswithcat', async (req, res) => {
    if (req.body.category !== 'Top') {
        await post.find({ category: req.body.category })
            .then((data) => res.send(data))
            .catch((err) => console.log(err))
    } else {
        await post.find({})
            .sort({ likes: 'desc' })
            .then((data) => res.send(data))
            .catch((err) => console.log(err))
    }
})

module.exports = router
